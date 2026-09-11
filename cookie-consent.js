/**
 * Tech Indro - Universal Cookie Consent & Privacy Preference Center
 * GDPR, DPDP (India), and CCPA compliant cookie engine.
 * Fully responsive, glassmorphic UI, with Dark/Light theme synchronization.
 */

(function () {
    'use strict';

    // Avoid double initialization
    if (window.TechIndroCookies) return;

    const COOKIE_CONSENT_KEY = 'techindro_cookie_consent';
    const COOKIE_NAME = 'techindro_consent_level';
    const CONSENT_VERSION = '2026.1';

    // Cookie Utilities
    const CookieUtils = {
        set: function (name, value, days) {
            let expires = '';
            if (days) {
                const date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = '; expires=' + date.toUTCString();
            }
            const isSecure = window.location.protocol === 'https:' ? '; Secure' : '';
            document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=Lax' + isSecure;
        },

        get: function (name) {
            const nameEQ = encodeURIComponent(name) + '=';
            const ca = document.cookie.split(';');
            for (let i = 0; i < ca.length; i++) {
                let c = ca[i];
                while (c.charAt(0) === ' ') c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
            }
            return null;
        },

        remove: function (name) {
            document.cookie = encodeURIComponent(name) + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax;';
        }
    };

    // Stylesheet definition
    const styleContent = `
        /* Tech Indro Cookie Consent Banner & Modal Styles */
        :root {
            --ti-cookie-bg: rgba(255, 255, 255, 0.94);
            --ti-cookie-border: rgba(226, 232, 240, 0.9);
            --ti-cookie-text: #0f172a;
            --ti-cookie-text-muted: #64748b;
            --ti-cookie-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.8) inset;
            --ti-cookie-accent: #ff6b35;
            --ti-cookie-accent-hover: #ea580c;
            --ti-cookie-switch-bg: #cbd5e1;
            --ti-cookie-switch-active: #10b981;
        }

        [data-theme="dark"] {
            --ti-cookie-bg: rgba(15, 23, 42, 0.94);
            --ti-cookie-border: rgba(51, 65, 85, 0.9);
            --ti-cookie-text: #f8fafc;
            --ti-cookie-text-muted: #94a3b8;
            --ti-cookie-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
            --ti-cookie-switch-bg: #334155;
            --ti-cookie-switch-active: #10b981;
        }

        /* Floating Cookie Banner */
        .ti-cookie-banner {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%) translateY(140%);
            width: calc(100% - 36px);
            max-width: 960px;
            background: var(--ti-cookie-bg);
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            border: 1px solid var(--ti-cookie-border);
            border-radius: 20px;
            box-shadow: var(--ti-cookie-shadow);
            padding: 22px 26px;
            z-index: 99998;
            transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease;
            opacity: 0;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: var(--ti-cookie-text);
            box-sizing: border-box;
        }

        .ti-cookie-banner.ti-cookie-show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }

        .ti-cookie-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
            flex-wrap: wrap;
        }

        .ti-cookie-body {
            display: flex;
            align-items: flex-start;
            gap: 18px;
            flex: 1;
            min-width: 290px;
        }

        .ti-cookie-icon-wrapper {
            width: 52px;
            height: 52px;
            min-width: 52px;
            border-radius: 14px;
            background: linear-gradient(135deg, rgba(255, 107, 53, 0.15), rgba(245, 158, 11, 0.22));
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            border: 1px solid rgba(255, 107, 53, 0.25);
            box-shadow: 0 4px 12px rgba(255, 107, 53, 0.15);
            animation: tiCookiePulse 3s infinite ease-in-out;
        }

        @keyframes tiCookiePulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }

        .ti-cookie-text h4 {
            margin: 0 0 6px 0;
            font-size: 1.12rem;
            font-weight: 700;
            color: var(--ti-cookie-text);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .ti-cookie-text p {
            margin: 0;
            font-size: 0.92rem;
            line-height: 1.55;
            color: var(--ti-cookie-text-muted);
        }

        .ti-cookie-text a {
            color: var(--ti-cookie-accent);
            text-decoration: underline;
            text-underline-offset: 3px;
            font-weight: 600;
            transition: color 0.2s;
        }

        .ti-cookie-text a:hover {
            color: var(--ti-cookie-accent-hover);
        }

        .ti-cookie-actions {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .ti-btn {
            cursor: pointer;
            border: none;
            padding: 10px 18px;
            border-radius: 12px;
            font-size: 0.92rem;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 0.2s ease;
            text-decoration: none;
            outline: none;
            font-family: inherit;
        }

        .ti-btn:active {
            transform: scale(0.97);
        }

        .ti-btn-primary {
            background: linear-gradient(135deg, #ff6b35, #ea580c);
            color: #ffffff;
            box-shadow: 0 4px 14px rgba(255, 107, 53, 0.35);
        }

        .ti-btn-primary:hover {
            background: linear-gradient(135deg, #ff7a48, #f97316);
            transform: translateY(-2px);
            box-shadow: 0 6px 18px rgba(255, 107, 53, 0.45);
        }

        .ti-btn-secondary {
            background: rgba(100, 116, 139, 0.12);
            color: var(--ti-cookie-text);
            border: 1px solid var(--ti-cookie-border);
        }

        .ti-btn-secondary:hover {
            background: rgba(100, 116, 139, 0.2);
            transform: translateY(-2px);
        }

        .ti-btn-outline {
            background: transparent;
            color: var(--ti-cookie-text-muted);
            border: 1px dashed var(--ti-cookie-border);
        }

        .ti-btn-outline:hover {
            color: var(--ti-cookie-accent);
            border-color: var(--ti-cookie-accent);
            background: rgba(255, 107, 53, 0.08);
        }

        /* Cookie Preferences Modal Backdrop */
        .ti-cookie-modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 18px;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease;
            box-sizing: border-box;
        }

        .ti-cookie-modal-backdrop.ti-modal-open {
            opacity: 1;
            visibility: visible;
        }

        .ti-cookie-modal {
            background: var(--ti-cookie-bg);
            border: 1px solid var(--ti-cookie-border);
            border-radius: 24px;
            max-width: 620px;
            width: 100%;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: var(--ti-cookie-shadow);
            transform: scale(0.95) translateY(20px);
            transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            color: var(--ti-cookie-text);
            overflow: hidden;
            font-family: inherit;
        }

        .ti-cookie-modal-backdrop.ti-modal-open .ti-cookie-modal {
            transform: scale(1) translateY(0);
        }

        .ti-modal-header {
            padding: 24px 28px 16px;
            border-bottom: 1px solid var(--ti-cookie-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .ti-modal-header h3 {
            margin: 0;
            font-size: 1.35rem;
            font-weight: 800;
            color: var(--ti-cookie-text);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .ti-modal-close-btn {
            background: transparent;
            border: none;
            color: var(--ti-cookie-text-muted);
            font-size: 24px;
            cursor: pointer;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s, color 0.2s;
            line-height: 1;
        }

        .ti-modal-close-btn:hover {
            background: rgba(100, 116, 139, 0.15);
            color: var(--ti-cookie-text);
        }

        .ti-modal-body {
            padding: 20px 28px;
            overflow-y: auto;
            flex: 1;
        }

        .ti-modal-intro {
            font-size: 0.92rem;
            line-height: 1.6;
            color: var(--ti-cookie-text-muted);
            margin: 0 0 20px 0;
        }

        .ti-cookie-category {
            background: rgba(100, 116, 139, 0.05);
            border: 1px solid var(--ti-cookie-border);
            border-radius: 16px;
            padding: 16px 20px;
            margin-bottom: 14px;
            transition: border-color 0.2s;
        }

        .ti-cookie-category:hover {
            border-color: rgba(255, 107, 53, 0.3);
        }

        .ti-category-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 8px;
        }

        .ti-category-title-group {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .ti-category-title {
            font-weight: 700;
            font-size: 1.02rem;
            color: var(--ti-cookie-text);
            margin: 0;
        }

        .ti-badge-always-active {
            font-size: 0.72rem;
            background: rgba(16, 185, 129, 0.15);
            color: #059669;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 20px;
            letter-spacing: 0.3px;
            text-transform: uppercase;
        }

        .ti-category-desc {
            margin: 0;
            font-size: 0.86rem;
            color: var(--ti-cookie-text-muted);
            line-height: 1.5;
        }

        /* Toggle switch */
        .ti-switch {
            position: relative;
            display: inline-block;
            width: 46px;
            height: 26px;
            flex-shrink: 0;
        }

        .ti-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .ti-slider {
            position: absolute;
            cursor: pointer;
            inset: 0;
            background-color: var(--ti-cookie-switch-bg);
            transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            border-radius: 34px;
        }

        .ti-slider:before {
            position: absolute;
            content: "";
            height: 20px;
            width: 20px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            border-radius: 50%;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        .ti-switch input:checked + .ti-slider {
            background-color: var(--ti-cookie-switch-active);
        }

        .ti-switch input:checked + .ti-slider:before {
            transform: translateX(20px);
        }

        .ti-switch input:disabled + .ti-slider {
            opacity: 0.7;
            cursor: not-allowed;
        }

        .ti-modal-footer {
            padding: 16px 28px 24px;
            border-top: 1px solid var(--ti-cookie-border);
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 12px;
            flex-wrap: wrap;
            background: rgba(100, 116, 139, 0.02);
        }

        @media (max-width: 768px) {
            .ti-cookie-banner {
                bottom: 14px;
                width: calc(100% - 24px);
                padding: 18px;
            }
            .ti-cookie-content {
                flex-direction: column;
                align-items: stretch;
            }
            .ti-cookie-actions {
                flex-direction: column;
                width: 100%;
            }
            .ti-cookie-actions .ti-btn {
                width: 100%;
            }
            .ti-modal-header, .ti-modal-body, .ti-modal-footer {
                padding-left: 18px;
                padding-right: 18px;
            }
        }
    `;

    function injectStyles() {
        if (document.getElementById('ti-cookie-styles')) return;
        const style = document.createElement('style');
        style.id = 'ti-cookie-styles';
        style.textContent = styleContent;
        document.head.appendChild(style);
    }

    // Default Preferences
    const defaultConsent = {
        necessary: true,
        functional: true,
        analytics: true,
        marketing: true,
        version: CONSENT_VERSION,
        timestamp: Date.now()
    };

    function loadSavedConsent() {
        try {
            const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed.necessary === 'boolean') {
                    return parsed;
                }
            }
        } catch (e) {}

        const cookieVal = CookieUtils.get(COOKIE_NAME);
        if (cookieVal) {
            try {
                return JSON.parse(cookieVal);
            } catch (e) {}
        }

        return null;
    }

    function saveConsent(consent) {
        consent.necessary = true; // Always true
        consent.version = CONSENT_VERSION;
        consent.timestamp = Date.now();

        try {
            localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
        } catch (e) {}

        // Save into HTTP cookie (valid for 365 days)
        CookieUtils.set(COOKIE_NAME, JSON.stringify(consent), 365);

        // Dispatch global custom event
        window.dispatchEvent(new CustomEvent('techindro:cookieConsent', {
            detail: consent
        }));
    }

    // DOM Elements
    let bannerEl = null;
    let modalEl = null;

    function buildBanner() {
        if (document.getElementById('techIndroCookieBanner')) return;

        const banner = document.createElement('aside');
        banner.id = 'techIndroCookieBanner';
        banner.className = 'ti-cookie-banner';
        banner.setAttribute('role', 'region');
        banner.setAttribute('aria-label', 'Cookie Consent Preferences');

        banner.innerHTML = `
            <div class="ti-cookie-content">
                <div class="ti-cookie-body">
                    <div class="ti-cookie-icon-wrapper" aria-hidden="true">🍪</div>
                    <div class="ti-cookie-text">
                        <h4>Cookie & Privacy Preferences</h4>
                        <p>
                            We use cookies and local cache to safeguard user logins, save your IndroLabs playground code, and optimize learning experiences. You can choose to accept all or customize your preferences anytime. Learn more in our <a href="privacy.html">Privacy Policy</a>.
                        </p>
                    </div>
                </div>
                <div class="ti-cookie-actions">
                    <button type="button" class="ti-btn ti-btn-primary" id="tiCookieAcceptAll">
                        <span>✓ Accept All</span>
                    </button>
                    <button type="button" class="ti-btn ti-btn-secondary" id="tiCookieRejectOptional">
                        <span>Reject Optional</span>
                    </button>
                    <button type="button" class="ti-btn ti-btn-outline" id="tiCookieCustomize">
                        <span>⚙ Preferences</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);
        bannerEl = banner;

        document.getElementById('tiCookieAcceptAll').addEventListener('click', () => {
            window.TechIndroCookies.acceptAll();
        });

        document.getElementById('tiCookieRejectOptional').addEventListener('click', () => {
            window.TechIndroCookies.rejectOptional();
        });

        document.getElementById('tiCookieCustomize').addEventListener('click', () => {
            window.TechIndroCookies.openPreferences();
        });
    }

    function buildModal() {
        if (document.getElementById('techIndroCookieModalBackdrop')) return;

        const backdrop = document.createElement('div');
        backdrop.id = 'techIndroCookieModalBackdrop';
        backdrop.className = 'ti-cookie-modal-backdrop';
        backdrop.setAttribute('role', 'dialog');
        backdrop.setAttribute('aria-modal', 'true');
        backdrop.setAttribute('aria-labelledby', 'tiCookieModalTitle');

        backdrop.innerHTML = `
            <div class="ti-cookie-modal">
                <div class="ti-modal-header">
                    <h3 id="tiCookieModalTitle">
                        <span aria-hidden="true">🍪</span> Cookie Consent Settings
                    </h3>
                    <button type="button" class="ti-modal-close-btn" id="tiCookieModalCloseBtn" aria-label="Close preferences modal">✕</button>
                </div>

                <div class="ti-modal-body">
                    <p class="ti-modal-intro">
                        Customize which cookies and data storage keys Tech Indro may use during your browsing session. Strictly necessary cookies are required to preserve session tokens and cyber defense protections.
                    </p>

                    <!-- Category 1: Strictly Necessary -->
                    <div class="ti-cookie-category">
                        <div class="ti-category-header">
                            <div class="ti-category-title-group">
                                <h5 class="ti-category-title">1. Strictly Necessary Cookies</h5>
                                <span class="ti-badge-always-active">Always Active</span>
                            </div>
                            <label class="ti-switch">
                                <input type="checkbox" checked disabled>
                                <span class="ti-slider"></span>
                            </label>
                        </div>
                        <p class="ti-category-desc">
                            Essential for student authentication, account logins (JWT), load-balancing, security rate limiters, and dark/light theme switching. Cannot be switched off.
                        </p>
                    </div>

                    <!-- Category 2: Functional & Labs -->
                    <div class="ti-cookie-category">
                        <div class="ti-category-header">
                            <div class="ti-category-title-group">
                                <h5 class="ti-category-title">2. Functional & Learning Experience</h5>
                            </div>
                            <label class="ti-switch">
                                <input type="checkbox" id="tiConsentFunctional" checked>
                                <span class="ti-slider"></span>
                            </label>
                        </div>
                        <p class="ti-category-desc">
                            Saves in-browser IndroLabs code editor scripts, compiler selections, voice speed settings for AI Shikshak, and quiz draft answers.
                        </p>
                    </div>

                    <!-- Category 3: Analytics & Performance -->
                    <div class="ti-cookie-category">
                        <div class="ti-category-header">
                            <div class="ti-category-title-group">
                                <h5 class="ti-category-title">3. Analytics & Diagnostics</h5>
                            </div>
                            <label class="ti-switch">
                                <input type="checkbox" id="tiConsentAnalytics" checked>
                                <span class="ti-slider"></span>
                            </label>
                        </div>
                        <p class="ti-category-desc">
                            Measures anonymous page loading latency, API stability, and feature usage to help us improve course video streaming and test series performance.
                        </p>
                    </div>

                    <!-- Category 4: Fellowship & Notifications -->
                    <div class="ti-cookie-category">
                        <div class="ti-category-header">
                            <div class="ti-category-title-group">
                                <h5 class="ti-category-title">4. Announcements & Fellowship Updates</h5>
                            </div>
                            <label class="ti-switch">
                                <input type="checkbox" id="tiConsentMarketing" checked>
                                <span class="ti-slider"></span>
                            </label>
                        </div>
                        <p class="ti-category-desc">
                            Personalizes notifications regarding TSOC fellowship deadlines, ISRO lab workshops, hackathon alerts, and student scholarship quotas.
                        </p>
                    </div>
                </div>

                <div class="ti-modal-footer">
                    <button type="button" class="ti-btn ti-btn-outline" id="tiModalRejectBtn">Reject Optional</button>
                    <button type="button" class="ti-btn ti-btn-secondary" id="tiModalAcceptAllBtn">Accept All</button>
                    <button type="button" class="ti-btn ti-btn-primary" id="tiModalSaveBtn">Save Preferences</button>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);
        modalEl = backdrop;

        // Modal event listeners
        document.getElementById('tiCookieModalCloseBtn').addEventListener('click', () => {
            window.TechIndroCookies.closePreferences();
        });

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                window.TechIndroCookies.closePreferences();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && backdrop.classList.contains('ti-modal-open')) {
                window.TechIndroCookies.closePreferences();
            }
        });

        document.getElementById('tiModalSaveBtn').addEventListener('click', () => {
            const functional = document.getElementById('tiConsentFunctional').checked;
            const analytics = document.getElementById('tiConsentAnalytics').checked;
            const marketing = document.getElementById('tiConsentMarketing').checked;

            window.TechIndroCookies.saveCustom({
                necessary: true,
                functional,
                analytics,
                marketing
            });
        });

        document.getElementById('tiModalAcceptAllBtn').addEventListener('click', () => {
            window.TechIndroCookies.acceptAll();
        });

        document.getElementById('tiModalRejectBtn').addEventListener('click', () => {
            window.TechIndroCookies.rejectOptional();
        });
    }

    function showBanner() {
        if (!bannerEl) buildBanner();
        requestAnimationFrame(() => {
            setTimeout(() => {
                bannerEl.classList.add('ti-cookie-show');
            }, 300);
        });
    }

    function hideBanner() {
        if (bannerEl) {
            bannerEl.classList.remove('ti-cookie-show');
        }
    }

    // Public API
    window.TechIndroCookies = {
        get: CookieUtils.get,
        set: CookieUtils.set,
        remove: CookieUtils.remove,

        getConsent: function () {
            return loadSavedConsent() || { ...defaultConsent, unprompted: true };
        },

        acceptAll: function () {
            const consent = {
                necessary: true,
                functional: true,
                analytics: true,
                marketing: true
            };
            saveConsent(consent);
            hideBanner();
            this.closePreferences();
            this.showFeedbackToast('All cookies accepted. Thank you! 🍪');
        },

        rejectOptional: function () {
            const consent = {
                necessary: true,
                functional: false,
                analytics: false,
                marketing: false
            };
            saveConsent(consent);
            hideBanner();
            this.closePreferences();
            this.showFeedbackToast('Optional cookies disabled. Essential cookies kept active.');
        },

        saveCustom: function (customPrefs) {
            saveConsent(customPrefs);
            hideBanner();
            this.closePreferences();
            this.showFeedbackToast('Your cookie preferences have been saved!');
        },

        openPreferences: function () {
            if (!modalEl) buildModal();
            const current = this.getConsent();

            const fn = document.getElementById('tiConsentFunctional');
            const an = document.getElementById('tiConsentAnalytics');
            const mk = document.getElementById('tiConsentMarketing');

            if (fn) fn.checked = current.functional !== false;
            if (an) an.checked = current.analytics !== false;
            if (mk) mk.checked = current.marketing !== false;

            modalEl.classList.add('ti-modal-open');
            document.body.style.overflow = 'hidden';
        },

        closePreferences: function () {
            if (modalEl) {
                modalEl.classList.remove('ti-modal-open');
                document.body.style.overflow = '';
            }
        },

        resetConsent: function () {
            localStorage.removeItem(COOKIE_CONSENT_KEY);
            CookieUtils.remove(COOKIE_NAME);
            showBanner();
        },

        showFeedbackToast: function (msg) {
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                background: #0f172a;
                color: #ffffff;
                padding: 10px 20px;
                border-radius: 30px;
                font-size: 0.9rem;
                font-weight: 600;
                box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                z-index: 100000;
                transition: all 0.3s ease;
                opacity: 0;
                pointer-events: none;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            toast.innerHTML = `<span>✓</span> <span>${msg}</span>`;
            document.body.appendChild(toast);

            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(-50%) translateY(0)';
            });

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(10px)';
                setTimeout(() => toast.remove(), 350);
            }, 3000);
        }
    };

    // Auto Init on DOM Ready
    function init() {
        injectStyles();
        buildModal();

        // Check if user has previously answered
        const existingConsent = loadSavedConsent();
        if (!existingConsent) {
            buildBanner();
            // Give 1 second delay so page loads cleanly before presenting banner
            setTimeout(() => {
                showBanner();
            }, 1000);
        }

        // Attach click listener for any links like <a href="#cookie-preferences"> or class .btn-cookie-preferences
        document.addEventListener('click', (e) => {
            const target = e.target.closest('a[href="#cookie-preferences"], a[href="#cookies"], .btn-cookie-preferences, .open-cookie-settings');
            if (target) {
                e.preventDefault();
                window.TechIndroCookies.openPreferences();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
