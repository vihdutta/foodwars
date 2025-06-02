interface User {
    name?: string;
    email?: string;
    picture?: string;
}

class AuthManager {
    private user: User | null;

    constructor() {
        this.user = null;
    }

    async init() {
        console.log('AuthManager initializing...');
        this.setupEventListeners();
        this.handleAuthCallback();
        await this.checkAuthStatus();
        // authenticate socket if user logged in
        if (this.user) {
            this.authenticateSocket();
        }
    }

    async checkAuthStatus() {
        try {
            console.log('Checking auth status...');
            const response = await fetch('/auth/user', {
                credentials: 'include'
            });

            if (response.ok) {
                this.user = await response.json();
                console.log('User authenticated:', this.user);
                this.showLoggedInState();
                this.autofillUsername();
                this.authenticateSocket();
            } else {
                console.log('User not authenticated');
                this.showLoggedOutState();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showLoggedOutState();
        }
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        const googleLoginBtn = document.getElementById('google-login-btn');
        const logoutBtn = document.getElementById('logout-btn');

        if (googleLoginBtn) {
            console.log('Google button found:', googleLoginBtn);
            googleLoginBtn.addEventListener('click', (e) => {
                console.log('Google login button clicked');
                window.location.href = '/auth/google';
            });
            console.log('Google login listener added');
        } else {
            console.error('Google login button not found!');
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                console.log('Logout button clicked');
                try {
                    await fetch('/auth/logout', {
                        method: 'GET',
                        credentials: 'include'
                    });
                    this.user = null;
                    this.showLoggedOutState();
                    this.clearUsername();
                } catch (error) {
                    console.error('Logout failed:', error);
                }
            });
            console.log('Logout listener added');
        }
    }

    handleAuthCallback() {
        // Check if user just completed authentication
        if (window.location.hash === '#authenticated') {
            console.log('Auth callback detected');
            // Remove the hash and refresh auth status
            window.location.hash = '';
            this.checkAuthStatus();
        }
    }

    showLoggedInState() {
        console.log('Showing logged in state');
        const loginSection = document.getElementById('login-section');
        const userSection = document.getElementById('user-section');
        const userAvatar = document.getElementById('user-avatar') as HTMLImageElement;
        const userName = document.getElementById('user-name');

        if (loginSection) loginSection.style.display = 'none';
        if (userSection) userSection.style.display = 'block';

        if (this.user) {
            if (userAvatar && this.user.picture) {
                userAvatar.src = this.user.picture;
                userAvatar.style.display = 'block';
            } else if (userAvatar) {
                userAvatar.style.display = 'none';
            }

            if (userName) {
                userName.textContent = this.user.name || this.user.email || 'User';
            }
        }
    }

    showLoggedOutState() {
        console.log('Showing logged out state');
        const loginSection = document.getElementById('login-section');
        const userSection = document.getElementById('user-section');

        if (loginSection) loginSection.style.display = 'block';
        if (userSection) userSection.style.display = 'none';
    }

    autofillUsername() {
        const usernameInput = document.getElementById('username') as HTMLInputElement;
        if (this.user && usernameInput && !usernameInput.value) {
            // Use first name or first part of display name, truncated to 12 chars
            const firstName = this.user.name ? this.user.name.split(' ')[0] : 'User';
            usernameInput.value = firstName.slice(0, 12);
            usernameInput.dataset.autoFilled = 'true';
            console.log('Username autofilled:', firstName.slice(0, 12));
        }
    }

    clearUsername() {
        const usernameInput = document.getElementById('username') as HTMLInputElement;
        if (usernameInput && usernameInput.dataset.autoFilled === 'true') {
            usernameInput.value = '';
            usernameInput.dataset.autoFilled = 'false';
        }
    }

    getUser(): User | null {
        return this.user;
    }

    isAuthenticated(): boolean {
        return this.user !== null;
    }

    authenticateSocket() {
        if (this.user && (window as any).socket) {
            console.log('🔐 Authenticating socket with user info');
            const socket = (window as any).socket;
            socket.emit('authenticateUser', this.user);
            
            socket.on('authenticationConfirmed', (result: { success: boolean; error?: string }) => {
                if (result.success) {
                    console.log('✅ Socket authentication successful');
                } else {
                    console.error('❌ Socket authentication failed:', result.error);
                }
            });
        } else {
            console.log('⏳ Waiting for socket connection to authenticate...');
            // Retry after a short delay if socket isn't ready yet
            setTimeout(() => {
                if (this.user && (window as any).socket) {
                    this.authenticateSocket();
                }
            }, 1000);
        }
    }

    /**
     * public method to trigger socket authentication
     * called when socket becomes available
     */
    authenticateSocketIfReady(): void {
        if (this.user) {
            this.authenticateSocket();
        }
    }
}

// Wait for DOM to load before initializing
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing auth...');
    const authManager = new AuthManager();
    authManager.init();
    // Export for use in other modules if needed
    (window as any).authManager = authManager;
});

// Also initialize immediately in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
    // Still loading, wait for DOMContentLoaded
} else {
    // Already loaded
    console.log('DOM already loaded, initializing auth immediately...');
    const authManager = new AuthManager();
    authManager.init();
    (window as any).authManager = authManager;
}
//# sourceMappingURL=auth.js.map