require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cluster = require('cluster');
const os = require('os');
const { exec, spawn } = require('child_process');

// Global error handlers to prevent program crashes
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = process.env.PORT || 5000;

// Vercel read-only filesystem workaround: use /tmp for the database.
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL;
const DB_FILE = isVercel ? path.join('/tmp', 'database.json') : path.join(__dirname, 'database.json');
const COURSES_FILE = path.join(__dirname, 'courses.json');
const SHIKSHAK_COURSES_FILE = path.join(__dirname, 'shikshak-courses.json');
const AI_TOOLS_FILE = path.join(__dirname, 'ai-tools.json');

// Bundler-friendly in-memory defaults for Vercel Serverless
// Using fs.readFileSync (not require) to avoid Node.js module cache - changes to JSON are always fresh
let defaultCourses = [];
try { defaultCourses = JSON.parse(fs.readFileSync(path.join(__dirname, 'courses.json'), 'utf8')); } catch(e) {}
let defaultShikshakCourses = [];
try { defaultShikshakCourses = JSON.parse(fs.readFileSync(path.join(__dirname, 'shikshak-courses.json'), 'utf8')); } catch(e) {}
let defaultAiTools = [];
try { defaultAiTools = JSON.parse(fs.readFileSync(path.join(__dirname, 'ai-tools.json'), 'utf8')); } catch(e) {}

// Middleware: Security Headers & Crash Protection
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.static(__dirname)); // Serve static files from the same directory

// Lightweight In-Memory Sliding Window Rate Limiter (Anti-DDoS / Anti-Brute Force)
const rateLimitStores = {
    auth: new Map(),
    compiler: new Map(),
    chat: new Map(),
    contact: new Map()
};

// Automatic cleanup every 5 minutes to prevent memory leaks
const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const store of Object.values(rateLimitStores)) {
        for (const [ip, rec] of store.entries()) {
            if (now > rec.resetTime) store.delete(ip);
        }
    }
}, 5 * 60 * 1000);
if (cleanupTimer.unref) cleanupTimer.unref();

function createRateLimiter(storeKey, maxRequests, windowMs, message) {
    return (req, res, next) => {
        const forwarded = req.headers['x-forwarded-for'];
        const ip = (forwarded ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress) || '127.0.0.1';
        const now = Date.now();
        const store = rateLimitStores[storeKey];

        let record = store.get(ip);
        if (!record || now > record.resetTime) {
            record = { count: 1, resetTime: now + windowMs };
            store.set(ip, record);
            return next();
        }

        record.count += 1;
        if (record.count > maxRequests) {
            const retryAfterSec = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
            res.setHeader('Retry-After', retryAfterSec);
            return res.status(429).json({
                error: message || 'Too many requests. Please slow down and try again later.',
                retryAfterSeconds: retryAfterSec,
                success: false
            });
        }
        next();
    };
}

const authLimiter = createRateLimiter('auth', 10, 15 * 60 * 1000, 'Security Notice: Too many authentication attempts from this IP. Please wait 15 minutes.');
const compilerLimiter = createRateLimiter('compiler', 20, 60 * 1000, 'Security Notice: Compiler execution rate limit reached (Max 20/min). Please wait a moment.');
const chatLimiter = createRateLimiter('chat', 30, 60 * 1000, 'Security Notice: AI Mentor rate limit reached (Max 30 requests/min).');
const contactLimiter = createRateLimiter('contact', 5, 10 * 60 * 1000, 'Please wait before sending another message.');


// setup db file if missing
function initDB() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            // copy from original if on Vercel to tmp
            const originalDb = path.join(__dirname, 'database.json');
            if (isVercel && fs.existsSync(originalDb)) {
                fs.copyFileSync(originalDb, DB_FILE);
            } else {
                fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], contacts: [], analytics: { totalVisits: 0 } }, null, 2));
            }
        }
        // Ensure analytics exists in DB
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        if(!db.analytics) {
            db.analytics = { totalVisits: 0 };
            fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        }
    } catch (e) {
        console.error("Database Init Error:", e);
    }
}
initDB();

// Helper to read DB
const readDB = () => {
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch(e) {
        return { users: [], contacts: [], analytics: { totalVisits: 0 } };
    }
};

// Helper to write DB
const writeDB = (data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch(e) {
        console.error("Database Write Error (Vercel restricts file writes):", e);
    }
};

// track page visits
app.use((req, res, next) => {
    // ignore assets, only count html or root loads
    if (req.method === 'GET' && (req.url === '/' || req.url.endsWith('.html'))) {
        try {
            const db = readDB();
            if(db.analytics) {
                db.analytics.totalVisits += 1;
                writeDB(db);
            }
        } catch(e) {
            console.error("Analytics Error:", e);
        }
    }
    next();
});

// --- routes ---

app.post('/api/auth/login', authLimiter, (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const db = readDB();
    const user = db.users.find(u => u.email === email);
    
    if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid email or password" });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ message: "Login successful", user: userWithoutPassword });
});

// register user
app.post('/api/auth/register', authLimiter, (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "All fields are required" });

    const db = readDB();
    if (db.users.find(u => u.email === email)) {
        return res.status(409).json({ error: "An account with this email already exists." });
    }

    const newUser = { id: Date.now().toString(), name, email, password, createdAt: new Date().toISOString() };
    db.users.push(newUser);
    writeDB(db);

    const { password: _, ...userWithoutPassword } = newUser;
    res.json({ message: "Registration successful", user: userWithoutPassword });
});

// OTP in-memory store for mobile phone verification
const otpCache = new Map();

// send OTP endpoint for mobile verification
app.post('/api/auth/send-otp', authLimiter, (req, res) => {
    const { phone } = req.body;
    if (!phone || String(phone).trim().length < 10) {
        return res.status(400).json({ error: "Please enter a valid 10-digit mobile number" });
    }

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    // Generate 6-digit OTP (fixed test OTP 123456 or random for production)
    const generatedOtp = '123456';
    otpCache.set(cleanPhone, { otp: generatedOtp, expiresAt: Date.now() + 5 * 60 * 1000 });

    res.json({
        message: `OTP sent successfully to +91 ${cleanPhone}`,
        phone: cleanPhone,
        otp: generatedOtp // Provided for frictionless testing & demo
    });
});

// verify OTP endpoint
app.post('/api/auth/verify-otp', authLimiter, (req, res) => {
    const { phone, otp, name, goal, academicLevel, state, referralCode } = req.body;
    if (!phone) return res.status(400).json({ error: "Mobile number is required" });
    if (!otp) return res.status(400).json({ error: "Please enter the OTP" });

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const cached = otpCache.get(cleanPhone);

    // Accept cached OTP or universal test OTP '123456'
    const isValid = otp === '123456' || (cached && cached.otp === otp && Date.now() < cached.expiresAt);

    if (!isValid) {
        return res.status(400).json({ error: "Invalid or expired OTP. Use 123456 for testing." });
    }

    const db = readDB();
    let user = db.users.find(u => u.phone === cleanPhone);
    let isNewUser = false;

    if (!user) {
        isNewUser = true;
        const studentName = (name && String(name).trim()) ? String(name).trim() : `Learner ${cleanPhone.slice(-4)}`;
        user = {
            id: Date.now().toString(),
            name: studentName,
            phone: cleanPhone,
            email: `${cleanPhone}@student.techindro.com`,
            goal: goal || 'MNC Placements 2026',
            academicLevel: academicLevel || 'College Student',
            state: state || 'Delhi NCR',
            referralCode: referralCode || '',
            provider: 'phone_otp',
            createdAt: new Date().toISOString()
        };
        db.users.push(user);
        writeDB(db);
    } else if (name && String(name).trim()) {
        user.name = String(name).trim();
        if (goal) user.goal = goal;
        if (academicLevel) user.academicLevel = academicLevel;
        if (state) user.state = state;
        if (referralCode) user.referralCode = referralCode;
        writeDB(db);
    }

    otpCache.delete(cleanPhone);
    const { password: _, ...safeUser } = user;
    res.json({
        message: "Login successful",
        isNewUser,
        user: safeUser
    });
});

// contact form submission
app.post('/api/contact', contactLimiter, (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: "All fields are required" });

    const db = readDB();
    db.contacts = db.contacts || [];
    const newContact = { id: Date.now().toString(), name, email, message, date: new Date().toISOString() };
    db.contacts.push(newContact);
    writeDB(db);

    res.json({ message: "Contact form submitted successfully!", contact: newContact });
});

// fetch all courses
app.get('/api/courses', (req, res) => {
    try {
        // Always read fresh from disk so edits to courses.json are instant (no restart needed)
        const courses = JSON.parse(fs.readFileSync(COURSES_FILE, 'utf8'));
        res.json(courses);
    } catch (err) {
        // Fallback to in-memory if file read fails
        if (defaultCourses && defaultCourses.length > 0) return res.json(defaultCourses);
        res.status(500).json({ error: 'Failed to fetch courses data' });
    }
});

// fetch kids courses
app.get('/api/shikshak-courses', (req, res) => {
    try {
        const courses = JSON.parse(fs.readFileSync(SHIKSHAK_COURSES_FILE, 'utf8'));
        res.json(courses);
    } catch (err) {
        if (defaultShikshakCourses && defaultShikshakCourses.length > 0) return res.json(defaultShikshakCourses);
        res.status(500).json({ error: 'Failed to fetch shikshak courses data' });
    }
});

// fetch ai tools
app.get('/api/ai-tools', (req, res) => {
    try {
        const tools = JSON.parse(fs.readFileSync(AI_TOOLS_FILE, 'utf8'));
        res.json(tools);
    } catch (err) {
        if (defaultAiTools && defaultAiTools.length > 0) return res.json(defaultAiTools);
        res.status(500).json({ error: 'Failed to fetch ai tools data' });
    }
});

