require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cluster = require('cluster');
const os = require('os');

if (cluster.isPrimary) {
    // setup cluster for basic crash recovery
    const numCPUs = os.cpus().length;
    console.log(`\n=========================================`);
    console.log(`🛡️ Load Balancer Active! Primary PID: ${process.pid}`);
    console.log(`🚀 Forking ${numCPUs} worker processes to prevent crashes...`);
    console.log(`=========================================\n`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`⚠️ Worker ${worker.process.pid} crashed! Spinning up a new one immediately...`);
        cluster.fork();
    });
} else {
    // worker setup
    const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'database.json');
const COURSES_FILE = path.join(__dirname, 'courses.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from the same directory

// setup db file if missing
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], contacts: [], analytics: { totalVisits: 0 } }, null, 2));
} else {
    // Ensure analytics exists in DB
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if(!db.analytics) {
        db.analytics = { totalVisits: 0 };
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    }
}

// Helper to read DB
const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

// Helper to write DB
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// track page visits
app.use((req, res, next) => {
    // ignore assets, only count html or root loads
    if (req.method === 'GET' && (req.url === '/' || req.url.endsWith('.html'))) {
        try {
            const db = readDB();
            db.analytics.totalVisits += 1;
            writeDB(db);
        } catch(e) {
            console.error("Analytics Error:", e);
        }
    }
    next();
});

// --- routes ---

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    const db = readDB();
    const user = db.users.find(u => u.email === email);
    
    if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.password !== password) {
        return res.status(401).json({ error: "Invalid email or password" });
    }

    // Don't send password back to client
    const { password: _, ...userWithoutPassword } = user;
    res.json({ message: "Login successful", user: userWithoutPassword });
});

// register user
app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    const db = readDB();
    const existingUser = db.users.find(u => u.email === email);
    
    if (existingUser) {
        return res.status(409).json({ error: "An account with this email already exists." });
    }

    const newUser = { 
        id: Date.now().toString(), 
        name,
        email, 
        password, // Plain text for prototype MVP only
        createdAt: new Date().toISOString()
    };
    
    db.users.push(newUser);
    writeDB(db);

    const { password: _, ...userWithoutPassword } = newUser;
    res.json({ message: "Registration successful", user: userWithoutPassword });
});

// contact form submission
app.post('/api/contact', (req, res) => {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
        return res.status(400).json({ error: "All fields are required" });
    }

    const db = readDB();
    const newContact = {
        id: Date.now().toString(),
        name,
        email,
        message,
        date: new Date().toISOString()
    };
    
    db.contacts.push(newContact);
    writeDB(db);

    res.json({ message: "Contact form submitted successfully!", contact: newContact });
});

// fetch all courses
app.get('/api/courses', (req, res) => {
    try {
        const courses = JSON.parse(fs.readFileSync(path.join(__dirname, 'courses.json'), 'utf8'));
        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch courses data' });
    }
});

// fetch kids courses
app.get('/api/shikshak-courses', (req, res) => {
    try {
        const courses = JSON.parse(fs.readFileSync(path.join(__dirname, 'shikshak-courses.json'), 'utf8'));
        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch shikshak courses data' });
    }
});

// fetch course details
app.get('/api/courses/:id', (req, res) => {
    try {
        if (!fs.existsSync(COURSES_FILE)) {
            return res.status(404).json({ error: "Course not found" });
        }
        const courses = JSON.parse(fs.readFileSync(COURSES_FILE, 'utf8'));
        const course = courses.find(c => c.id === req.params.id);
        
        if (course) {
            res.json(course);
        } else {
            res.status(404).json({ error: "Course not found" });
        }
    } catch (err) {
        res.status(500).json({ error: "Failed to load course" });
    }
});

// analytics
app.get('/api/analytics', (req, res) => {
    try {
        const db = readDB();
        res.json({ totalVisits: db.analytics.totalVisits });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// mock payment flow
app.post('/api/payment/checkout', (req, res) => {
    const { courseId, userId, amount, cardNumber } = req.body;
    
    // Simple validation
    if (!courseId || !amount || !cardNumber) {
        return res.status(400).json({ success: false, error: "Missing payment details" });
    }
    
    // Simulate processing delay
    setTimeout(() => {
        if (cardNumber.length < 12) {
            return res.status(400).json({ success: false, error: "Invalid card number" });
        }
        // Successful payment mock
        res.json({ 
            success: true, 
            transactionId: 'TXN' + Date.now(),
            message: "Payment processed successfully!" 
        });
    }, 1500);
});

// Start Server

// chatbot api
app.post('/api/chat', async (req, res) => {
    const { message, lang } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    // check for api key
    if (!process.env.GEMINI_API_KEY) {
        setTimeout(() => {
            res.json({
                response: "⚠️ [Admin Required] Mujhe aapse baat karne ke liye Gemini API Key ki zarurat hai. Kripya backend mein .env file banayein aur GEMINI_API_KEY set karein, phir server restart karein!"
            });
        }, 1500);
        return;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const languageInstruction = lang === 'hi' ? 'Respond completely in Hindi (using Roman Hindi or Devanagari based on the user prompt).' : 
                                    lang === 'ta' ? 'Respond completely in Tamil.' : 
                                    'Respond in English.';

        const systemInstruction = `You are an expert EdTech AI Mentor for Tech Indro. 
Your goal is to help students learn Coding, DSA, Web Dev, Hackathons, and tech concepts.
Always be extremely encouraging, professional, and clear.
Provide code snippets where helpful.
${languageInstruction}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
            }
        });

        res.json({ response: response.text });
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "Failed to connect to AI Mentor." });
    }
});

app.listen(PORT, () => {
    // Only log the link on the first worker to avoid terminal spam
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

} // End of cluster.isPrimary else block
