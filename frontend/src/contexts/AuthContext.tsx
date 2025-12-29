import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { apiService } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  consentStatus: 'pending' | 'granted' | 'revoked';
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check for existing auth token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          // Verify token and get user data
          const response = await apiService.auth.refreshToken();
          if (response.data.user) {
            setUser(response.data.user);
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('authToken');
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.auth.login(email, password);
      
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        setUser(response.data.user);
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    try {
      setIsLoading(true);
      const response = await apiService.auth.register(userData);
      
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        setUser(response.data.user);
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw new Error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await apiService.auth.refreshToken();
      if (response.data.user) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // Don't logout on refresh failure, just log the error
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Mock authentication for demo purposes
export const useMockAuth = () => {
  const [user, setUser] = useState<User | null>({
    id: 'demo-user-1',
    email: 'demo@trustbridge.in',
    name: 'Demo User',
    kycStatus: 'verified',
    consentStatus: 'granted',
    createdAt: '2024-01-15T10:30:00Z'
  });

  return {
    user,
    isLoading: false,
    isAuthenticated: !!user,
    login: async (email: string, _password: string) => {
      // Mock login - always succeeds
      setUser({
        id: 'demo-user-1',
        email,
        name: 'Demo User',
        kycStatus: 'verified',
        consentStatus: 'granted',
        createdAt: new Date().toISOString()
      });
    },
    register: async (userData: any) => {
      // Mock registration - always succeeds
      setUser({
        id: 'demo-user-1',
        email: userData.email,
        name: userData.name || 'Demo User',
        kycStatus: 'pending',
        consentStatus: 'pending',
        createdAt: new Date().toISOString()
      });
    },
    logout: async () => {
      setUser(null);
    },
    refreshUser: async () => {
      // Mock refresh - no-op
    }
  };
};