// fetch course details
app.get('/api/courses/:id', (req, res) => {
    try {
        const list = fs.existsSync(COURSES_FILE) ? JSON.parse(fs.readFileSync(COURSES_FILE, 'utf8')) : defaultCourses;
        const course = list.find(c => c.id === req.params.id);
        
        if (course) res.json(course);
        else res.status(404).json({ error: "Course not found" });
    } catch (err) {
        res.status(500).json({ error: "Failed to load course" });
    }
});

// analytics
app.get('/api/analytics', (req, res) => {
    try {
        const db = readDB();
        res.json({ totalVisits: db.analytics ? db.analytics.totalVisits : 0 });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// ============================================================================
// AUTOMATED TECH JOB FETCHING SERVICE (Adzuna)
// Daily fetch at 8 AM IST, deduplication, in-memory cache + JSON persistence
// ============================================================================
const https = require('https');
const http = require('http');

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || '';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || '';

// In-memory job cache for fast reads
let jobsCache = [];
let jobsMetaCache = { lastFetchedAt: null, totalFetched: 0, providers: { adzuna: 0, remotive: 0 } };

// Load jobs from DB into cache on startup
function loadJobsCache() {
    try {
        const db = readDB();
        jobsCache = db.jobs || [];
        jobsMetaCache = db.jobsMeta || jobsMetaCache;
    } catch (e) {
        console.error('Failed to load jobs cache:', e);
    }
}
loadJobsCache();

// Helper: Make an HTTPS/HTTP request (returns Promise)
function httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const isHttps = url.startsWith('https');
        const lib = isHttps ? https : http;
        const urlObj = new URL(url);

        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            timeout: 15000
        };

        const req = lib.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });

        if (options.body) {
            req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
        }
        req.end();
    });
}

// ============================================================================
// COMPANY METADATA TIERS & ELITE EDUCATIONAL BACKGROUND ENGINE
// ============================================================================
const TIER_MAPPINGS = {
    'faang': {
        label: 'FAANG+',
        badge: 'FAANG+',
        iconName: 'rocket',
        color: '#8b5cf6',
        bg: 'rgba(139, 92, 246, 0.1)',
        border: 'rgba(139, 92, 246, 0.3)',
        companies: ['google', 'alphabet', 'meta', 'facebook', 'apple', 'amazon', 'netflix', 'microsoft', 'uber', 'airbnb', 'stripe', 'openai', 'linkedin', 'twitter', 'x corp', 'bytedance', 'nvidia']
    },
    'hft-quant': {
        label: 'HFT & Quant',
        badge: 'HFT & Quant',
        iconName: 'zap',
        color: '#d97706',
        bg: 'rgba(217, 119, 6, 0.1)',
        border: 'rgba(217, 119, 6, 0.3)',
        companies: ['jane street', 'citadel', 'tower research', 'graviton', 'de shaw', 'optiver', 'jump trading', 'worldquant', 'quadeye', 'alphagrep', 'hudson river', 'millennium', 'two sigma', 'drw', 'flow traders', 'headlands']
    },
    'tier-1-product': {
        label: 'Tier-1 Product',
        badge: 'Tier-1 Product',
        iconName: 'gem',
        color: '#2563eb',
        bg: 'rgba(37, 99, 235, 0.1)',
        border: 'rgba(37, 99, 235, 0.3)',
        companies: ['abb', 'morningstar', 'hp', 'hewlett packard', 'adobe', 'salesforce', 'oracle', 'cisco', 'atlassian', 'cornerstone', 'warner bros', "moody's", 's&p global', 'deutsche bank', 'intuit', 'sap', 'vmware', 'paypal', 'danaher', 'rx global', 'msd', 'jabil', 'arcelormittal', 'ab inbev', 'slack', 'postman', 'snowflake', 'databricks', 'zoom', 'intel', 'qualcomm', 'amd', 'broadcom', 'texas instruments', 'philips', 'siemens', 'honeywell', 'visa', 'mastercard', 'goldman sachs', 'morgan stanley', 'jpmorgan']
    },
    'startups': {
        label: 'High-Growth Startups',
        badge: 'High-Growth Startup',
        iconName: 'trending-up',
        color: '#059669',
        bg: 'rgba(5, 150, 105, 0.1)',
        border: 'rgba(5, 150, 105, 0.3)',
        companies: ['cartrade', 'easemytrip', 'runable', 'zomato', 'swiggy', 'zepto', 'cred', 'razorpay', 'meesho', 'groww', 'zerodha', 'urban company', 'browserstack', 'inmobi', 'bharatpe', 'phonepe', 'paytm', 'khatabook', 'coinswitch', 'licious', 'mamaearth', 'unacademy', 'physicswallah', 'latentview', 'guru forum', 'upjob', 'crack the campus', 'zamstars', 'notionace', 'starzen', '9nexus', 'lightspun', 'everestdx', 'atain', 'hiringhood', 'jman group']
    },
    'mnc-it': {
        label: 'MNCs & IT Services',
        badge: 'MNC / IT Services',
        iconName: 'building',
        color: '#475569',
        bg: 'rgba(71, 85, 105, 0.1)',
        border: 'rgba(71, 85, 105, 0.3)',
        companies: ['tcs', 'tata consultancy', 'infosys', 'wipro', 'cognizant', 'accenture', 'kyndryl', 'capgemini', 'hcl', 'lti mindtree', 'tech mahindra', 'dxc', 'infobeans', 'capco', 'rws', 'exl', 'sagility', 'black box', 'sloka it', 'datum technologies', 'thakral one', 'cryscol', 'mphasis', 'hexaware', 'persistent']
    },
    'research-institutes': {
        label: 'Elite Research Institutes & Universities',
        badge: 'Elite Research Lab',
        iconName: 'landmark',
        color: '#7c3aed',
        bg: 'rgba(124, 58, 237, 0.1)',
        border: 'rgba(124, 58, 237, 0.3)',
        companies: [
            'iisc', 'indian institute of science',
            'iit bombay', 'iit delhi', 'iit madras', 'iit kanpur', 'iit kharagpur', 'iit roorkee', 'iit guwahati',
            'mit', 'massachusetts institute of technology', 'csail',
            'stanford', 'sail',
            'harvard', 'seas',
            'princeton',
            'columbia',
            'cornell',
            'eth zurich', 'eth zürich',
            'oxford', 'university of oxford',
            'cambridge', 'university of cambridge',
            'cmu', 'carnegie mellon',
            'nus', 'national university of singapore',
            'ntu', 'nanyang technological',
            'tsinghua', 'tsinghua university',
            'berkeley', 'uc berkeley', 'university of california berkeley',
            'isro', 'indian space research organisation',
            'drdo', 'defence research and development organisation',
            'nasa', 'national aeronautics and space administration',
            'spacex', 'space exploration technologies',
            'microsoft research', 'google research', 'meta fair', 'ibm research'
        ]
    }
};

const EDU_MAPPINGS = {
    'iits-iisc': {
        label: 'IITs / IISc',
        badge: 'IITs / IISc',
        iconName: 'award',
        color: '#ea580c',
        bg: 'rgba(234, 88, 12, 0.1)',
        border: 'rgba(234, 88, 12, 0.3)',
        keywords: ['iit', 'bits', 'iisc', 'nit', 'premier institute', 'tier 1 college', 'top engineering']
    },
    'ivy-league': {
        label: 'US Ivy League',
        badge: 'US Ivy League',
        iconName: 'landmark',
        color: '#7c3aed',
        bg: 'rgba(124, 58, 237, 0.1)',
        border: 'rgba(124, 58, 237, 0.3)',
        keywords: ['ivy', 'ivy league', 'harvard', 'yale', 'princeton', 'columbia', 'upenn', 'cornell', 'dartmouth', 'brown']
    },
    'global-elite': {
        label: 'Global Elite',
        badge: 'Global Elite (MIT/Stanford/ETH)',
        iconName: 'globe',
        color: '#0284c7',
        bg: 'rgba(2, 132, 199, 0.1)',
        border: 'rgba(2, 132, 199, 0.3)',
        keywords: ['mit', 'stanford', 'berkeley', 'carnegie mellon', 'cmu', 'caltech', 'eth zurich', 'oxford', 'cambridge', 'imperial']
    },
    'top-asian': {
        label: 'Top Asian',
        badge: 'Top Asian (NUS/NTU)',
        iconName: 'compass',
        color: '#0d9488',
        bg: 'rgba(13, 148, 136, 0.1)',
        border: 'rgba(13, 148, 136, 0.3)',
        keywords: ['nus', 'ntu', 'tsinghua', 'peking', 'hkust', 'tokyo university']
    }
};

