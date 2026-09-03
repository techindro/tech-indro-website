// Initialize Lucide Icons
lucide.createIcons();

// Mobile menu toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
        
if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        hamburger.classList.toggle('active');
    });
}
        
// Header scroll effect
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Scroll animations
const fadeInOnScroll = () => {
    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        if (elementTop < windowHeight - 50) {
            element.classList.add('visible');
        }
    });
};
        
window.addEventListener('scroll', fadeInOnScroll);
window.addEventListener('load', fadeInOnScroll);

// User Session Management
document.addEventListener('DOMContentLoaded', () => {
    try {
        const rawUser = localStorage.getItem('techIndroUser');
        if (rawUser) {
            const user = JSON.parse(rawUser);
            const loginBtns = document.querySelectorAll('.login-btn, a[href="login.html"]');
            loginBtns.forEach(btn => {
                if (!btn.closest('#authFooter') && !btn.classList.contains('back-home')) {
                    btn.innerHTML = `Dashboard (${user.name ? user.name.split(' ')[0] : 'Student'})`;
                    btn.href = 'dashboard.html';
                    btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                    btn.style.color = '#ffffff';
                }
            });
            if (window.lucide) lucide.createIcons();
        }
    } catch(e) {}
});
