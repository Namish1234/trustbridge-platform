import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  // Auth endpoints
  auth: {
    login: (email: string, password: string) =>
      api.post('/auth/login', { email, password }),
    register: (userData: any) =>
      api.post('/auth/register', userData),
    logout: () =>
      api.post('/auth/logout'),
    refreshToken: () =>
      api.post('/auth/refresh'),
  },

  // Account endpoints
  accounts: {
    getConnections: () =>
      api.get('/accounts/connections'),
    initiateConnection: (data: any) =>
      api.post('/accounts/connect/initiate', data),
    completeConnection: (consentId: string) =>
      api.post('/accounts/connect/complete', { consentId }),
    getTransactions: (params?: any) =>
      api.get('/accounts/transactions', { params }),
    syncData: () =>
      api.post('/accounts/sync'),
  },

  // Score endpoints
  scores: {
    calculate: () =>
      api.post('/scores/calculate'),
    getLatest: () =>
      api.get('/scores/latest'),
    getHistory: (limit?: number) =>
      api.get('/scores/history', { params: { limit } }),
    getBreakdown: () =>
      api.get('/scores/breakdown'),
    getComparison: () =>
      api.get('/scores/comparison'),
    recalculate: () =>
      api.post('/scores/recalculate'),
    getFactors: () =>
      api.get('/scores/factors'),
    checkDataSufficiency: () =>
      api.get('/scores/data-sufficiency'),
    getRecommendations: () =>
      api.get('/scores/recommendations'),
    canProceed: () =>
      api.get('/scores/can-proceed'),
    getDataImprovement: () =>
      api.get('/scores/data-improvement'),
  },
};

export default api;