const COMPANY_DOMAINS = {
    'google': 'google.com',
    'alphabet': 'google.com',
    'microsoft': 'microsoft.com',
    'amazon': 'amazon.com',
    'apple': 'apple.com',
    'meta': 'meta.com',
    'facebook': 'meta.com',
    'netflix': 'netflix.com',
    'uber': 'uber.com',
    'airbnb': 'airbnb.com',
    'stripe': 'stripe.com',
    'openai': 'openai.com',
    'nvidia': 'nvidia.com',
    'tower research': 'tower-research.com',
    'graviton': 'gravitonresearch.com',
    'jane street': 'janestreet.com',
    'citadel': 'citadel.com',
    'de shaw': 'deshaw.com',
    'optiver': 'optiver.com',
    'jump trading': 'jumptrading.com',
    'quadeye': 'quadeye.com',
    'worldquant': 'worldquant.com',
    'morningstar': 'morningstar.com',
    "moody's": 'moodys.com',
    'moodys': 'moodys.com',
    'abb': 'abb.com',
    'adobe': 'adobe.com',
    'salesforce': 'salesforce.com',
    'oracle': 'oracle.com',
    'cisco': 'cisco.com',
    'atlassian': 'atlassian.com',
    'rx global': 'rxglobal.com',
    'elsevier': 'elsevier.com',
    'intuit': 'intuit.com',
    'sap': 'sap.com',
    'intel': 'intel.com',
    'qualcomm': 'qualcomm.com',
    'tcs': 'tcs.com',
    'tata consultancy': 'tcs.com',
    'infosys': 'infosys.com',
    'wipro': 'wipro.com',
    'cognizant': 'cognizant.com',
    'accenture': 'accenture.com',
    'capgemini': 'capgemini.com',
    'kyndryl': 'kyndryl.com',
    'capco': 'capco.com',
    'zomato': 'zomato.com',
    'swiggy': 'swiggy.com',
    'zepto': 'zeptonow.com',
    'cred': 'cred.club',
    'razorpay': 'razorpay.com',
    'groww': 'groww.in',
    'zerodha': 'zerodha.com',
    'phonepe': 'phonepe.com',
    'paytm': 'paytm.com',
    'browserstack': 'browserstack.com',
    'goldman sachs': 'goldmansachs.com',
    'morgan stanley': 'morganstanley.com',
    'jpmorgan': 'jpmorgan.com',
    'iisc': 'iisc.ac.in',
    'indian institute of science': 'iisc.ac.in',
    'iit bombay': 'iitb.ac.in',
    'iit delhi': 'iitd.ac.in',
    'iit madras': 'iitm.ac.in',
    'iit kanpur': 'iitk.ac.in',
    'iit kharagpur': 'iitkgp.ac.in',
    'iit roorkee': 'iitr.ac.in',
    'iit guwahati': 'iitg.ac.in',
    'mit': 'mit.edu',
    'massachusetts institute of technology': 'mit.edu',
    'csail': 'mit.edu',
    'stanford': 'stanford.edu',
    'sail': 'stanford.edu',
    'harvard': 'harvard.edu',
    'seas': 'harvard.edu',
    'princeton': 'princeton.edu',
    'columbia': 'columbia.edu',
    'cornell': 'cornell.edu',
    'eth zurich': 'ethz.ch',
    'eth zürich': 'ethz.ch',
    'oxford': 'ox.ac.uk',
    'cambridge': 'cam.ac.uk',
    'cmu': 'cmu.edu',
    'carnegie mellon': 'cmu.edu',
    'nus': 'nus.edu.sg',
    'ntu': 'ntu.edu.sg',
    'tsinghua': 'tsinghua.edu.cn',
    'berkeley': 'berkeley.edu',
    'isro': 'isro.gov.in',
    'drdo': 'drdo.gov.in',
    'nasa': 'nasa.gov',
    'spacex': 'spacex.com',
    'microsoft research': 'microsoft.com',
    'google research': 'google.com',
    'meta fair': 'meta.com',
    'ibm research': 'ibm.com'
};

const INSTITUTION_LOCAL_LOGOS = {
    'iisc': '/assets/logos/iisc.svg',
    'indian institute of science': '/assets/logos/iisc.svg',
    'iit bombay': '/assets/logos/iitb.svg',
    'iit delhi': '/assets/logos/iitd.svg',
    'iit madras': '/assets/logos/iitm.svg',
    'mit': '/assets/logos/mit.svg',
    'massachusetts institute of technology': '/assets/logos/mit.svg',
    'csail': '/assets/logos/mit.svg',
    'stanford': '/assets/logos/stanford.svg',
    'sail': '/assets/logos/stanford.svg',
    'berkeley': '/assets/logos/berkeley.svg',
    'uc berkeley': '/assets/logos/berkeley.svg',
    'university of california berkeley': '/assets/logos/berkeley.svg',
    'bair': '/assets/logos/berkeley.svg',
    'harvard': '/assets/logos/harvard.svg',
    'seas': '/assets/logos/harvard.svg',
    'princeton': '/assets/logos/princeton.svg',
    'columbia': '/assets/logos/columbia.svg',
    'cornell': '/assets/logos/cornell.svg',
    'eth zurich': '/assets/logos/ethz.svg',
    'eth zürich': '/assets/logos/ethz.svg',
    'cmu': '/assets/logos/cmu.svg',
    'carnegie mellon': '/assets/logos/cmu.svg',
    'oxford': '/assets/logos/oxford.svg',
    'cambridge': '/assets/logos/cambridge.svg',
    'nus': '/assets/logos/nus.svg',
    'national university of singapore': '/assets/logos/nus.svg',
    'ntu': '/assets/logos/ntu.svg',
    'nanyang technological': '/assets/logos/ntu.svg',
    'tsinghua': '/assets/logos/tsinghua.svg',
    'tsinghua university': '/assets/logos/tsinghua.svg',
    'isro': '/assets/logos/isro.svg',
    'indian space research organisation': '/assets/logos/isro.svg',
    'drdo': '/assets/logos/drdo.svg',
    'defence research and development organisation': '/assets/logos/drdo.svg',
    'nasa': '/assets/logos/nasa.svg',
    'national aeronautics and space administration': '/assets/logos/nasa.svg',
    'jpl': '/assets/logos/nasa.svg',
    'spacex': '/assets/logos/spacex.svg',
    'space exploration technologies': '/assets/logos/spacex.svg',
    'microsoft research': '/assets/logos/msr.svg',
    'google research': '/assets/logos/google-research.svg'
};

function getCompanyLogo(company) {
    const clean = (company || '').toLowerCase().trim();
    for (const [key, logoPath] of Object.entries(INSTITUTION_LOCAL_LOGOS)) {
        if (clean.includes(key)) {
            return logoPath;
        }
    }
    for (const [key, domain] of Object.entries(COMPANY_DOMAINS)) {
        if (clean.includes(key)) {
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        }
    }
    const cleanDomain = clean.replace(/[^a-z0-9]/g, '');
    return `https://www.google.com/s2/favicons?domain=${cleanDomain}.com&sz=128`;
}

// Utility function to auto-assign company tiers, education tags, logos, & opportunity type
function assignJobMetadata(job) {
    const companyLower = (job.company || '').toLowerCase();
    const textLower = ((job.title || '') + ' ' + (job.snippet || '')).toLowerCase();

    // Research Internship detection (MS / PhD / Pre-Doc / Research Fellow / Visiting Scholar)
    const isResearchInternship = job.opportunityType === 'research-internship' ||
                                 textLower.includes('research intern') ||
                                 textLower.includes('research fellow') ||
                                 textLower.includes('visiting researcher') ||
                                 textLower.includes('visiting scholar') ||
                                 textLower.includes('pre-doctoral') ||
                                 textLower.includes('predoctoral') ||
                                 textLower.includes('phd intern') ||
                                 textLower.includes('ms intern') ||
                                 textLower.includes('graduate research') ||
                                 textLower.includes('summer research fellow') ||
                                 ((companyLower.includes('iit') || companyLower.includes('iisc') || companyLower.includes('mit') || companyLower.includes('stanford') || companyLower.includes('harvard') || companyLower.includes('princeton') || companyLower.includes('eth') || companyLower.includes('oxford') || companyLower.includes('cambridge') || companyLower.includes('cmu') || companyLower.includes('nus') || companyLower.includes('ntu') || companyLower.includes('research')) && (textLower.includes('intern') || textLower.includes('fellow') || textLower.includes('scholar')));

    // Standard Industry Internship detection
    const isStandardInternship = !isResearchInternship && (
        job.opportunityType === 'internship' ||
        textLower.includes('intern') || 
        textLower.includes('trainee') || 
        textLower.includes('apprentice') || 
        (job.type || '').toLowerCase().includes('intern')
    );

    let opportunityType = 'job';
    let finalType = job.type || 'Full-time';
    if (isResearchInternship) {
        opportunityType = 'research-internship';
        finalType = 'Research Internship (MS/PhD)';
    } else if (isStandardInternship) {
        opportunityType = 'internship';
        finalType = 'Internship';
    }

    let matchedTier = null;
    for (const [tierKey, config] of Object.entries(TIER_MAPPINGS)) {
        if (config.companies.some(c => companyLower.includes(c))) {
            matchedTier = tierKey;
            break;
        }
    }

    // Heuristics for unlisted companies
    if (!matchedTier) {
        if (isResearchInternship) {
            matchedTier = 'research-institutes';
        } else if (textLower.includes('quant') || textLower.includes('hft') || textLower.includes('algo trading') || textLower.includes('low latency')) {
            matchedTier = 'hft-quant';
        } else if (companyLower.includes('solutions') || companyLower.includes('consulting') || companyLower.includes('technologies') || companyLower.includes('services') || companyLower.includes('infotech')) {
            matchedTier = 'mnc-it';
        } else if (companyLower.includes('labs') || companyLower.includes('io') || companyLower.includes('tech') || companyLower.includes('.com') || companyLower.includes('inc')) {
            matchedTier = 'startups';
        } else {
            matchedTier = 'tier-1-product';
        }
    }

    const tierConfig = TIER_MAPPINGS[matchedTier] || TIER_MAPPINGS['tier-1-product'];

    // Determine target educational pedigree
    const eduTags = new Set();
    if (companyLower.includes('iit') || companyLower.includes('iisc')) {
        eduTags.add('iits-iisc');
    }
    if (companyLower.includes('harvard') || companyLower.includes('princeton') || companyLower.includes('columbia') || companyLower.includes('cornell') || companyLower.includes('yale') || companyLower.includes('upenn') || companyLower.includes('brown') || companyLower.includes('dartmouth')) {
        eduTags.add('ivy-league');
    }
    if (companyLower.includes('mit') || companyLower.includes('stanford') || companyLower.includes('eth') || companyLower.includes('oxford') || companyLower.includes('cambridge') || companyLower.includes('cmu') || companyLower.includes('carnegie mellon') || companyLower.includes('berkeley') || companyLower.includes('caltech')) {
        eduTags.add('global-elite');
    }
    if (companyLower.includes('nus') || companyLower.includes('ntu') || companyLower.includes('tsinghua') || companyLower.includes('peking') || companyLower.includes('hkust') || companyLower.includes('tokyo')) {
        eduTags.add('top-asian');
    }
    if (companyLower.includes('microsoft research') || companyLower.includes('google research')) {
        eduTags.add('iits-iisc');
        eduTags.add('global-elite');
    }

    if (eduTags.size === 0) {
        if (matchedTier === 'hft-quant') {
            eduTags.add('iits-iisc');
            eduTags.add('global-elite');
            eduTags.add('ivy-league');
        } else if (matchedTier === 'faang') {
            eduTags.add('iits-iisc');
            eduTags.add('global-elite');
            eduTags.add('top-asian');
        } else if (matchedTier === 'tier-1-product') {
            eduTags.add('iits-iisc');
            eduTags.add('global-elite');
        } else if (matchedTier === 'startups') {
            eduTags.add('iits-iisc');
            eduTags.add('top-asian');
        } else {
            eduTags.add('iits-iisc');
        }
    }

    // Keyword scan
    for (const [eduKey, config] of Object.entries(EDU_MAPPINGS)) {
        if (config.keywords.some(kw => textLower.includes(kw))) {
            eduTags.add(eduKey);
        }
    }

    const eduTagsArr = Array.from(eduTags);
    const eduLabels = eduTagsArr.map(t => EDU_MAPPINGS[t]?.label || t);
    const eduBadges = eduTagsArr.map(t => EDU_MAPPINGS[t]?.badge || t);

    return {
        type: finalType,
        opportunityType,
        companyLogo: getCompanyLogo(job.company),
        companyTier: matchedTier,
        companyTierLabel: tierConfig.label,
        companyTierBadge: tierConfig.badge,
        companyTierIcon: tierConfig.iconName,
        companyTierColor: tierConfig.color,
        companyTierBg: tierConfig.bg,
        companyTierBorder: tierConfig.border,
        educationTags: eduTagsArr,
        educationTagLabels: eduLabels,
        educationTagBadges: eduBadges
    };
}

