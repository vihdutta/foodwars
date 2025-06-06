interface User {
    id?: string;
    name?: string;
    email?: string;
    picture?: string;
    username?: string;
    wasUsernameModified?: boolean;
}

class AuthManager {
    private user: User | null;
    private feedbackTimeout: NodeJS.Timeout | null = null;
    private availabilityCheckTimeout: NodeJS.Timeout | null = null;
    private lastCheckedUsername: string = '';

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
                this.updateChefNameInput();
                this.authenticateSocket();
            } else {
                console.log('User not authenticated');
                this.showLoggedOutState();
                this.enableChefNameInput();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showLoggedOutState();
            this.enableChefNameInput();
        }
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        const googleLoginBtn = document.getElementById('google-login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const saveUsernameBtn = document.getElementById('save-username-btn');
        const newUsernameInput = document.getElementById('new-username-input') as HTMLInputElement;

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
                    this.enableChefNameInput();
                } catch (error) {
                    console.error('Logout failed:', error);
                }
            });
            console.log('Logout listener added');
        }

        if (saveUsernameBtn) {
            saveUsernameBtn.addEventListener('click', async (e) => {
                await this.handleUsernameUpdate();
            });
            console.log('Save username listener added');
        }

        // Add real-time username availability checking
        if (newUsernameInput) {
            newUsernameInput.addEventListener('input', (e) => {
                this.handleUsernameInputChange((e.target as HTMLInputElement).value);
            });
            console.log('Username input listener added');
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
                userName.textContent = this.user.username || this.user.name || 'User';
            }

            // Two Google accounts can have the same username. If this is the case, create new name and show warning
            if (this.user.wasUsernameModified) {
                this.showFeedbackMessage(
                    'Your username was already taken. You can change it above.',
                    'warning'
                );
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

    updateChefNameInput() {
        const usernameInput = document.getElementById('username') as HTMLInputElement;
        if (this.user && usernameInput) {
            // Set the username from the database
            usernameInput.value = this.user.username || this.user.name || 'User';
            
            // Disable and dim the input
            usernameInput.disabled = true;
            usernameInput.style.opacity = '0.6';
            usernameInput.style.cursor = 'not-allowed';
            usernameInput.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            
            console.log('Chef name input updated and disabled:', usernameInput.value);
        }
    }

    enableChefNameInput() {
        const usernameInput = document.getElementById('username') as HTMLInputElement;
        if (usernameInput) {
            usernameInput.disabled = false;
            usernameInput.style.opacity = '1';
            usernameInput.style.cursor = 'text';
            usernameInput.style.backgroundColor = '';
            usernameInput.value = '';
        }
    }

    showFeedbackMessage(message: string, type: 'success' | 'error' | 'warning' = 'success') {
        const userSection = document.getElementById('user-section');
        if (!userSection) return;

        // Clear existing timeout
        if (this.feedbackTimeout) {
            clearTimeout(this.feedbackTimeout);
        }

        // Clear availability feedback when showing other messages
        this.clearUsernameAvailabilityFeedback();

        // Remove existing feedback
        const existingFeedback = userSection.querySelector('.feedback-message');
        if (existingFeedback) {
            existingFeedback.remove();
        }

        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = 'feedback-message mt-3 p-3 rounded-lg text-sm font-semibold';
        feedback.textContent = message;

        // Apply styling based on type with improved contrast
        switch (type) {
            case 'success':
                feedback.style.backgroundColor = 'rgba(76, 175, 80, 0.8)';
                feedback.style.borderColor = '#4CAF50';
                feedback.style.color = '#ffffff';
                break;
            case 'error':
                feedback.style.backgroundColor = 'rgba(244, 67, 54, 0.8)';
                feedback.style.borderColor = '#f44336';
                feedback.style.color = '#ffffff';
                break;
            case 'warning':
                feedback.style.backgroundColor = 'rgba(255, 152, 0, 0.85)';
                feedback.style.borderColor = '#FF9800';
                feedback.style.color = '#ffffff';
                break;
        }
        feedback.style.border = '2px solid';
        feedback.style.backdropFilter = 'blur(10px)';

        // Insert feedback
        const usernameSection = userSection.querySelector('.border-t');
        if (usernameSection) {
            usernameSection.appendChild(feedback);
        }

        // Auto-hide after 5 seconds
        this.feedbackTimeout = setTimeout(() => {
            if (feedback.parentNode) {
                feedback.remove();
            }
        }, 5000);
    }

    async handleUsernameUpdate() {
        const newUsernameInput = document.getElementById('new-username-input') as HTMLInputElement;
        const saveBtn = document.getElementById('save-username-btn') as HTMLButtonElement;
        
        if (!newUsernameInput || !saveBtn) {
            console.error('Username update elements not found');
            return;
        }

        const newUsername = newUsernameInput.value.trim();
        if (!newUsername) {
            this.showFeedbackMessage('Please enter a username', 'error');
            return;
        }

        if (newUsername.length > 12) {
            this.showFeedbackMessage('Username must be 12 characters or less', 'error');
            return;
        }

        // Clear availability feedback before submission
        this.clearUsernameAvailabilityFeedback();

        // disable button during request
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            const response = await fetch('/auth/update-username', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ newUsername })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // update local user object
                if (this.user) {
                    this.user.username = result.username;
                }
                
                // update displayed username
                const userNameElement = document.getElementById('user-name');
                if (userNameElement) {
                    userNameElement.textContent = result.username;
                }

                // update chef name input
                this.updateChefNameInput();

                // clear input and show success
                newUsernameInput.value = '';
                this.lastCheckedUsername = ''; // Reset last checked username
                this.showFeedbackMessage(`Username updated to "${result.username}"!`, 'success');
                console.log('✅ Username updated to:', result.username);
            } else {
                this.showFeedbackMessage(result.error || 'Failed to update username', 'error');
                console.error('❌ Username update failed:', result.error);
            }
        } catch (error) {
            console.error('❌ Username update error:', error);
            this.showFeedbackMessage('Failed to update username. Please try again.', 'error');
        } finally {
            // re-enable button
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
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
            
            // Ensure we have all required fields for the backend UserInfo interface
            const userInfoForSocket = {
                id: this.user.id || '',
                name: this.user.name || this.user.username || this.user.email?.split('@')[0] || 'User', // Multiple fallbacks for name
                email: this.user.email,
                picture: this.user.picture
            };
            
            // Validate that we have the minimum required fields
            if (!userInfoForSocket.id || !userInfoForSocket.name) {
                console.error('❌ Cannot authenticate socket - missing required user fields:', {
                    hasId: !!userInfoForSocket.id,
                    hasName: !!userInfoForSocket.name,
                    userInfo: this.user
                });
                return;
            }
            
            console.log('📤 Sending user info to socket:', JSON.stringify(userInfoForSocket, null, 2));
            socket.emit('authenticateUser', userInfoForSocket);
            
            socket.on('authenticationConfirmed', (result: { success: boolean; error?: string }) => {
                if (result.success) {
                    console.log('✅ Socket authentication successful');
                } else {
                    console.error('❌ Socket authentication failed:', result.error);
                    console.error('❌ User info that failed:', userInfoForSocket);
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

    /**
     * Handles real-time username input changes with debouncing
     */
    private handleUsernameInputChange(username: string) {
        // Clear existing timeout
        if (this.availabilityCheckTimeout) {
            clearTimeout(this.availabilityCheckTimeout);
        }

        // Clear any existing availability feedback
        this.clearUsernameAvailabilityFeedback();

        const trimmedUsername = username.trim();
        
        // Don't check if empty or same as last checked
        if (!trimmedUsername || trimmedUsername === this.lastCheckedUsername) {
            return;
        }

        // Show checking state immediately for better UX
        if (trimmedUsername.length >= 3) {
            this.showUsernameAvailabilityFeedback('Checking availability...', 'checking');
        }

        // Debounce the API call
        this.availabilityCheckTimeout = setTimeout(async () => {
            await this.checkUsernameAvailability(trimmedUsername);
        }, 500); // 500ms delay
    }

    /**
     * Checks username availability via API
     */
    private async checkUsernameAvailability(username: string) {
        try {
            this.lastCheckedUsername = username;
            
            const response = await fetch('/auth/check-username-availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username })
            });

            const result = await response.json();

            if (result.available) {
                this.showUsernameAvailabilityFeedback('✓ Username available', 'available');
            } else {
                this.showUsernameAvailabilityFeedback(result.error || '✗ Username not available', 'unavailable');
            }
        } catch (error) {
            console.error('Error checking username availability:', error);
            this.showUsernameAvailabilityFeedback('Error checking availability', 'error');
        }
    }

    /**
     * Shows username availability feedback with appropriate styling
     */
    private showUsernameAvailabilityFeedback(message: string, type: 'available' | 'unavailable' | 'checking' | 'error') {
        const newUsernameInput = document.getElementById('new-username-input') as HTMLInputElement;
        const container = document.querySelector('.username-input-container');
        const saveBtn = document.getElementById('save-username-btn') as HTMLButtonElement;
        if (!newUsernameInput || !container || !saveBtn) return;

        // Remove existing feedback
        this.clearUsernameAvailabilityFeedback();

        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = 'username-availability-feedback text-xs mt-1 px-2 py-1 rounded transition-all duration-300 font-semibold';
        feedback.textContent = message;

        // Apply styling based on type and manage save button state with improved contrast
        switch (type) {
            case 'available':
                feedback.style.backgroundColor = 'rgba(16, 185, 129, 0.8)';
                feedback.style.color = '#ffffff';
                feedback.style.border = '1px solid #10B981';
                newUsernameInput.style.borderColor = '#10B981';
                saveBtn.disabled = false;
                saveBtn.style.opacity = '1';
                break;
            case 'unavailable':
                feedback.style.backgroundColor = 'rgba(239, 68, 68, 0.8)';
                feedback.style.color = '#ffffff';
                feedback.style.border = '1px solid #EF4444';
                newUsernameInput.style.borderColor = '#EF4444';
                saveBtn.disabled = true;
                saveBtn.style.opacity = '0.6';
                break;
            case 'checking':
                feedback.style.backgroundColor = 'rgba(107, 114, 128, 0.8)';
                feedback.style.color = '#ffffff';
                feedback.style.border = '1px solid #6B7280';
                newUsernameInput.style.borderColor = '#6B7280';
                saveBtn.disabled = true;
                saveBtn.style.opacity = '0.6';
                break;
            case 'error':
                feedback.style.backgroundColor = 'rgba(245, 158, 11, 0.8)';
                feedback.style.color = '#ffffff';
                feedback.style.border = '1px solid #F59E0B';
                newUsernameInput.style.borderColor = '#F59E0B';
                saveBtn.disabled = true;
                saveBtn.style.opacity = '0.6';
                break;
        }
        feedback.style.backdropFilter = 'blur(5px)';

        // Insert feedback in the container
        container.appendChild(feedback);
    }

    /**
     * Clears username availability feedback
     */
    private clearUsernameAvailabilityFeedback() {
        // Clear any pending availability check
        if (this.availabilityCheckTimeout) {
            clearTimeout(this.availabilityCheckTimeout);
            this.availabilityCheckTimeout = null;
        }

        const existingFeedback = document.querySelector('.username-availability-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }

        // Reset input border and save button state
        const newUsernameInput = document.getElementById('new-username-input') as HTMLInputElement;
        const saveBtn = document.getElementById('save-username-btn') as HTMLButtonElement;
        if (newUsernameInput) {
            newUsernameInput.style.borderColor = '';
        }
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
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