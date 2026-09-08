# <div align="center">🌐 TECH INDRO WEB PLATFORM</div>

### <div align="center">India's Premier AI-Powered Learning & EdTech Web Ecosystem</div>

<div align="center">

[![Live Website](https://img.shields.io/badge/Live%20Website-tech--indro.vercel.app-6366f1?style=for-the-badge&logo=vercel)](https://tech-indro-website.vercel.app)
[![Learners](https://img.shields.io/badge/Learners-1.2L%2B%20Enrolled-10b981?style=for-the-badge&logo=googleclassroom)](#)
[![Rating](https://img.shields.io/badge/Rating-4.8%20★-f59e0b?style=for-the-badge&logo=star)](#)
[![Security](https://img.shields.io/badge/Security-WAF%20Hardened-ef4444?style=for-the-badge&logo=shield)](#)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## 📌 Overview

**Tech Indro Web Platform** is an enterprise-grade EdTech web portal designed to democratize technological education across India. It empowers students, career-switchers, and tech enthusiasts to master **Artificial Intelligence, Ethical Hacking, Robotics, and Full-Stack Engineering** directly from the browser — without requiring high-end laptops or prior technical experience.

---

## ✨ Platform Features & Capabilities

- 🤖 **24/7 AI Shikshak (Voice Doubts)**: Conversational audio/speech recognition and speech synthesis doubt solver with formatted code explanations.
- 📚 **Comprehensive Course Batches**: Interactive syllabus, instructor profiles, and structured curriculum modules.
- 🏆 **TSOC (Tech Season of Code)**: Open-source project fellowship featuring production repositories:
  - *[GhostPose](https://github.com/techindro/GhostPose-Through-Wall-Wi-Fi-3D-Sensing)* — Through-Wall Wi-Fi 3D Sensing.
  - *[Khicho-Chatbots](https://github.com/techindro/Khicho-Chatbots)* — Multilingual AI conversational agents.
- 💻 **IndroLabs Cloud IDE**: Real-time browser compiler for Python, JavaScript, and HTML/CSS.
- 📝 **Adaptive Test Series & Mock Exams**: Full quiz portal with instant answer keys, percentile ranking, and deep analytics.
- 🛡️ **Cybersecurity Defense Sandbox**: Ethical hacking playground with real-time defense simulations and vulnerability analysis.
- 🌓 **Universal Dark/Light Theme**: Persistent theme switching with smooth transitions.
- 🔔 **Notification Center**: Live announcements, batch alerts, and mock test reminders.

---

## 💻 Tech Stack & Architecture

- **Frontend**: Lightweight Zero-Build Vanilla HTML5, CSS3 Custom Properties, Modern ES6+ JavaScript, Lucide Icons.
- **Backend API**: Node.js & Express.js (`server.js`) with fail-safe anti-crash handlers.
- **Voice Engine**: Web Speech API (`SpeechRecognition` & `SpeechSynthesis`).
- **Security**: Helmet, sliding-window rate limiters, sandbox execution validator, payload bounds.
- **Deployment**: Vercel Serverless & CDN Edge.

---

## 🛡️ Cybersecurity & Anti-Crash Hardening

Tech Indro is built with a security-first and high-availability architecture:

1. **Sliding-Window Rate Limiting**: Dedicated limiters for Authentication (`5 req / 15 min`), AI Chat (`20 req / min`), and Code Execution (`15 req / min`).
2. **Crash-Proof Error Handling**: Unhandled promise rejections and uncaught exceptions are caught gracefully, keeping the server at 100% uptime.
3. **Execution Sandbox**: Blocks dangerous shell escapes and malicious subprocess spawning in student compiler runs.
4. **Content Security Policy & Headers**: Full XSS, clickjacking, and MIME-sniffing protection via HTTP response headers.

---

## 🚀 Getting Started

### Local Setup
```bash
# 1. Clone the repository
git clone https://github.com/techindro/tech-indro-website.git
cd tech-indro-website/tech-indro-website

# 2. Install dependencies
npm install

# 3. Start the Express server
npm start
```

Visit `http://localhost:5000` to access the full web application.

---

## 🗺️ Project Structure

```
tech-indro-website/
├── index.html               # Main landing page (Hero, features & batch catalog)
├── programs.html            # Course programs & curriculum
├── tsoc.html                # Tech Season of Code project hub
├── indrolabs.html           # In-browser compiler & cloud IDE
├── quiz.html                # Live mock test series & quiz engine
├── cyber-playground.html    # Cybersecurity & ethical hacking labs
├── bookmarks.html           # Study notes, flashcards & revision bookmarks
├── portfolio.html           # Student showcases & projects
├── server.js                # Hardened Express backend & API
├── theme-notifications.js   # Universal theme engine & notification center
├── styles.css               # Core styling tokens & animations
└── vercel.json              # Production routing & edge caching headers
```

---

## 📄 Leadership & License

- **Founder & Architect**: **Shubham Patel** (Tech Indro)
- **Live Deployment**: [tech-indro-website.vercel.app](https://tech-indro-website.vercel.app)
- **License**: [MIT License](LICENSE) © 2026 Tech Indro. All rights reserved.