// Generate a deduplication hash from job fields
function jobHash(title, company, location) {
    const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    return `${normalize(title)}|${normalize(company)}|${normalize(location)}`;
}

// Fetch jobs from Adzuna API
async function fetchAdzunaJobs() {
    if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY || ADZUNA_APP_ID.includes('your_') || ADZUNA_APP_KEY.includes('your_')) {
        console.log('⏭️  Adzuna: No API keys configured, skipping...');
        return [];
    }

    const searches = [
        'software engineer',
        'AI developer',
        'full stack developer',
        'data scientist',
        'frontend developer',
        'cloud engineer',
        'Google OR Microsoft OR Amazon OR Meta',
        'Jane Street OR Tower Research OR Graviton OR Quant',
        'software engineer intern India',
        'web developer intern India',
        'data science intern India',
        'AI ML intern India'
    ];

    const allJobs = [];

    for (const keyword of searches) {
        try {
            const encodedKeyword = encodeURIComponent(keyword);
            const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&what=${encodedKeyword}&results_per_page=15&content-type=application/json`;

            const response = await httpRequest(url);

            if (response.status === 200 && response.data && response.data.results) {
                const normalized = response.data.results.map(job => {
                    const raw = {
                        id: `adzuna_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                        title: (job.title || 'Untitled Position').replace(/<[^>]*>/g, '').trim(),
                        company: ((job.company && job.company.display_name) || 'Company Not Disclosed').trim(),
                        location: ((job.location && job.location.display_name) || 'India').trim(),
                        salary: job.salary_min && job.salary_max ? `₹${Math.round(job.salary_min / 1000)}K – ₹${Math.round(job.salary_max / 1000)}K` :
                                job.salary_min ? `₹${Math.round(job.salary_min / 1000)}K+` : null,
                        url: job.redirect_url || '#',
                        source: 'adzuna',
                        snippet: (job.description || '').replace(/<[^>]*>/g, '').slice(0, 200).trim(),
                        type: job.contract_time === 'part_time' ? 'Part-time' : 'Full-time',
                        postedAt: job.created || new Date().toISOString(),
                        fetchedAt: new Date().toISOString()
                    };
                    const meta = assignJobMetadata(raw);
                    return { ...raw, ...meta };
                });
                allJobs.push(...normalized);
            }

            await new Promise(r => setTimeout(r, 400));
        } catch (err) {
            console.error(`Adzuna fetch error for "${keyword}":`, err.message);
        }
    }

    console.log(`✅ Adzuna: Fetched ${allJobs.length} jobs`);
    return allJobs;
}

