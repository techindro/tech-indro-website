require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cluster = require('cluster');
const os = require('os');

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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from the same directory

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

app.post('/api/auth/login', (req, res) => {
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
app.post('/api/auth/register', (req, res) => {
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

// contact form submission
app.post('/api/contact', (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: "All fields are required" });

    const db = readDB();
    const newContact = { id: Date.now().toString(), name, email, message, date: new Date().toISOString() };
    db.contacts.push(newContact);
    writeDB(db);

    res.json({ message: "Contact form submitted successfully!", contact: newContact });
});

// fetch all courses
app.get('/api/courses', (req, res) => {
    try {
        const courses = JSON.parse(fs.readFileSync(COURSES_FILE, 'utf8'));
        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch courses data' });
    }
});

// fetch kids courses
app.get('/api/shikshak-courses', (req, res) => {
    try {
        const courses = JSON.parse(fs.readFileSync(SHIKSHAK_COURSES_FILE, 'utf8'));
        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch shikshak courses data' });
    }
});

// fetch ai tools
app.get('/api/ai-tools', (req, res) => {
    try {
        const tools = JSON.parse(fs.readFileSync(AI_TOOLS_FILE, 'utf8'));
        res.json(tools);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch ai tools data' });
    }
});

// fetch course details
app.get('/api/courses/:id', (req, res) => {
    try {
        if (!fs.existsSync(COURSES_FILE)) return res.status(404).json({ error: "Course not found" });
        const courses = JSON.parse(fs.readFileSync(COURSES_FILE, 'utf8'));
        const course = courses.find(c => c.id === req.params.id);
        
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

// mock payment flow
app.post('/api/payment/checkout', (req, res) => {
    const { courseId, userId, amount, cardNumber } = req.body;
    if (!courseId || !amount || !cardNumber) return res.status(400).json({ success: false, error: "Missing payment details" });
    
    setTimeout(() => {
        if (cardNumber.length < 12) return res.status(400).json({ success: false, error: "Invalid card number" });
        res.json({ success: true, transactionId: 'TXN' + Date.now(), message: "Payment processed successfully!" });
    }, 1500);
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
app.post('/api/chat', async (req, res) => {
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

            return res.json({ response: response.text });
        } catch (error) {
            console.warn("Gemini API Error, falling back to built-in AI Mentor engine:", error.message);
        }
    }

    // Built-in High Quality AI Mentor Engine
    setTimeout(() => {
        const reply = generateAIMentorResponse(message, lang, agent);
        res.json({ response: reply });
    }, 400);
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
