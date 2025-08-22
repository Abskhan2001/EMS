import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1';

// Types to match Supabase structure
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  department?: string;
  organizationId?: {
    _id: string;
    name: string;
  };
  status: string;
  emailVerified: boolean;
  workMode?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Session {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  }
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role?: string;
  department?: string;
  organizationId?: string;
  organizationName?: string;
  organizationSlug?: string;
}

class AuthService {
  private baseURL = `${API_BASE_URL}/auth`;
  private refreshPromise: Promise<string> | null = null;

  // Helper method to trigger auth state changes
  private triggerAuthStateChange(event: string, session: any) {
    if (typeof window !== 'undefined' && (window as any).authStateCallbacks) {
      (window as any).authStateCallbacks.forEach((callback: any) => {
        try {
          callback(event, session);
        } catch (error) {
          console.error('Error in auth state callback:', error);
        }
      });
    }
  }

  // Helper method to get stored token
  private getStoredToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  // Helper method to check if token is expired
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }

  // Helper method to refresh token
  private async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      const newToken = await this.refreshPromise;
      this.refreshPromise = null;
      return newToken;
    } catch (error) {
      this.refreshPromise = null;
      throw error;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(`${this.baseURL}/refresh-token`, {
        refreshToken
      });

      if (response.data.success) {
        const { accessToken, refreshToken: newRefreshToken } = response.data.tokens;

        // Update stored tokens
        localStorage.setItem('accessToken', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        return accessToken;
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error: any) {
      // Clear invalid tokens
      this.clearSession();
      throw new Error('Token refresh failed');
    }
  }

  // Helper method to get valid token (with auto-refresh)
  async getValidToken(): Promise<string | null> {
    const token = this.getStoredToken();

    if (!token) {
      return null;
    }

    if (this.isTokenExpired(token)) {
      try {
        return await this.refreshAccessToken();
      } catch {
        return null;
      }
    }

    return token;
  }

async signInWithPassword(credentials: LoginCredentials): Promise<{ data: { user: User; session: Session } | null; error: Error | null }> {
    try {
      const response = await axios.post<AuthResponse>(`${this.baseURL}/login`, credentials);

      if (response.data.success) {
        const { user, tokens } = response.data.data;

        // Store tokens
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        // Create session object to match Supabase structure
        const session: Session = {
          user,
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        };

        // Trigger auth state change
        this.triggerAuthStateChange('SIGNED_IN', session);

        return {
          data: { user, session },
          error: null
        };
      }
      // Handle cases where the server responds with a non-error status code but indicates failure
      return {
        data: null,
        error: new Error(response.data.message || 'Login failed')
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'An unknown error occurred';
      return {
        data: null,
        error: new Error(errorMessage)
      };
    }
  }

  async signUp(userData: RegisterData): Promise<{ data: { user: User; session: Session } | null; error: Error | null }> {
    try {
      let endpoint = `${this.baseURL}/register`;
      let requestData: any = {
        email: userData.email,
        password: userData.password,
        fullName: userData.fullName,
        role: userData.role || 'employee',
      };

      // Check if this is an organization registration
      if (userData.organizationName) {
        endpoint = `${this.baseURL}/register-organization`;
        requestData = {
          ...requestData,
          role: userData.role || 'admin', // Default to admin for organization creator
          organizationName: userData.organizationName,
          organizationSlug: userData.organizationSlug,
        };
      }

      const response = await axios.post<any>(endpoint, requestData);

      if (response.data.success) {
        // Both registration types require OTP verification and do not return tokens.
        // The backend returns user information inside a 'data' property.
        const responseData = response.data.data;

        // For personal registration, the response is { email, emailVerified }
        // For organization registration, the response is { organization, user }
        const user = responseData.user || { email: responseData.email, emailVerified: responseData.emailVerified };

        return {
          data: { user } as any, // We don't have a full session, so we cast to any
          error: null
        };
      }
      return {
        data: null,
        error: new Error(response.data.message || 'Sign up failed')
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'An unknown error occurred';
      return {
        data: null,
        error: new Error(errorMessage)
      };
    }
  }

  // Get current session to replace supabase.auth.getSession
  async getSession(): Promise<{ data: { session: Session | null }; error: Error | null }> {
    try {
      const userStr = localStorage.getItem('user');

      if (!userStr) {
        return {
          data: { session: null },
          error: null
        };
      }

      // Get valid token (will auto-refresh if needed)
      const accessToken = await this.getValidToken();

      if (!accessToken) {
        return {
          data: { session: null },
          error: null
        };
      }

      // Verify token with backend
      const response = await axios.get(`${this.baseURL}/profile`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (response.data.success) {
        const user = response.data.user;
        const refreshToken = localStorage.getItem('refreshToken');

        const session: Session = {
          user,
          access_token: accessToken,
          refresh_token: refreshToken || '',
          expires_at: Date.now() + (24 * 60 * 60 * 1000),
        };

        // Update stored user data
        localStorage.setItem('user', JSON.stringify(user));

        // Trigger auth state change for existing session
        this.triggerAuthStateChange('TOKEN_REFRESHED', session);

        return {
          data: { session },
          error: null
        };
      } else {
        // Clear invalid session
        this.clearSession();
        return {
          data: { session: null },
          error: null
        };
      }
    } catch (error: any) {
      // If it's a 401 error, try to refresh token
      if (error.response?.status === 401) {
        try {
          const newToken = await this.refreshAccessToken();
          // Retry with new token
          const response = await axios.get(`${this.baseURL}/profile`, {
            headers: {
              Authorization: `Bearer ${newToken}`
            }
          });

          if (response.data.success) {
            const user = response.data.user;
            const refreshToken = localStorage.getItem('refreshToken');

            const session: Session = {
              user,
              access_token: newToken,
              refresh_token: refreshToken || '',
              expires_at: Date.now() + (24 * 60 * 60 * 1000),
            };

            localStorage.setItem('user', JSON.stringify(user));

            return {
              data: { session },
              error: null
            };
          }
        } catch (refreshError) {
          // Refresh failed, clear session
          this.clearSession();
        }
      }

      // Clear invalid session
      this.clearSession();
      return {
        data: { session: null },
        error: null
      };
    }
  }

  // Sign out method to replace supabase.auth.signOut
  async signOut(): Promise<{ error: Error | null }> {
    try {
      const accessToken = localStorage.getItem('accessToken');

      if (accessToken) {
        await axios.post(`${this.baseURL}/logout`, {}, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
      }

      this.clearSession();
      return { error: null };
    } catch (error: any) {
      // Clear session even if logout request fails
      this.clearSession();
      return { error: null };
    }
  }

  // Clear session data
  private clearSession(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('supabaseSession'); // Remove old Supabase session
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');

    // Trigger auth state change
    this.triggerAuthStateChange('SIGNED_OUT', null);
  }

  // Auth state change listener to replace supabase.auth.onAuthStateChange
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    // Simple implementation - in a real app you might want to use a more sophisticated event system
    const checkAuthState = async () => {
      const { data } = await this.getSession();
      callback('SIGNED_IN', data.session);
    };

    // Check initial state
    checkAuthState();

    // Return unsubscribe function
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            // Cleanup if needed
          }
        }
      }
    };
  }

  async verifyEmailOTP(email: string, otp: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.post(`${this.baseURL}/verify-otp`, { email, otp });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'OTP verification failed');
    }
  }

  async resendEmailOTP(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.post(`${this.baseURL}/resend-otp`, { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to resend OTP');
    }
  }
}

export const authService = new AuthService();