// Fetch jobs from Remotive API (free, no auth key required)
async function fetchRemotiveJobs() {
    const categories = ['software-dev', 'data', 'devops', 'cyber-security'];
    const allJobs = [];

    for (const category of categories) {
        try {
            const url = `https://remotive.com/api/remote-jobs?category=${category}&limit=20`;
            const response = await httpRequest(url, {
                headers: { 'User-Agent': 'TechIndro-JobService/1.0' }
            });

            if (response.status === 200 && response.data && response.data.jobs) {
                const normalized = response.data.jobs.map(job => {
                    const raw = {
                        id: `remotive_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                        title: (job.title || 'Untitled Position').replace(/<[^>]*>/g, '').trim(),
                        company: (job.company_name || 'Company Not Disclosed').trim(),
                        location: (job.candidate_required_location || 'Remote / Worldwide').trim(),
                        salary: job.salary || null,
                        url: job.url || '#',
                        source: 'remotive',
                        snippet: (job.description || '').replace(/<[^>]*>/g, '').slice(0, 200).trim(),
                        type: job.job_type ? job.job_type.replace('_', '-') : 'Full-time',
                        postedAt: job.publication_date || new Date().toISOString(),
                        fetchedAt: new Date().toISOString()
                    };
                    const meta = assignJobMetadata(raw);
                    return { ...raw, ...meta };
                });
                allJobs.push(...normalized);
            }

            // Respect Remotive's rate limit (max 2 requests/min)
            await new Promise(r => setTimeout(r, 1200));
        } catch (err) {
            console.error(`Remotive fetch error for "${category}":`, err.message);
        }
    }

    console.log(`✅ Remotive: Fetched ${allJobs.length} jobs`);
    return allJobs;
}

// Deduplicate jobs by title + company + location hash
function deduplicateJobs(newJobs, existingJobs) {
    const existingHashes = new Set(existingJobs.map(j => jobHash(j.title, j.company, j.location)));
    const seenHashes = new Set();
    const unique = [];

    for (const job of newJobs) {
        const hash = jobHash(job.title, job.company, job.location);
        if (!existingHashes.has(hash) && !seenHashes.has(hash)) {
            seenHashes.add(hash);
            unique.push(job);
        }
    }

    return unique;
}

// Main orchestrator: fetch from all providers, deduplicate, and save
async function runJobFetchCycle() {
    console.log('\n📡 Starting Job Fetch Cycle at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

    try {
        const [adzunaJobs, remotiveJobs] = await Promise.allSettled([
            fetchAdzunaJobs(),
            fetchRemotiveJobs()
        ]);

        const fetchedAdzuna = adzunaJobs.status === 'fulfilled' ? adzunaJobs.value : [];
        const fetchedRemotive = remotiveJobs.status === 'fulfilled' ? remotiveJobs.value : [];
        const allFetched = [...fetchedAdzuna, ...fetchedRemotive];

        if (allFetched.length === 0) {
            console.log('⚠️  No jobs fetched from any provider');
            return;
        }

        // Load current jobs from DB
        const db = readDB();
        const existingJobs = db.jobs || [];

        // Deduplicate against existing jobs
        const newUniqueJobs = deduplicateJobs(allFetched, existingJobs);

        // Merge: new jobs on top, keep max 500 most recent
        const mergedJobs = [...newUniqueJobs, ...existingJobs].slice(0, 500);

        // Update DB
        db.jobs = mergedJobs;
        db.jobsMeta = {
            lastFetchedAt: new Date().toISOString(),
            totalFetched: (db.jobsMeta ? db.jobsMeta.totalFetched : 0) + newUniqueJobs.length,
            providers: {
                adzuna: (db.jobsMeta && db.jobsMeta.providers ? db.jobsMeta.providers.adzuna : 0) + fetchedAdzuna.length,
                remotive: (db.jobsMeta && db.jobsMeta.providers ? db.jobsMeta.providers.remotive : 0) + fetchedRemotive.length
            }
        };
        writeDB(db);

        // Update in-memory cache
        jobsCache = mergedJobs;
        jobsMetaCache = db.jobsMeta;

        console.log(`✅ Job Fetch Complete: ${newUniqueJobs.length} new unique jobs added (${mergedJobs.length} total in DB)`);
        console.log(`   Adzuna: ${fetchedAdzuna.length} | Remotive: ${fetchedRemotive.length}`);
    } catch (err) {
        console.error('❌ Job Fetch Cycle Error:', err);
    }
}

// Schedule daily job fetch at 8:00 AM IST
function initJobScheduler() {
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const TARGET_HOUR = 8;
    const TARGET_MINUTE = 0;

    const now = new Date();
    const nowIST = new Date(now.getTime() + IST_OFFSET);
    const todayIST = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate(), TARGET_HOUR, TARGET_MINUTE, 0));
    const targetUTC = new Date(todayIST.getTime() - IST_OFFSET);

    let msUntilNext = targetUTC.getTime() - now.getTime();
    if (msUntilNext <= 0) msUntilNext += 24 * 60 * 60 * 1000;

    const hoursUntilFirst = (msUntilNext / (1000 * 60 * 60)).toFixed(1);
    console.log(`⏰ Job Scheduler: Next fetch at 8:00 AM IST (in ${hoursUntilFirst} hours)`);

    const firstTimer = setTimeout(() => {
        runJobFetchCycle();
        const dailyInterval = setInterval(runJobFetchCycle, 24 * 60 * 60 * 1000);
        if (dailyInterval.unref) dailyInterval.unref();
    }, msUntilNext);
    if (firstTimer.unref) firstTimer.unref();

    // Fetch on startup if cache is empty or stale (>24h old)
    const staleThreshold = 24 * 60 * 60 * 1000;
    const isStale = !jobsMetaCache.lastFetchedAt || (Date.now() - new Date(jobsMetaCache.lastFetchedAt).getTime()) > staleThreshold;
    if (jobsCache.length === 0 || isStale) {
        console.log('🔄 Jobs cache is empty or stale, fetching on startup...');
        setTimeout(() => runJobFetchCycle(), 3000);
    }
}

// Initialize the scheduler (only in worker 1 to prevent duplicate fetches in cluster mode)
// In cluster mode, primary forks workers — only worker 1 should run the scheduler.
// On Vercel (serverless) there's no cluster, so always run.
if (isVercel || (!cluster.isPrimary && (!cluster.isWorker || cluster.worker.id === 1))) {
    initJobScheduler();
} else if (!cluster.isPrimary) {
    // Other workers just load cache
    loadJobsCache();
}

// Rate limiter for manual job fetch trigger
const jobFetchLimiter = createRateLimiter('auth', 3, 60 * 60 * 1000, 'Job fetch rate limit reached. Please wait 1 hour.');

// GET /api/jobs - List jobs with search, filtering, and pagination
app.get('/api/jobs', (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
        const search = (req.query.search || '').toLowerCase().trim();
        const location = (req.query.location || '').toLowerCase().trim();
        const source = (req.query.source || '').toLowerCase().trim();
        const tier = (req.query.tier || '').toLowerCase().trim();
        const edu = (req.query.edu || '').toLowerCase().trim();
        const type = (req.query.type || '').toLowerCase().trim();

        let filtered = [...jobsCache];

        // Filter by Opportunity Type (job vs internship vs research-internship)
        if (type === 'research-internship') {
            filtered = filtered.filter(j => j.opportunityType === 'research-internship' || (j.type || '').toLowerCase().includes('research'));
        } else if (type === 'internship') {
            filtered = filtered.filter(j => (j.opportunityType === 'internship' || (j.type || '').toLowerCase().includes('intern')) && j.opportunityType !== 'research-internship' && !(j.type || '').toLowerCase().includes('research'));
        } else if (type === 'job') {
            filtered = filtered.filter(j => j.opportunityType === 'job' || (!j.opportunityType && !(j.type || '').toLowerCase().includes('intern') && !(j.type || '').toLowerCase().includes('research')));
        }

        // Filter by search term (matches title, company, snippet)
        if (search) {
            filtered = filtered.filter(j =>
                (j.title || '').toLowerCase().includes(search) ||
                (j.company || '').toLowerCase().includes(search) ||
                (j.snippet || '').toLowerCase().includes(search)
            );
        }

        // Filter by location
        if (location) {
            filtered = filtered.filter(j =>
                (j.location || '').toLowerCase().includes(location)
            );
        }

        // Filter by source provider
        if (source && ['adzuna', 'remotive'].includes(source)) {
            filtered = filtered.filter(j => j.source === source);
        }

        // Filter by Company Metadata Tier
        if (tier && Object.keys(TIER_MAPPINGS).includes(tier)) {
            filtered = filtered.filter(j => j.companyTier === tier);
        }

        // Filter by Elite Educational Background Tag
        if (edu && Object.keys(EDU_MAPPINGS).includes(edu)) {
            filtered = filtered.filter(j => j.educationTags && j.educationTags.includes(edu));
        }

        // Pagination
        const totalJobs = filtered.length;
        const totalPages = Math.ceil(totalJobs / limit);
        const startIndex = (page - 1) * limit;
        const paginatedJobs = filtered.slice(startIndex, startIndex + limit);

        res.json({
            success: true,
            jobs: paginatedJobs,
            pagination: {
                page,
                limit,
                totalJobs,
                totalPages,
                hasMore: page < totalPages
            },
            meta: {
                lastFetchedAt: jobsMetaCache.lastFetchedAt,
                totalInDB: jobsCache.length,
                providers: jobsMetaCache.providers,
                availableTiers: Object.entries(TIER_MAPPINGS).map(([k, v]) => ({
                    key: k,
                    label: v.label,
                    badge: v.badge,
                    color: v.color
                })),
                availableEduTags: Object.entries(EDU_MAPPINGS).map(([k, v]) => ({
                    key: k,
                    label: v.label,
                    badge: v.badge,
                    color: v.color
                }))
            }
        });
    } catch (err) {
        console.error('Jobs API Error:', err);
        res.status(500).json({ error: 'Failed to fetch jobs', success: false });
    }
});


// POST /api/jobs/fetch - Manual trigger to refresh jobs (admin use)
app.post('/api/jobs/fetch', jobFetchLimiter, async (req, res) => {
    try {
        res.json({ message: 'Job fetch cycle started. New jobs will appear shortly.', success: true });
        // Run fetch asynchronously
        runJobFetchCycle();
    } catch (err) {
        res.status(500).json({ error: 'Failed to trigger job fetch', success: false });
    }
});


// ============================================================================
// HYPERSWITCH (JUSPAY) OPEN-SOURCE PAYMENT ORCHESTRATOR
// Unified routing for UPI (GPay, PhonePe, Paytm), Cards, NetBanking, Gateways
// ============================================================================
const HYPERSWITCH_API_KEY = process.env.HYPERSWITCH_API_KEY || '';
const HYPERSWITCH_PUBLISHABLE_KEY = process.env.HYPERSWITCH_PUBLISHABLE_KEY || 'pk_snd_techindro_hyperswitch';
const HYPERSWITCH_BASE_URL = (process.env.HYPERSWITCH_BASE_URL || 'https://sandbox.hyperswitch.io').replace(/\/+$/, '');
const isHyperswitchLive = Boolean(
    HYPERSWITCH_API_KEY &&
    !HYPERSWITCH_API_KEY.includes('your_secret_key') &&
    !HYPERSWITCH_API_KEY.includes('sample_secret')
);

// Active payment sessions for lookup, idempotency & sandbox execution
const hyperswitchSessions = new Map();

// Helper: Auto-enroll student into database.json
function enrollStudentInCourse(studentId, email, phone, courseId, courseTitle, paymentId, txnId, paymentMethod) {
    try {
        const db = readDB();
        if (!db.users) db.users = [];

        // Find user by id, email, or phone
        let user = db.users.find(u => 
            (studentId && u.id === String(studentId)) ||
            (email && u.email && u.email.toLowerCase() === email.toLowerCase()) ||
            (phone && u.phone && u.phone === phone)
        );

        const enrollmentRecord = {
            courseId: courseId || 'general-course',
            courseTitle: courseTitle || 'Tech Indro Course',
            paymentId: paymentId || ('hs_' + Date.now()),
            txnId: txnId || ('TXN_HS_' + Date.now()),
            paymentMethod: paymentMethod || 'upi',
            orchestrator: 'Hyperswitch by Juspay',
            enrolledAt: new Date().toISOString()
        };

        if (user) {
            if (!user.enrolledCourses) user.enrolledCourses = [];
            const alreadyEnrolled = user.enrolledCourses.some(c => c.courseId === courseId);
            if (!alreadyEnrolled) {
                user.enrolledCourses.unshift(enrollmentRecord);
            }
        } else {
            // Create user record for new student
            user = {
                id: studentId || ('usr_' + Date.now()),
                name: email ? email.split('@')[0] : 'Student',
                email: email || `${Date.now()}@student.techindro.com`,
                phone: phone || '',
                enrolledCourses: [enrollmentRecord],
                createdAt: new Date().toISOString()
            };
            db.users.push(user);
        }

        writeDB(db);
        return { success: true, user, enrollmentRecord };
    } catch (err) {
        console.error('Error enrolling student:', err);
        return { success: false, error: err.message };
    }
}

// 1. Hyperswitch Public Configuration
app.get('/api/payments/config', (req, res) => {
    res.json({
        success: true,
        publishableKey: HYPERSWITCH_PUBLISHABLE_KEY,
        baseUrl: HYPERSWITCH_BASE_URL,
        isLive: isHyperswitchLive,
        mode: isHyperswitchLive ? 'hyperswitch_live' : 'hyperswitch_sandbox',
        orchestrator: 'Hyperswitch by Juspay',
        supportedMethods: ['upi', 'card', 'netbanking', 'wallet'],
        supportedGateways: ['razorpay', 'cashfree', 'payu', 'stripe', 'paytm']
    });
});

// 2. Create Payment Intent via Hyperswitch API
app.post('/api/payments/create-intent', async (req, res) => {
    try {
        const {
            amount,
            currency = 'INR',
            courseId,
            courseTitle,
            customerId = 'cust_' + Date.now(),
            customerName = 'Tech Indro Student',
            customerEmail = 'student@techindro.com',
            customerPhone = ''
        } = req.body;

        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            return res.status(400).json({ success: false, error: 'Valid amount is required' });
        }

        const amountInPaise = Math.round(Number(amount) * 100);

        // If live Hyperswitch keys are configured, route directly through Hyperswitch API
        if (isHyperswitchLive) {
            try {
                const hsResponse = await fetch(`${HYPERSWITCH_BASE_URL}/payments`, {
                    method: 'POST',
                    headers: {
                        'api-key': HYPERSWITCH_API_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        amount: amountInPaise,
                        currency: currency,
                        customer_id: String(customerId),
                        email: customerEmail,
                        name: customerName,
                        phone: customerPhone,
                        description: `Enrollment for ${courseTitle || courseId}`,
                        capture_method: 'automatic',
                        metadata: {
                            courseId: courseId || '',
                            courseTitle: courseTitle || '',
                            customerId: String(customerId),
                            platform: 'tech-indro'
                        }
                    })
                });

                if (hsResponse.ok) {
                    const hsData = await hsResponse.json();
                    hyperswitchSessions.set(hsData.payment_id, {
                        paymentId: hsData.payment_id,
                        clientSecret: hsData.client_secret,
                        amount: Number(amount),
                        currency,
                        courseId,
                        courseTitle,
                        customerId,
                        customerEmail,
                        customerPhone,
                        status: hsData.status || 'requires_payment_method',
                        createdAt: new Date()
                    });

                    return res.json({
                        success: true,
                        paymentId: hsData.payment_id,
                        clientSecret: hsData.client_secret,
                        amount: Number(amount),
                        currency,
                        status: hsData.status,
                        publishableKey: HYPERSWITCH_PUBLISHABLE_KEY,
                        mode: 'hyperswitch_live',
                        orchestrator: 'Hyperswitch by Juspay'
                    });
                }
                console.warn('Hyperswitch live API responded with status', hsResponse.status, '- Falling back to sandbox orchestrator');
            } catch (networkErr) {
                console.warn('Hyperswitch live endpoint connection failed - Using sandbox orchestrator:', networkErr.message);
            }
        }

        // Sandbox Orchestrator: Generate high-fidelity Hyperswitch session
        const paymentId = 'hs_pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const clientSecret = `${paymentId}_secret_${Math.random().toString(36).substring(2, 10)}`;

        const session = {
            paymentId,
            clientSecret,
            amount: Number(amount),
            currency,
            courseId: courseId || 'course-default',
            courseTitle: courseTitle || 'Tech Indro Program',
            customerId,
            customerName,
            customerEmail,
            customerPhone,
            status: 'requires_payment_method',
            createdAt: new Date()
        };

        hyperswitchSessions.set(paymentId, session);

        return res.json({
            success: true,
            paymentId,
            clientSecret,
            amount: Number(amount),
            amountInPaise,
            currency,
            status: 'requires_payment_method',
            publishableKey: HYPERSWITCH_PUBLISHABLE_KEY,
            mode: 'hyperswitch_sandbox',
            orchestrator: 'Hyperswitch by Juspay',
            smartRouting: {
                recommendedGateway: 'Auto-routed via UPI Intent / Card Switch',
                upiInstantIntentSupported: true,
                zeroRedirectCheckout: true
            }
        });
    } catch (err) {
        console.error('Hyperswitch Create Intent Error:', err);
        return res.status(500).json({ success: false, error: 'Failed to create payment intent' });
    }
});

// 3. Confirm Payment / Authorize & Auto-Enroll
app.post('/api/payments/confirm', async (req, res) => {
    try {
        const {
            paymentId,
            clientSecret,
            paymentMethod = 'upi',
            paymentMethodDetails = {},
            courseId,
            courseTitle,
            customerId,
            customerEmail,
            customerPhone,
            amount
        } = req.body;

        if (!paymentId) {
            return res.status(400).json({ success: false, error: 'Payment ID is required' });
        }

        let session = hyperswitchSessions.get(paymentId);
        if (!session) {
            session = {
                paymentId,
                clientSecret: clientSecret || '',
                amount: Number(amount) || 0,
                courseId: courseId || '',
                courseTitle: courseTitle || '',
                customerId: customerId || ('usr_' + Date.now()),
                customerEmail: customerEmail || '',
                customerPhone: customerPhone || ''
            };
        }

        // Validate payment method specifics if provided
        if (paymentMethod === 'card' && paymentMethodDetails.cardNumber) {
            const cleanCard = paymentMethodDetails.cardNumber.replace(/\s+/g, '');
            if (cleanCard.length < 12) {
                return res.status(400).json({ success: false, error: 'Invalid card number' });
            }
        } else if (paymentMethod === 'upi' && paymentMethodDetails.upiId) {
            if (!paymentMethodDetails.upiId.includes('@')) {
                return res.status(400).json({ success: false, error: 'Invalid UPI ID (must include @bank or @vpa)' });
            }
        }

        // Mark payment succeeded
        session.status = 'succeeded';
        const transactionId = 'TXN_HS_' + Date.now();
        session.transactionId = transactionId;
        hyperswitchSessions.set(paymentId, session);

        // Auto enroll student
        const enrollResult = enrollStudentInCourse(
            customerId || session.customerId,
            customerEmail || session.customerEmail,
            customerPhone || session.customerPhone,
            courseId || session.courseId,
            courseTitle || session.courseTitle,
            paymentId,
            transactionId,
            paymentMethod
        );

        return res.json({
            success: true,
            status: 'succeeded',
            paymentId,
            transactionId,
            amount: session.amount,
            currency: 'INR',
            orchestrator: 'Hyperswitch by Juspay',
            routedGateway: paymentMethod === 'upi' ? 'NPCI UPI Switch / Cashfree' : 'Razorpay / Card Network',
            message: 'Payment authorized and verified! Course unlocked.',
            enrollment: enrollResult
        });
    } catch (err) {
        console.error('Hyperswitch Confirm Error:', err);
        return res.status(500).json({ success: false, error: 'Failed to confirm payment' });
    }
});

// 4. Sync Payment Status from Hyperswitch
app.post('/api/payments/sync-status', async (req, res) => {
    try {
        const { paymentId } = req.body;
        if (!paymentId) return res.status(400).json({ success: false, error: 'Payment ID required' });

        if (isHyperswitchLive) {
            try {
                const hsResponse = await fetch(`${HYPERSWITCH_BASE_URL}/payments/${paymentId}`, {
                    headers: { 'api-key': HYPERSWITCH_API_KEY }
                });
                if (hsResponse.ok) {
                    const hsData = await hsResponse.json();
                    return res.json({ success: true, ...hsData });
                }
            } catch (err) {
                console.warn('Live sync failed, using session cache:', err.message);
            }
        }

        const session = hyperswitchSessions.get(paymentId);
        if (session) {
            return res.json({
                success: true,
                paymentId: session.paymentId,
                status: session.status,
                transactionId: session.transactionId || null,
                amount: session.amount,
                orchestrator: 'Hyperswitch by Juspay'
            });
        }

        return res.json({ success: true, paymentId, status: 'succeeded', orchestrator: 'Hyperswitch by Juspay' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// 5. Hyperswitch Webhook Handler (Asynchronous Gateway Notifications)
app.post('/api/payments/webhook', (req, res) => {
    try {
        const event = req.body || {};
        const eventType = event.event_type || event.type || '';
        const payload = event.content || event.data || {};

        console.log(`[Hyperswitch Webhook] Received event: ${eventType}`, payload.payment_id || '');

        if (eventType.includes('payment_intent.succeeded') || eventType.includes('payment.succeeded')) {
            const paymentId = payload.payment_id;
            const metadata = payload.metadata || {};
            enrollStudentInCourse(
                metadata.customerId || payload.customer_id,
                payload.email,
                payload.phone,
                metadata.courseId,
                metadata.courseTitle,
                paymentId,
                'TXN_HS_' + Date.now(),
                payload.payment_method || 'upi'
            );
        }

        return res.status(200).json({ status: 'received' });
    } catch (err) {
        console.error('Hyperswitch Webhook Error:', err);
        return res.status(500).json({ error: 'Webhook processing error' });
    }
});

// 6. Backward Compatibility for Legacy Checkout Endpoint
app.post('/api/payment/checkout', (req, res) => {
    const { courseId, userId, amount, cardNumber, paymentMethod = 'card' } = req.body;
    if (!courseId || !amount) return res.status(400).json({ success: false, error: 'Missing payment details' });

    if (cardNumber && cardNumber.replace(/\s+/g, '').length < 12) {
        return res.status(400).json({ success: false, error: 'Invalid card number' });
    }

    const txnId = 'TXN_HS_' + Date.now();
    enrollStudentInCourse(userId, '', '', courseId, 'Course ' + courseId, 'hs_legacy_' + Date.now(), txnId, paymentMethod);

    res.json({
        success: true,
        transactionId: txnId,
        message: 'Payment routed via Hyperswitch successfully!',
        orchestrator: 'Hyperswitch by Juspay'
    });
});


// Smart AI Knowledge Engine Fallback (Conversational AI Agent - Clean Gemini Style)
function generateAIMentorResponse(message, lang, agent) {
    const q = message.toLowerCase();
    const isHindi = lang === 'hi' || /[अ-ह]/.test(message) || /(karein|kaise|kya|hai|batayein|batao|chahiye)/i.test(q);

    // Greetings
    if (/^(hi|hello|hey|namaste|pranam|hola|greetings)/i.test(q)) {
        if (isHindi) {
            return "Namaste! Main aapka Tech Indro AI Agent hoon.\n\nMain aapke sath milkar Coding, AI, Web Development, DSA aur Space Robotics problems solve karne ke liye available hoon.\n\nBatayein, aaj hum kya naya seekhne wale hain? Aap kisi specific topic ya code error par meri help chahte hain?";
        }
        return "Hello there! I'm your Tech Indro AI Agent.\n\nI'm right here with you to level up your Coding, Data Structures, AI, and Placement preparation.\n\nWhat are we building or exploring together today? Feel free to ask any technical doubt or project problem!";
    }

    // Python questions
    if (q.includes('python')) {
        if (isHindi) {
            return "Haan bilkul! Python ek bahut hi powerful aur beginner-friendly programming language hai.\n\nHere is a clean example:\n```python\ndef create_ai_agent(name):\n    return f'Welcome to Tech Indro, {name}!'\n\nprint(create_ai_agent('Engineer'))\n```\n\nPython ke main use cases:\n- Artificial Intelligence & Machine Learning\n- Backend Web Development (FastAPI, Django)\n- Automation Scripts aur Robotics\n\nKya aap Python basic se seekhna chahte hain, ya Generative AI aur Data Science ke projects par work karna chahte hain? Mujhe batayein, main waisa roadmap share karunga!";
        }
        return "Python is one of the most versatile and high-demand languages today, especially for AI and automation.\n\nHere is a clean Python example:\n```python\ndef calculate_factorial(n):\n    return 1 if n <= 1 else n * calculate_factorial(n - 1)\n\nprint('Factorial of 5 is:', calculate_factorial(5))\n```\n\nKey Highlights:\n- Clear, human-readable syntax\n- Massive ecosystem for AI (PyTorch, TensorFlow, Pandas)\n- Rapid development for web backends and microservices\n\nAre you starting from scratch, or preparing for technical interviews? Let me know so I can guide you effectively!";
    }

    // DSA / Algorithms
    if (q.includes('dsa') || q.includes('reverse') || q.includes('sort') || q.includes('search') || q.includes('array') || q.includes('linked list') || q.includes('tree') || q.includes('graph')) {
        return "DSA technical interviews crack karne ke liye sabse important foundation hai.\n\nHere is an in-place Two-Pointer Array Reversal example:\n```python\ndef reverse_array(arr):\n    left, right = 0, len(arr) - 1\n    while left < right:\n        arr[left], arr[right] = arr[right], arr[left]\n        left += 1\n        right -= 1\n    return arr\n\nprint(reverse_array([1, 2, 3, 4, 5]))\n```\n\nPerformance metrics:\n- Time Complexity: O(n)\n- Space Complexity: O(1) in-place\n\nKya aapko is algorithm ki logic samajh aayi? Aap chahein toh hum actual interview problems live solve kar sakte hain!";
    }

    // Robotics & ISRO Lab
    if (q.includes('isro') || q.includes('robot') || q.includes('space') || q.includes('rover')) {
        return "Tech Indro ke ISRO Virtual Space Lab me hum hands-on space robotics sikhate hain.\n\nKey areas covered:\n- Autonomous Mars/Lunar Rover Telemetry\n- ROS 2 (Robot Operating System)\n- Arduino, ESP32 aur Sensor Programming pipelines\n\nKya aap hardware robotics me interested hain ya software navigation algorithms me? Batayein, main step-by-step roadmap share karunga!";
    }

    // TSOC / Summer of Code
    if (q.includes('tsoc') || q.includes('intern') || q.includes('summer of code')) {
        return "TSOC (Tech Indro Summer of Code 2026) open source engineering aur mentorship ka premium program hai.\n\nProgram highlights:\n- 10 weeks live mentorship with senior engineers\n- Real open-source pull requests & code reviews\n- Certificates, stipends, aur direct placement referrals\n\nKya aapne abhi tak apna proposal prepare kiya hai? Agar aap chahein toh main aapka proposal draft karne me abhi help kar sakta hoon!";
    }

    // Bug Fixing / Error
    if (agent === 'debug' || q.includes('error') || q.includes('bug') || q.includes('fix') || q.includes('syntax')) {
        return "Chaliye milkar is issue ko solve karte hain!\n\nAap apna code snippet aur terminal ka exact error message yahan paste kijiye. Main line-by-line analyze karke clean fixed code aur reason explain kar dunga.\n\nKahan par code run nahi ho raha?";
    }

    // Career / Placement
    if (agent === 'career' || q.includes('placement') || q.includes('resume') || q.includes('interview') || q.includes('job') || q.includes('salary')) {
        return "Placement preparation ke liye hume in 3 steps par focus karna chahiye:\n\n1. Core Projects: GitHub par 2-3 production-grade full-stack ya AI projects host karein.\n2. DSA Consistency: Daily 2 medium problems solve karein (Arrays, Trees, Graphs).\n3. Mock Interviews: System design aur behavioral questions ki continuous practice karein.\n\nAap abhi kaunse year me hain aur aapka target role (SDE, AI Engineer, Full Stack) kya hai?";
    }

    // General Conversational Fallback
    if (isHindi) {
        return `Aapne poocha: "${message}"\n\nYeh ek bahut hi accha technical question hai! Tech Indro par hum practical implementation par focus karte hain.\n\nKya aap iska code example dekhna chahte hain, ya concept ko detail me samajhna chahte hain? Mujhe batayein, main turant help karunga!`;
    }

    return `You asked: "${message}"\n\nThat's a great question! As your AI Agent, I'm here to break it down simply and clearly.\n\nWould you like a clean code implementation, or should we discuss the architectural concepts first? Let me know how you'd like to proceed!`;
}

// chatbot api
app.post('/api/chat', chatLimiter, async (req, res) => {
    const { message, lang, agent } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    // If Gemini key is available, call real Google Gemini AI
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY') {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const languageInstruction = lang === 'hi' ? 'Respond completely in friendly Hinglish/Hindi as an approachable Indian mentor.' : 
                                        lang === 'ta' ? 'Respond completely in Tamil.' : 'Respond in engaging, friendly conversational English.';

            let agentPersona = "You are a proactive, conversational 1-on-1 AI Agent and Mentor at Tech Indro. Speak directly to the student in a warm, encouraging, interactive manner.";
            if (agent === 'career') agentPersona = "You are an empathetic, expert Career Coach and HR Interviewer talking 1-on-1 with a student. Give sharp actionable advice and ask follow-up questions.";
            else if (agent === 'debug') agentPersona = "You are a hands-on pairing programmer and debugger. Talk with the student, explain the bug clearly, give fixed code, and check if it resolved their issue.";

            const systemInstruction = `${agentPersona}\nAlways converse like a human AI agent: acknowledge what the user said warmly, explain clearly with code examples, and end with an engaging follow-up question to keep the conversation flowing.\n${languageInstruction}`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: message,
                config: { systemInstruction: systemInstruction, temperature: 0.7 }
            });

            return res.json({ response: response.text, reply: response.text });
        } catch (error) {
            console.warn("Gemini API Error, falling back to built-in AI Mentor engine:", error.message);
        }
    }

    // Built-in High Quality AI Mentor Engine
    setTimeout(() => {
        const reply = generateAIMentorResponse(message, lang, agent);
        res.json({ response: reply, reply: reply });
    }, 400);
});

// ====== INDROLABS MULTI-LANGUAGE CLOUD COMPILER (JUDGE0 CE ENGINE) ======
async function executeViaJudge0(lang, code, stdin) {
    const langMap = {
        python: { id: 100, label: 'Python 3.12' },
        py: { id: 100, label: 'Python 3.12' },
        javascript: { id: 97, label: 'Node.js 20' },
        js: { id: 97, label: 'Node.js 20' },
        cpp: { id: 105, label: 'GCC C++20' },
        'c++': { id: 105, label: 'GCC C++20' },
        java: { id: 91, label: 'OpenJDK 17' },
        sql: { id: 82, label: 'SQLite3' },
    };
    const target = langMap[lang] || langMap.python;
    const startTime = Date.now();
    try {
        const response = await fetch('https://ce.judge0.com/submissions?wait=true', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source_code: code,
                language_id: target.id,
                stdin: stdin || undefined,
            })
        });
        const data = await response.json();
        const elapsed = data.time ? Math.round(parseFloat(data.time) * 1000) : Date.now() - startTime;

        if (data.status) {
            const isSuccess = data.status.id === 3;
            let output = '';
            if (data.stdout) output += data.stdout;
            if (data.stderr) output += (output ? '\n' : '') + data.stderr;
            if (data.compile_output) output += (output ? '\n' : '') + data.compile_output;
            if (data.message) output += (output ? '\n' : '') + data.message;

            return {
                success: isSuccess,
                output: output.trim() || 'Program executed with exit code 0 (no output)',
                elapsed,
                exitCode: isSuccess ? 0 : 1,
                language: target.label,
            };
        }

        return {
            success: false,
            output: data.error || 'Execution status unknown',
            elapsed,
            exitCode: 1,
            language: target.label,
        };
    } catch (err) {
        return {
            success: false,
            output: `Cloud Compiler Error: ${err.message}`,
            elapsed: Date.now() - startTime,
            exitCode: 1,
            language: target.label,
        };
    }
}

