# <div align="center">🚀 TECH INDRO</div>
### <div align="center">India's First AI-Powered Learning Platform</div>

<div align="center">

[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Mobile%20Ready-ff6b35.svg)](#)
[![Learners](https://img.shields.io/badge/Learners-1.2L%2B-4f46e5.svg)](#)
[![Rating](https://img.shields.io/badge/Rating-4.8%20★-f59e0b.svg)](#)
[![AI Mentors](https://img.shields.io/badge/AI%20Mentors-24%2F7%20Available-10b981.svg)](#)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-333333.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## 📌 Overview

**Tech Indro** is India's leading AI-powered educational technology platform, purpose-built to take learners from **zero to one** in modern tech skills — including Artificial Intelligence, Robotics, Full-Stack Development, and Cloud Engineering. 

Designed for everyone (**IT, Non-IT, beginners, and students of any age**), Tech Indro requires no expensive laptop or prior coding background. Learning is guided by intelligent, 24/7 personal AI assistants capable of voice-to-voice interaction in 50+ languages.

---

## 🌟 Key Highlights & Features

### 🤖 24/7 Conversational AI Mentor (`ai-mentor.html` / `shikshak.html`)
- **Voice-to-Voice Interaction**: Full Web Speech API integration supporting real-time voice speech input (mic) and natural voice output (speaking answers).
- **Gemini-Style Clean UI**: Markdown parsing with zero raw symbols, sleek dark syntax-highlighted code cards with 1-click **Copy Code** functionality.
- **Specialized AI Personas**: Coding Mentor, Career Coach, and Bug Fixer agents.

### 💻 IndroLabs / Cyber Playground (`cyber-playground.html` / `playground.html`)
- Interactive in-browser compiler supporting Python, JavaScript, HTML/CSS, and C++.
- Hands-on project sandbox allowing students to code directly on mobile or desktop without local environment configuration.

### 🏆 TSOC (Tech Season of Code) (`tsoc.html`, `tsoc-apply.html`)
- Structured fellowship and internship programs connecting aspiring developers with real-world open-source and corporate tech projects.

### 📝 Test Series & Adaptive Quizzes (`quiz.html`)
- Comprehensive interactive quizzes with real-time score tracking, category filters, countdown timers, and answer explanations.

### 📊 Comprehensive User Portals
- **Student Dashboard (`dashboard.html`)**: Track enrolled courses, learning progress, certificates, and code labs.
- **Parent Panel (`parent-panel.html`)**: Transparent learning analytics and progress updates for parents.
- **Admin CMS & Analytics (`admin-cms.html`, `admin-analytics.html`)**: Real-time management of courses, inquiries, and student enrollment metrics.

---

## 🏗️ Technical Architecture & Tech Stack

Tech Indro is engineered for maximum speed, zero client-side bloat, and universal device compatibility.

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend UI** | HTML5, Modern CSS3, ES6+ JavaScript | Ultra-fast load times, responsive mobile-first layouts, custom design system |
| **Icons & Typography** | Lucide Icons, Inter & Outfit Fonts | Clean vector icons, accessible typography |
| **AI Formatting Engine** | Marked.js + Custom Clean Parser | Google Gemini-style response formatting with syntax blocks |
| **Voice Engine** | Web Speech Recognition & SpeechSynthesis | Natural multi-language voice conversations |
| **Backend API** | Node.js & Express.js (`server.js`) | Lightweight REST API server serving pages and handling AI/user operations |
| **Data Layer** | JSON File Datastore | Local persistence for courses, user accounts, and test questions |

---

## 📂 Project Directory Structure

```text
tech-indro-website/
├── index.html                  # Main landing page with Hero, Stats & Course categories
├── programs.html               # All educational courses & tracks catalog
├── course-details.html         # Individual course overview, syllabus, & enrollment
├── ai-mentor.html              # 24/7 Conversational AI Mentor (Voice + Text)
├── cyber-playground.html       # IndroLabs in-browser online code compiler
├── tsoc.html                   # Tech Season of Code program page
├── tsoc-apply.html             # Student fellowship application portal
├── tsoc-mentor-apply.html      # Industry mentor application portal
├── quiz.html                   # Interactive Test Series & Quiz engine
├── dashboard.html              # Authenticated student learning dashboard
├── parent-panel.html           # Parent monitoring and progress panel
├── admin-cms.html              # Content management system for admins
├── admin-analytics.html        # Platform metrics and analytics dashboard
├── login.html                  # User login and registration portal
├── checkout.html               # Course enrollment & payment flow
├── server.js                   # Express backend server & REST API
├── api-client.js               # Frontend API client library
├── style.css                   # Global platform stylesheet & design tokens
├── courses.json                # Course catalog database
├── questions.json              # Quiz and test question bank
├── database.json               # User account & enrollment records
└── assets/                     # Brand logos, avatars, and thumbnails
```

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- [Node.js](https://nodejs.org/) (version 16.x or higher)
- `npm` (bundled with Node.js)

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/techindro/tech-indro-website.git
   cd tech-indro-website
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   # or run directly:
   node server.js
   ```

4. **Access the application:**
   Open your browser and navigate to:
   ```text
   http://localhost:5000
   ```

---

## 📱 Mobile App & Google Play Store Readiness

The platform's frontend is architected to seamlessly wrap into a native mobile application using **Capacitor** or **React Native / Flutter**:

- **Single Shared Backend**: Website and Mobile App share the exact same `server.js` backend, user database, and course catalog.
- **Unified Login**: An account created on the website works instantly on the mobile app.
- **Play Store Deliverables**: Can be packaged directly into a signed `.aab` (Android App Bundle) or `.apk` for distribution on the Google Play Store.

---

## 🗺️ Future Plans & Strategic Roadmap

Tech Indro is dedicated to continuous evolution, setting benchmarks for AI-first, democratized technical education across India and globally. Here is our strategic roadmap for upcoming quarters:

### 📱 Phase 1: Mobile App & Play Store Launch (Q1 - Q2 2026)
- [ ] **Native Android & iOS Build**: Packaging current frontend with Capacitor into official Google Play Store (`.aab`) and Apple App Store packages.
- [ ] **Push Notifications Engine**: Timely mobile alerts for daily coding challenges, test series schedules, and live mentoring reminders.
- [ ] **Offline Mode & Resource Caching**: Capability to access course notes, code cheat-sheets, and syllabus without active cellular data.

### 🧠 Phase 2: Multi-Modal AI Tutor 2.0 (Q2 2026)
- [ ] **Camera-Based Instant Doubt Solver**: Snap a picture of handwritten notes, textbook questions, or circuit schematics for step-by-step AI visual diagnosis.
- [ ] **Live Voice Coding Assistant**: Hands-free real-time conversational coding partner inside IndroLabs that guides debugging line by line.
- [ ] **Expanded Regional Languages**: Voice speech models trained in 20+ Indian regional languages (Hindi, Hinglish, Tamil, Telugu, Bengali, Marathi, Gujarati, etc.).

### 🗄️ Phase 3: Enterprise Cloud & Scalability (Q3 2026)
- [ ] **Database Modernization**: Seamless migration from flat-file JSON datastores to a distributed **PostgreSQL** relational database with **Prisma ORM**.
- [ ] **In-Memory Caching (Redis)**: Sub-millisecond response times for live leaderboard rankings, quiz timers, and session state.
- [ ] **Bank-Grade Security**: Industry-standard JWT (JSON Web Tokens) with refresh-token rotation and multi-factor authentication (MFA).

### 💼 Phase 4: AI Placement & Career Matchmaker (Q3 - Q4 2026)
- [ ] **Automated Portfolio Generator**: Turns student completed projects from IndroLabs into live verifiable portfolio websites.
- [ ] **Hiring Partner Integration**: Direct pipeline connecting top performers in TSOC and Test Series with leading tech startups and MNC recruiters.
- [ ] **Verifiable Digital Credentials**: Tamper-proof, cryptographically signed course completion certificates shareable on LinkedIn.

---

## 👨‍💼 Leadership & Vision

> *"AI is not replacing humans, it's augmenting capabilities. Together, humans and AI can achieve the impossible."*

- **Founder & CEO**: Shubham Patel
- **Organization**: Tech Indro — Democratizing Artificial Intelligence, Robotics, and Advanced Software Engineering for learners across all age groups and backgrounds.

---

## 📄 License & Terms

This project is licensed under the **MIT License** — permitting free personal, educational, and commercial usage, modification, distribution, and private use, provided that the original copyright notice and permission notice are preserved.

```text
MIT License

Copyright (c) 2026 Tech Indro (Shubham Patel)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

For full legal terms and conditions, refer to the [LICENSE](LICENSE) file.  
Copyright © 2026 **Tech Indro**. All rights reserved.
