<div align="center">
  <h1>Tech Indro</h1>
  <p>India's leading platform for Robotics education, empowering over 50,000+ students.</p>
</div>

---

## 📌 Overview
Tech Indro is a full-stack educational platform built to deliver an interactive and seamless learning experience. We focus heavily on core web technologies to keep things lightning fast, avoiding bloated frontend frameworks where they aren't strictly necessary. 

## ✨ Key Features
- **Fluid & Responsive UI:** Fully custom responsive design that scales perfectly across devices.
- **Course Catalog:** Dynamic course listings categorized by skill level and topic.
- **Interactive Labs:** Custom-built lab environments like the ISRO Lab to give students hands-on practice.
- **Student Dashboard:** Track progress, view certificates, and manage enrolled programs.
- **Testimonials & Social Proof:** Real-world feedback from our growing student base.

## 🏗️ System Architecture
We intentionally kept the stack lightweight and dependency-free on the client side to ensure maximum performance. 

- **Frontend Tier:** Built with raw HTML5, CSS3, and vanilla JavaScript. We utilize modular JS files (`main.js`, `update-banners.js`, `revert_nav.js`) to handle DOM manipulation and interactive components without the overhead of React or Vue.
- **Backend API:** Powered by Node.js and Express.js. The `server.js` file handles routing, API endpoints, and static file serving.
- **Data Persistence:** For portability and speed during this phase of the project, we use a flat-file JSON architecture (`database.json`, `courses.json`). This acts as our primary data store for user records and course metadata.

## 💻 Tech Stack
- **Client:** HTML5, CSS3, Vanilla ES6+ JavaScript
- **Server:** Node.js, Express
- **Storage:** JSON File System

## 🚀 Getting Started

If you want to spin this up locally, just follow these quick steps:

1. **Clone the repo:**
   ```bash
   git clone https://github.com/techindro/tech-indro-website.git
   ```
2. **Install dependencies:**
   Make sure you have Node installed, then run:
   ```bash
   cd tech-indro-website
   npm install
   ```
3. **Boot the server:**
   ```bash
   npm start
   # or just run: node server.js
   ```
4. **View the app:** 
   Open `http://localhost:5000` in your browser.

## 🗺️ Roadmap
We've got a lot planned for the next few sprints:
- [ ] Migrate the JSON data store to a proper relational database (PostgreSQL).
- [ ] Set up secure JWT-based user authentication.
- [ ] Integrate a payment gateway for premium courses.
- [ ] Potentially migrate complex interactive views to a reactive framework if state management becomes too heavy.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
Copyright (c) 2024 Tech Indro