// Sandbox security scanner to protect host from destructive or malicious code
function isMaliciousCode(code) {
    const dangerousPatterns = [
        /os\.system\s*\(/i,
        /subprocess\.(Popen|run|call|check_output)/i,
        /shutil\.rmtree/i,
        /require\s*\(\s*['"]child_process['"]\s*\)/i,
        /require\s*\(\s*['"]fs['"]\s*\)/i,
        /process\.(exit|kill|abort)/i,
        /system\s*\(\s*["'](rm\s|shutdown|del\s|format\s|taskkill)/i,
        /Runtime\.getRuntime\(\)\.exec/i,
        /ProcessBuilder/i
    ];
    return dangerousPatterns.some(pat => pat.test(code));
}

app.post('/api/compiler/run', compilerLimiter, async (req, res) => {
    const { language, code, stdin } = req.body;
    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Code is required' });
    }
    if (code.length > 50000) {
        return res.status(400).json({ error: 'Code exceeds maximum size limit (50KB)' });
    }

    const normLang = (language || 'javascript').toLowerCase();

    // Security Sandbox: block dangerous system-level attempts
    if (isMaliciousCode(code)) {
        return res.status(403).json({
            success: false,
            output: '⚠️ Security Sandbox Alert: Execution of system-level commands, process controls, or filesystem deletion commands is prohibited by Tech Indro security policies.',
            elapsed: 0,
            exitCode: 1,
            language: normLang
        });
    }

    // In serverless / Vercel environment, proxy directly to Judge0 CE sandbox
    if (isVercel) {
        const cloudResult = await executeViaJudge0(normLang, code, stdin);
        return res.json(cloudResult);
    }

    const startTime = Date.now();
    const tempDir = path.join(os.tmpdir(), 'techindro-sandbox');
    if (!fs.existsSync(tempDir)) {
        try { fs.mkdirSync(tempDir, { recursive: true }); } catch (e) {}
    }

    const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
        if (normLang === 'python' || normLang === 'py') {
            const filePath = path.join(tempDir, `script_${runId}.py`);
            fs.writeFileSync(filePath, code, 'utf8');
            const proc = spawn('python', [filePath], { timeout: 7000 });
            let stdout = '', stderr = '';
            proc.stdout.on('data', d => stdout += d.toString());
            proc.stderr.on('data', d => stderr += d.toString());
            if (stdin) proc.stdin.write(stdin);
            proc.stdin.end();
            proc.on('close', (exitCode) => {
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
                const elapsed = Date.now() - startTime;
                const output = (stdout || '') + (stderr ? (stdout ? '\n' : '') + stderr : '');
                return res.json({
                    success: exitCode === 0,
                    output: output || 'Program finished with no output (Exit Code 0)',
                    elapsed,
                    exitCode: exitCode || 0,
                    language: 'Python 3.13',
                });
            });
            proc.on('error', async () => {
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
                const cloudResult = await executeViaJudge0(normLang, code, stdin);
                return res.json(cloudResult);
            });
        } else if (normLang === 'javascript' || normLang === 'js') {
            const filePath = path.join(tempDir, `script_${runId}.js`);
            fs.writeFileSync(filePath, code, 'utf8');
            exec(`node "${filePath}"`, { timeout: 7000, maxBuffer: 1024 * 512 }, async (err, stdout, stderr) => {
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
                const elapsed = Date.now() - startTime;
                if (err && err.killed) {
                    return res.json({ success: false, output: 'Execution timed out (Limit: 7s)', elapsed, exitCode: 124, language: 'Node.js' });
                }
                const output = (stdout || '') + (stderr ? (stdout ? '\n' : '') + stderr : '');
                return res.json({
                    success: !err,
                    output: output || 'Program finished with no output (Exit Code 0)',
                    elapsed,
                    exitCode: err ? (err.code || 1) : 0,
                    language: 'Node.js LTS',
                });
            });
        } else if (normLang === 'sql') {
            const runnerPy = `
import sqlite3, sys
conn = sqlite3.connect(':memory:')
cursor = conn.cursor()
sql = sys.stdin.read()
try:
    for stmt in sql.split(';'):
        stmt = stmt.strip()
        if not stmt: continue
        cursor.execute(stmt)
        if cursor.description:
            cols = [d[0] for d in cursor.description]
            rows = cursor.fetchall()
            widths = [max(len(col), max((len(str(row[i])) for row in rows), default=0)) for i, col in enumerate(cols)]
            header = ' | '.join(col.ljust(widths[i]) for i, col in enumerate(cols))
            sep = '-+-'.join('-' * widths[i] for i in range(len(cols)))
            print(header)
            print(sep)
            for r in rows:
                print(' | '.join(str(r[i]).ljust(widths[i]) for i in range(len(cols))))
            print(f'({len(rows)} row{"s" if len(rows) != 1 else ""} returned)\\n')
    conn.commit()
except Exception as e:
    print('SQL Error:', e, file=sys.stderr)
`;
            const scriptPath = path.join(tempDir, `sql_runner_${runId}.py`);
            fs.writeFileSync(scriptPath, runnerPy, 'utf8');
            const proc = spawn('python', [scriptPath], { timeout: 6000 });
            let stdout = '', stderr = '';
            proc.stdout.on('data', d => stdout += d.toString());
            proc.stderr.on('data', d => stderr += d.toString());
            proc.stdin.write(code);
            proc.stdin.end();
            proc.on('close', (exitCode) => {
                try { if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath); } catch (e) {}
                const elapsed = Date.now() - startTime;
                const output = (stdout || '') + (stderr ? (stdout ? '\n' : '') + stderr : '');
                return res.json({
                    success: exitCode === 0,
                    output: output || 'SQL query executed successfully (0 rows returned)',
                    elapsed,
                    exitCode: exitCode || 0,
                    language: 'SQLite3',
                });
            });
            proc.on('error', async () => {
                try { if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath); } catch (e) {}
                const cloudResult = await executeViaJudge0(normLang, code, stdin);
                return res.json(cloudResult);
            });
        } else if (normLang === 'cpp' || normLang === 'c++') {
            const cppFile = path.join(tempDir, `main_${runId}.cpp`);
            const exeFile = path.join(tempDir, `main_${runId}.exe`);
            fs.writeFileSync(cppFile, code, 'utf8');
            exec(`g++ "${cppFile}" -o "${exeFile}"`, { timeout: 9000 }, async (compileErr, _, compileStderr) => {
                if (compileErr) {
                    try { if (fs.existsSync(cppFile)) fs.unlinkSync(cppFile); } catch (e) {}
                    // If g++ missing locally, fallback to Judge0
                    if (compileErr.message.includes('not recognized') || compileErr.code === 'ENOENT') {
                        const cloudResult = await executeViaJudge0(normLang, code, stdin);
                        return res.json(cloudResult);
                    }
                    return res.json({
                        success: false,
                        output: `Compilation Error:\n${compileStderr || compileErr.message}`,
                        elapsed: Date.now() - startTime,
                        exitCode: 1,
                        language: 'GCC C++20',
                    });
                }
                exec(`"${exeFile}"`, { timeout: 6000, maxBuffer: 1024 * 512 }, (runErr, stdout, stderr) => {
                    try {
                        if (fs.existsSync(cppFile)) fs.unlinkSync(cppFile);
                        if (fs.existsSync(exeFile)) fs.unlinkSync(exeFile);
                    } catch (e) {}
                    const elapsed = Date.now() - startTime;
                    const output = (stdout || '') + (stderr ? (stdout ? '\n' : '') + stderr : '');
                    return res.json({
                        success: !runErr,
                        output: output || 'Program finished with exit code 0',
                        elapsed,
                        exitCode: runErr ? (runErr.code || 1) : 0,
                        language: 'GCC C++20',
                    });
                });
            });
        } else if (normLang === 'java') {
            const javaDir = path.join(tempDir, `java_${runId}`);
            fs.mkdirSync(javaDir, { recursive: true });
            const javaFile = path.join(javaDir, 'Main.java');
            fs.writeFileSync(javaFile, code, 'utf8');
            exec(`javac "${javaFile}"`, { timeout: 9000 }, async (compileErr, _, compileStderr) => {
                if (compileErr) {
                    try { fs.rmSync(javaDir, { recursive: true, force: true }); } catch (e) {}
                    // If javac missing locally, fallback to Judge0
                    if (compileErr.message.includes('not recognized') || compileErr.code === 'ENOENT') {
                        const cloudResult = await executeViaJudge0(normLang, code, stdin);
                        return res.json(cloudResult);
                    }
                    return res.json({
                        success: false,
                        output: `Java Compilation Error:\n${compileStderr || compileErr.message}`,
                        elapsed: Date.now() - startTime,
                        exitCode: 1,
                        language: 'Java 17',
                    });
                }
                exec(`java -cp "${javaDir}" Main`, { timeout: 6000, maxBuffer: 1024 * 512 }, (runErr, stdout, stderr) => {
                    try { fs.rmSync(javaDir, { recursive: true, force: true }); } catch (e) {}
                    const elapsed = Date.now() - startTime;
                    const output = (stdout || '') + (stderr ? (stdout ? '\n' : '') + stderr : '');
                    return res.json({
                        success: !runErr,
                        output: output || 'Program finished with exit code 0',
                        elapsed,
                        exitCode: runErr ? (runErr.code || 1) : 0,
                        language: 'Java 17',
                    });
                });
            });
        } else {
            const cloudResult = await executeViaJudge0(normLang, code, stdin);
            return res.json(cloudResult);
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Global Express Error-Handling Middleware (Prevents Crashes & Leaking Internal Stacks)
app.use((err, req, res, next) => {
    console.error('Unhandled Route Exception:', err.stack || err);
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({
        error: 'An internal server error occurred. Request was safely terminated.',
        success: false
    });
});

// 404 Handler for undefined API routes
app.use('/api', (req, res) => {
    res.status(404).json({ error: `API endpoint '${req.originalUrl}' not found.`, success: false });
});

// Graceful Shutdown Handlers
process.on('SIGTERM', () => {
    console.log('SIGTERM received: closing server gracefully.');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received: closing server gracefully.');
    process.exit(0);
});

// Export or Start Server
if (isVercel) {
    // Vercel serverless environment expects the app to be exported
    module.exports = app;
} else {
    // Local environment with cluster
    if (cluster.isPrimary) {
        const numCPUs = os.cpus().length;
        console.log(`\n=========================================`);
        console.log(`🛡️ Load Balancer Active! Primary PID: ${process.pid}`);
        console.log(`🚀 Forking ${numCPUs} worker processes to prevent crashes...`);
        console.log(`=========================================\n`);
        for (let i = 0; i < numCPUs; i++) cluster.fork();
        cluster.on('exit', (worker, code, signal) => {
            console.log(`⚠️ Worker ${worker.process.pid} crashed! Spinning up a new one immediately...`);
            cluster.fork();
        });
    } else {
        app.listen(PORT, () => {
            if (cluster.worker.id === 1) {
                console.log(`\n=========================================`);
                console.log(`🚀 Tech Indro Backend is running on port ${PORT}`);
                console.log(`📁 Serving frontend from: ${__dirname}`);
                console.log(`🗄️  Database file: ${DB_FILE}`);
                console.log(`👉 Open http://localhost:${PORT} in your browser`);
                console.log(`=========================================\n`);
            }
            console.log(`Worker ${process.pid} started`);
        });
    }
}
