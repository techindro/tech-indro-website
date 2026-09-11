// Initialize Lucide Icons
lucide.createIcons();

// Universal Right-Side Navigation Drawer System
function ensureNavDrawer() {
    if (document.getElementById('navDrawer')) return;

    const overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';
    overlay.id = 'drawerOverlay';
    overlay.onclick = () => window.closeNavDrawer && window.closeNavDrawer();

    const drawer = document.createElement('aside');
    drawer.className = 'nav-drawer';
    drawer.id = 'navDrawer';
    drawer.setAttribute('aria-label', 'Main Navigation Drawer');
    drawer.innerHTML = `
        <div class="drawer-header">
            <a href="index.html" class="drawer-brand" onclick="closeNavDrawer()">
                <img src="assets/logo.svg" alt="Tech Indro Logo" class="drawer-logo-img">
                <span class="drawer-brand-text">TECH INDRO</span>
            </a>
            <button class="drawer-close-btn" onclick="closeNavDrawer()" aria-label="Close menu" title="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        <div class="drawer-body">
            <div class="drawer-section-title">MAIN NAVIGATION</div>
            <div class="drawer-primary-links">
                <a href="programs.html" class="drawer-card" onclick="closeNavDrawer()">
                    <div class="drawer-card-icon" style="background: linear-gradient(135deg, #ff6b35, #f7931e);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                    </div>
                    <div class="drawer-card-info">
                        <div class="drawer-card-title-row">
                            <span class="drawer-card-title">Courses</span>
                            <span class="drawer-badge">Explore All</span>
                        </div>
                        <span class="drawer-card-desc">AI, Robotics, Ethical Hacking & Full Stack</span>
                    </div>
                    <svg class="drawer-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </a>
                <a href="index.html#about" class="drawer-card" onclick="closeNavDrawer()">
                    <div class="drawer-card-icon" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                    </div>
                    <div class="drawer-card-info">
                        <div class="drawer-card-title-row">
                            <span class="drawer-card-title">About us</span>
                            <span class="drawer-badge" style="background: #3b82f6;">Our Story</span>
                        </div>
                        <span class="drawer-card-desc">Vision, pedagogy & ecosystem for future leaders</span>
                    </div>
                    <svg class="drawer-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </a>
                <a href="support.html" class="drawer-card" onclick="closeNavDrawer()">
                    <div class="drawer-card-icon" style="background: linear-gradient(135deg, #10b981, #047857);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                    </div>
                    <div class="drawer-card-info">
                        <div class="drawer-card-title-row">
                            <span class="drawer-card-title">Contact</span>
                            <span class="drawer-badge live-badge">24/7 Live</span>
                        </div>
                        <span class="drawer-card-desc">Talk to counselors, call & WhatsApp support</span>
                    </div>
                    <svg class="drawer-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </a>
            </div>
            <div class="drawer-section-title" style="margin-top: 1rem;">MORE PLATFORM TOOLS</div>
            <ul class="drawer-links-list">
                <li>
                    <a href="tsoc.html" onclick="closeNavDrawer()">
                        <span class="drawer-icon-box tsoc-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
                                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
                                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
                                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
                            </svg>
                        </span>
                        <span style="font-weight: 600;">TSOC Fellowship</span>
                    </a>
                </li>
                <li>
                    <a href="cyber-playground.html" onclick="closeNavDrawer()">
                        <span class="drawer-icon-box compiler-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="4 17 10 11 4 5"></polyline>
                                <line x1="12" y1="19" x2="20" y2="19"></line>
                            </svg>
                        </span>
                        <span style="font-weight: 600;">IndroLabs Compiler & Labs</span>
                    </a>
                </li>
                <li>
                    <a href="quiz.html" onclick="closeNavDrawer()">
                        <span class="drawer-icon-box test-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <path d="m9 15 2 2 4-4"></path>
                            </svg>
                        </span>
                        <span style="font-weight: 600;">Tech Test Series</span>
                    </a>
                </li>
                <li>
                    <a href="shikshak.html" onclick="closeNavDrawer()">
                        <span class="drawer-icon-box bot-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 8V4H8"></path>
                                <rect width="16" height="12" x="4" y="8" rx="2"></rect>
                                <path d="M2 14h2"></path>
                                <path d="M20 14h2"></path>
                                <path d="M15 13v2"></path>
                                <path d="M9 13v2"></path>
                            </svg>
                        </span>
                        <span style="font-weight: 600;">Multilingual AI Mentor</span>
                    </a>
                </li>
            </ul>
            <div class="drawer-contact-card">
                <div class="contact-card-header">Need instant admission guidance?</div>
                <p class="contact-card-sub">Directly connect with our academic counselors.</p>
                <div class="contact-action-row">
                    <a href="tel:+917007896695" class="drawer-contact-btn tel-btn">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        <span>+91 7007896695</span>
                    </a>
                    <a href="https://wa.me/917007896695" target="_blank" rel="noopener noreferrer" class="drawer-contact-btn wa-btn">
                        <span>WhatsApp Chat</span>
                    </a>
                </div>
            </div>
        </div>
        <div class="drawer-footer">
            <a href="login.html" class="drawer-login-btn" onclick="closeNavDrawer()">
                <span>Student Login / Sign Up</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
            </a>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
}

window.openNavDrawer = function() {
    ensureNavDrawer();
    const drawer = document.getElementById('navDrawer');
    const overlay = document.getElementById('drawerOverlay');
    const btns = document.querySelectorAll('.hamburger-btn, .hamburger');
    if (drawer) drawer.classList.add('active');
    if (overlay) overlay.classList.add('active');
    btns.forEach(b => b.classList.add('active'));
    document.body.style.overflow = 'hidden';
};

window.closeNavDrawer = function() {
    const drawer = document.getElementById('navDrawer');
    const overlay = document.getElementById('drawerOverlay');
    const btns = document.querySelectorAll('.hamburger-btn, .hamburger');
    if (drawer) drawer.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    btns.forEach(b => b.classList.remove('active'));
    document.body.style.overflow = '';
};

window.toggleNavDrawer = function() {
    const drawer = document.getElementById('navDrawer');
    if (drawer && drawer.classList.contains('active')) {
        window.closeNavDrawer();
    } else {
        window.openNavDrawer();
    }
};

document.addEventListener('click', (e) => {
    const btn = e.target.closest('.hamburger-btn, .hamburger');
    if (btn) {
        e.preventDefault();
        window.toggleNavDrawer();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.closeNavDrawer();
});
        
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

    // Auto-mount Cookie Consent Engine if not yet loaded
    if (!window.TechIndroCookies && !document.querySelector('script[src*="cookie-consent.js"]')) {
        const s = document.createElement('script');
        s.src = 'cookie-consent.js';
        s.defer = true;
        document.head.appendChild(s);
    }
});
