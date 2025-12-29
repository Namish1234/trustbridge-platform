import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';

interface CreditScore {
  score: number;
  confidence: number;
  trend: 'improving' | 'stable' | 'declining';
  date: string;
  factors: {
    name: string;
    value: number;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }[];
}

interface AccountConnection {
  id: string;
  institutionName: string;
  accountType: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string;
  consentExpiry: string;
}

interface DataSufficiency {
  canProceed: boolean;
  reason?: string;
  minimumRequirements: {
    accounts: number;
    transactionHistory: number; // months
    categories: string[];
  };
  currentStatus: {
    connectedAccounts: number;
    transactionHistoryMonths: number;
    availableCategories: string[];
  };
}

interface DataContextType {
  creditScore: CreditScore | null;
  scoreHistory: CreditScore[];
  accountConnections: AccountConnection[];
  dataSufficiency: DataSufficiency | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  calculateScore: () => Promise<void>;
  refreshScore: () => Promise<void>;
  getScoreHistory: () => Promise<void>;
  getAccountConnections: () => Promise<void>;
  checkDataSufficiency: () => Promise<void>;
  syncAccountData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [creditScore, setCreditScore] = useState<CreditScore | null>(null);
  const [scoreHistory, setScoreHistory] = useState<CreditScore[]>([]);
  const [accountConnections, setAccountConnections] = useState<AccountConnection[]>([]);
  const [dataSufficiency, setDataSufficiency] = useState<DataSufficiency | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData();
    } else {
      // Clear data when not authenticated
      setCreditScore(null);
      setScoreHistory([]);
      setAccountConnections([]);
      setDataSufficiency(null);
    }
  }, [isAuthenticated]);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        getLatestScore(),
        getScoreHistory(),
        getAccountConnections(),
        checkDataSufficiency()
      ]);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const getLatestScore = async () => {
    try {
      const response = await apiService.scores.getLatest();
      setCreditScore(response.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Failed to get latest score:', error);
      }
      // 404 is expected if no score exists yet
    }
  };

  const calculateScore = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.scores.calculate();
      setCreditScore(response.data);
      
      // Refresh history after calculation
      await getScoreHistory();
    } catch (error: any) {
      console.error('Failed to calculate score:', error);
      setError(error.response?.data?.message || 'Failed to calculate score');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshScore = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.scores.recalculate();
      setCreditScore(response.data);
      
      // Refresh history after recalculation
      await getScoreHistory();
    } catch (error: any) {
      console.error('Failed to refresh score:', error);
      setError(error.response?.data?.message || 'Failed to refresh score');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreHistory = async () => {
    try {
      const response = await apiService.scores.getHistory(12); // Last 12 scores
      setScoreHistory(response.data.history || []);
    } catch (error: any) {
      console.error('Failed to get score history:', error);
      if (error.response?.status !== 404) {
        setError('Failed to load score history');
      }
    }
  };

  const getAccountConnections = async () => {
    try {
      const response = await apiService.accounts.getConnections();
      setAccountConnections(response.data.connections || []);
    } catch (error: any) {
      console.error('Failed to get account connections:', error);
      if (error.response?.status !== 404) {
        setError('Failed to load account connections');
      }
    }
  };

  const checkDataSufficiency = async () => {
    try {
      const response = await apiService.scores.checkDataSufficiency();
      setDataSufficiency(response.data);
    } catch (error: any) {
      console.error('Failed to check data sufficiency:', error);
      // Set default insufficient data state
      setDataSufficiency({
        canProceed: false,
        reason: 'No account connections found',
        minimumRequirements: {
          accounts: 2,
          transactionHistory: 3,
          categories: ['salary', 'expenses', 'savings']
        },
        currentStatus: {
          connectedAccounts: 0,
          transactionHistoryMonths: 0,
          availableCategories: []
        }
      });
    }
  };

  const syncAccountData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await apiService.accounts.syncData();
      
      // Refresh all data after sync
      await Promise.all([
        getAccountConnections(),
        checkDataSufficiency(),
        getLatestScore()
      ]);
    } catch (error: any) {
      console.error('Failed to sync account data:', error);
      setError(error.response?.data?.message || 'Failed to sync data');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: DataContextType = {
    creditScore,
    scoreHistory,
    accountConnections,
    dataSufficiency,
    isLoading,
    error,
    calculateScore,
    refreshScore,
    getScoreHistory,
    getAccountConnections,
    checkDataSufficiency,
    syncAccountData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

// Mock data provider for demo purposes
export const useMockData = () => {
  const [creditScore] = useState<CreditScore>({
    score: 742,
    confidence: 0.85,
    trend: 'improving',
    date: new Date().toISOString(),
    factors: [
      { name: 'Income Stability', value: 85, impact: 'positive', weight: 0.3 },
      { name: 'Savings Rate', value: 78, impact: 'positive', weight: 0.25 },
      { name: 'Payment Behavior', value: 92, impact: 'positive', weight: 0.2 },
      { name: 'Investment Activity', value: 65, impact: 'neutral', weight: 0.15 },
      { name: 'Account Diversity', value: 70, impact: 'positive', weight: 0.1 }
    ]
  });

  const [scoreHistory] = useState<CreditScore[]>([
    { score: 680, confidence: 0.75, trend: 'stable', date: '2024-01-01T00:00:00Z', factors: [] },
    { score: 695, confidence: 0.78, trend: 'improving', date: '2024-02-01T00:00:00Z', factors: [] },
    { score: 710, confidence: 0.80, trend: 'improving', date: '2024-03-01T00:00:00Z', factors: [] },
    { score: 725, confidence: 0.82, trend: 'improving', date: '2024-04-01T00:00:00Z', factors: [] },
    { score: 742, confidence: 0.85, trend: 'improving', date: new Date().toISOString(), factors: [] }
  ]);

  const [accountConnections] = useState<AccountConnection[]>([
    {
      id: 'conn-1',
      institutionName: 'HDFC Bank',
      accountType: 'Savings',
      status: 'connected',
      lastSync: new Date().toISOString(),
      consentExpiry: '2025-01-15T10:30:00Z'
    },
    {
      id: 'conn-2',
      institutionName: 'Zerodha',
      accountType: 'Investment',
      status: 'connected',
      lastSync: new Date().toISOString(),
      consentExpiry: '2024-08-01T14:20:00Z'
    }
  ]);

  const [dataSufficiency] = useState<DataSufficiency>({
    canProceed: true,
    minimumRequirements: {
      accounts: 2,
      transactionHistory: 3,
      categories: ['salary', 'expenses', 'savings']
    },
    currentStatus: {
      connectedAccounts: 2,
      transactionHistoryMonths: 6,
      availableCategories: ['salary', 'expenses', 'savings', 'investments']
    }
  });

  return {
    creditScore,
    scoreHistory,
    accountConnections,
    dataSufficiency,
    isLoading: false,
    error: null,
    calculateScore: async () => {
      // Mock calculation - no-op
    },
    refreshScore: async () => {
      // Mock refresh - no-op
    },
    getScoreHistory: async () => {
      // Mock - no-op
    },
    getAccountConnections: async () => {
      // Mock - no-op
    },
    checkDataSufficiency: async () => {
      // Mock - no-op
    },
    syncAccountData: async () => {
      // Mock sync - no-op
    }
  };
};