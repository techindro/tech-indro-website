// Tech Indro - Real Backend Integration
// This file communicates with our custom Node.js Express server running on port 5000.
// It replaces the previous LocalStorage mock.

const API_URL = "/api";

document.addEventListener("DOMContentLoaded", () => {
    
    // --- LOGIN & REGISTER LOGIC ---
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            const submitBtn = document.getElementById("loginBtn");
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "Authenticating...";
            
            try {
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem("techIndroUser", JSON.stringify(data.user));
                    window.location.href = "index.html";
                } else {
                    alert("Error: " + data.error);
                    submitBtn.innerText = originalText;
                }
            } catch (error) {
                console.error("Backend Error:", error);
                alert("Failed to connect to backend server.");
                submitBtn.innerText = originalText;
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("regName").value;
            const email = document.getElementById("regEmail").value;
            const password = document.getElementById("regPassword").value;

            const submitBtn = document.getElementById("registerBtn");
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "Creating Account...";
            
            try {
                const response = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem("techIndroUser", JSON.stringify(data.user));
                    alert("Account Created! Welcome to Tech Indro.");
                    window.location.href = "index.html";
                } else {
                    alert("Error: " + data.error);
                    submitBtn.innerText = originalText;
                }
            } catch (error) {
                console.error("Backend Error:", error);
                alert("Failed to connect to backend server.");
                submitBtn.innerText = originalText;
            }
        });
    }


    // --- CONTACT FORM LOGIC ---
    const contactForm = document.getElementById("contactForm");
    
    if (contactForm) {
        contactForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("contactName").value;
            const email = document.getElementById("contactEmail").value;
            const message = document.getElementById("contactMessage").value;

            const submitBtn = contactForm.querySelector("button[type='submit']");
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "Sending to Database...";
            
            try {
                const response = await fetch(`${API_URL}/contact`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, message })
                });

                const data = await response.json();

                if (response.ok) {
                    contactForm.reset();
                    submitBtn.innerText = "Message Sent to DB!";
                    submitBtn.style.backgroundColor = "var(--secondary)";
                    
                    setTimeout(() => {
                        submitBtn.innerText = originalText;
                        submitBtn.style.backgroundColor = "var(--primary)";
                    }, 3000);
                } else {
                    alert("Error: " + data.error);
                    submitBtn.innerText = originalText;
                }
            } catch (error) {
                console.error("Backend Error:", error);
                alert("Failed to connect to backend server. Is it running?");
                submitBtn.innerText = originalText;
            }
        });
    }

    // --- DYNAMIC NAV ---
    const userJson = localStorage.getItem("techIndroUser");
    if (userJson) {
        const user = JSON.parse(userJson);
        const loginLinks = document.querySelectorAll(".login-btn");
        
        loginLinks.forEach(link => {
            link.innerText = "My Dashboard";
            link.href = "#"; 
            link.addEventListener("click", (e) => {
                e.preventDefault();
                if(confirm(`Hi ${user.name}! Would you like to log out?`)) {
                    localStorage.removeItem("techIndroUser");
                    window.location.reload();
                }
            });
        });
    }
});
