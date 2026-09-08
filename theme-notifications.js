/**
 * Tech Indro - Global Theme & Notification Center Engine
 * Supports: Instant Dark/Light Theme Switcher & Interactive In-App Notification Center
 */

(function () {
    // 1. Theme Engine
    const savedTheme = localStorage.getItem('tech_indro_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    window.toggleTheme = function () {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('tech_indro_theme', newTheme);
        updateThemeToggleIcons(newTheme);
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
    };

    function updateThemeToggleIcons(theme) {
        const toggleBtns = document.querySelectorAll('.btn-theme-toggle');
        toggleBtns.forEach(btn => {
            if (theme === 'dark') {
                btn.innerHTML = `<i data-lucide="sun" style="width:18px;height:18px;color:#ffd700;"></i>`;
                btn.setAttribute('title', 'Switch to Light Mode');
            } else {
                btn.innerHTML = `<i data-lucide="moon" style="width:18px;height:18px;color:#475569;"></i>`;
                btn.setAttribute('title', 'Switch to Dark Mode');
            }
        });
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // 2. Notification Center State
    const DEFAULT_NOTIFICATIONS = [
        {
            id: 'notif-1',
            category: 'streak',
            title: '🔥 Keep Your 7-Day Streak Alive!',
            message: 'You have only 4 hours left today to complete your Daily Quiz & preserve your 2,450 XP bonus.',
            time: '2 hours ago',
            read: false,
            actionText: 'Solve Daily Quiz',
            actionUrl: 'quiz.html',
            icon: 'flame',
            iconColor: '#ef4444'
        },
        {
            id: 'notif-2',
            category: 'course',
            title: '🚀 Module 3 Live: Gemini Multi-Agent Pipelines',
            message: 'New hands-on coding lab uploaded in AI Systems. Test your code in the IndroLabs runtime.',
            time: '5 hours ago',
            read: false,
            actionText: 'Open IndroLabs',
            actionUrl: 'cyber-playground.html',
            icon: 'code-2',
            iconColor: '#8b5cf6'
        },
        {
            id: 'notif-3',
            category: 'announcement',
            title: '🏆 TSOC 2026 Cohort Applications Open',
            message: 'Apply for the ₹50,000 summer stipend & 1-on-1 industry mentorship cohort.',
            time: '1 day ago',
            read: false,
            actionText: 'Apply for TSOC',
            actionUrl: 'tsoc.html',
            icon: 'award',
            iconColor: '#ff6b35'
        }
    ];

    function getNotifications() {
        try {
            const stored = localStorage.getItem('tech_indro_notifications');
            return stored ? JSON.parse(stored) : DEFAULT_NOTIFICATIONS;
        } catch (e) {
            return DEFAULT_NOTIFICATIONS;
        }
    }

    function saveNotifications(notifs) {
        localStorage.setItem('tech_indro_notifications', JSON.stringify(notifs));
        updateNotificationUI();
    }

    window.markAllNotificationsRead = function () {
        const notifs = getNotifications().map(n => ({ ...n, read: true }));
        saveNotifications(notifs);
    };

    window.toggleNotificationDropdown = function (e) {
        if (e) e.stopPropagation();
        const dropdown = document.getElementById('notificationDropdown');
        if (!dropdown) return;
        const isShown = dropdown.classList.contains('show');
        if (isShown) {
            dropdown.classList.remove('show');
        } else {
            dropdown.classList.add('show');
            renderNotificationsList();
        }
    };

    function renderNotificationsList() {
        const listEl = document.getElementById('notifList');
        if (!listEl) return;
        const notifs = getNotifications();

        if (notifs.length === 0) {
            listEl.innerHTML = `<div style="padding:28px 16px;text-align:center;color:var(--text-muted);font-size:0.88rem;">No notifications right now</div>`;
            return;
        }

        listEl.innerHTML = notifs.map(n => `
            <div class="notif-item ${n.read ? 'read' : 'unread'}" style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;gap:12px;align-items:flex-start;">
                <div style="width:34px;height:34px;border-radius:10px;background:rgba(255,107,53,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:${n.iconColor || 'var(--primary)'};">
                    <i data-lucide="${n.icon || 'bell'}" style="width:18px;height:18px;"></i>
                </div>
                <div style="flex:1;">
                    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;">
                        <h4 style="margin:0;font-size:0.88rem;font-weight:700;color:var(--text-main);">${n.title}</h4>
                        <span style="font-size:0.75rem;color:var(--text-muted);">${n.time}</span>
                    </div>
                    <p style="margin:0 0 8px;font-size:0.82rem;color:var(--text-muted);line-height:1.45;">${n.message}</p>
                    ${n.actionUrl ? `
                        <a href="${n.actionUrl}" style="display:inline-flex;align-items:center;gap:4px;font-size:0.78rem;font-weight:700;color:var(--primary);text-decoration:none;">
                            ${n.actionText || 'View Details'} <i data-lucide="arrow-right" style="width:12px;height:12px;"></i>
                        </a>
                    ` : ''}
                </div>
            </div>
        `).join('');

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function updateNotificationUI() {
        const notifs = getNotifications();
        const unreadCount = notifs.filter(n => !n.read).length;
        const badges = document.querySelectorAll('.notif-badge-count');
        badges.forEach(badge => {
            if (unreadCount > 0) {
                badge.innerText = unreadCount;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        });
        renderNotificationsList();
    }

    // 3. Inject CSS Styles for Dropdown and Controls
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
        .header-controls-group {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            margin-left: 8px;
            position: relative;
        }
        .btn-header-action {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--text-main);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            position: relative;
            transition: all 0.2s ease;
        }
        .btn-header-action:hover {
            border-color: var(--primary);
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(255, 107, 53, 0.15);
        }
        .notif-badge-count {
            position: absolute;
            top: -3px;
            right: -3px;
            background: #ef4444;
            color: white;
            font-size: 0.7rem;
            font-weight: 800;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid var(--surface);
        }
        .notification-dropdown-panel {
            display: none;
            position: absolute;
            top: 50px;
            right: 0;
            width: 360px;
            max-width: 90vw;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 16px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
            z-index: 9999;
            overflow: hidden;
            animation: fadeInSlide 0.2s ease forwards;
        }
        .notification-dropdown-panel.show {
            display: block;
        }
        @keyframes fadeInSlide {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .notif-header {
            padding: 14px 18px;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--surface);
        }
        .notif-header h3 {
            margin: 0;
            font-size: 0.95rem;
            font-weight: 800;
            color: var(--text-main);
        }
        .notif-btn-clear {
            background: transparent;
            border: none;
            color: var(--primary);
            font-size: 0.78rem;
            font-weight: 700;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 6px;
        }
        .notif-btn-clear:hover {
            background: rgba(255, 107, 53, 0.1);
        }
        .notif-items-container {
            max-height: 380px;
            overflow-y: auto;
        }
        .notif-item.unread {
            background: rgba(255, 107, 53, 0.04);
        }
    `;
    document.head.appendChild(styleTag);

    // 4. Header Injection / Wire-up
    function setupHeader() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

        // Check if controls container already exists
        if (document.getElementById('headerControlsGroup')) {
            updateThemeToggleIcons(currentTheme);
            updateNotificationUI();
            return;
        }

        // Find navbar
        const navContainer = document.querySelector('header nav .nav-links') || document.querySelector('header nav');
        if (!navContainer) return;

        // Create Header Controls Group (Bell + Theme Toggle + Dropdown)
        const controlsGroup = document.createElement('div');
        controlsGroup.id = 'headerControlsGroup';
        controlsGroup.className = 'header-controls-group';

        controlsGroup.innerHTML = `
            <!-- Notification Bell -->
            <button class="btn-header-action" onclick="window.toggleNotificationDropdown(event)" title="Notifications">
                <i data-lucide="bell" style="width:16px;height:16px;"></i>
                <span class="notif-badge-count" style="display:none;">0</span>
            </button>

            <!-- Notification Dropdown Panel -->
            <div class="notification-dropdown-panel" id="notificationDropdown">
                <div class="notif-header">
                    <h3>Notifications</h3>
                    <button class="notif-btn-clear" onclick="window.markAllNotificationsRead()">Mark all read</button>
                </div>
                <div class="notif-items-container" id="notifList"></div>
            </div>

            <!-- Dark / Light Mode Toggle Button -->
            <button class="btn-header-action btn-theme-toggle" onclick="window.toggleTheme()" title="Toggle Theme">
                <i data-lucide="moon" style="width:16px;height:16px;"></i>
            </button>
        `;

        // Insert controls group before login button or at the end
        const loginBtn = navContainer.querySelector('.login-btn') || navContainer.querySelector('a[href="login.html"]');
        if (loginBtn) {
            const targetNode = navContainer.tagName === 'UL' ? loginBtn.parentElement : loginBtn;
            targetNode.insertAdjacentElement('beforebegin', controlsGroup);
        } else {
            navContainer.appendChild(controlsGroup);
        }

        updateThemeToggleIcons(currentTheme);
        updateNotificationUI();

        // Close dropdown when clicking outside
        document.addEventListener('click', function (e) {
            const dropdown = document.getElementById('notificationDropdown');
            if (dropdown && dropdown.classList.contains('show')) {
                if (!controlsGroup.contains(e.target)) {
                    dropdown.classList.remove('show');
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupHeader);
    } else {
        setupHeader();
    }
})();
