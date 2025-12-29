import React, { useState, useEffect } from 'react';
import { Shield, Eye, Clock, CheckCircle, X, Info } from 'lucide-react';

interface ConsentItem {
  id: string;
  title: string;
  description: string;
  dataTypes: string[];
  purpose: string;
  duration: string;
  status: 'active' | 'expired' | 'revoked';
  grantedAt: string;
  expiresAt: string;
  institution: string;
}

interface ConsentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onConsentChange?: (consentId: string, granted: boolean) => void;
}

const ConsentManager: React.FC<ConsentManagerProps> = ({ 
  isOpen, 
  onClose, 
  onConsentChange 
}) => {
  const [consents, setConsents] = useState<ConsentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  // Mock consent data - in real app, this would come from API
  useEffect(() => {
    if (isOpen) {
      setConsents([
        {
          id: 'consent-1',
          title: 'Bank Account Data Access',
          description: 'Access to transaction history and account balance information',
          dataTypes: ['Transaction History', 'Account Balance', 'Account Details'],
          purpose: 'Credit Score Calculation',
          duration: '12 months',
          status: 'active',
          grantedAt: '2024-01-15T10:30:00Z',
          expiresAt: '2025-01-15T10:30:00Z',
          institution: 'HDFC Bank'
        },
        {
          id: 'consent-2',
          title: 'Investment Account Access',
          description: 'Access to mutual fund and investment portfolio data',
          dataTypes: ['Portfolio Holdings', 'Investment History', 'SIP Details'],
          purpose: 'Alternative Credit Assessment',
          duration: '6 months',
          status: 'active',
          grantedAt: '2024-02-01T14:20:00Z',
          expiresAt: '2024-08-01T14:20:00Z',
          institution: 'Zerodha'
        },
        {
          id: 'consent-3',
          title: 'Savings Account Data',
          description: 'Access to savings account transaction patterns',
          dataTypes: ['Transaction History', 'Account Balance'],
          purpose: 'Income Stability Analysis',
          duration: '12 months',
          status: 'expired',
          grantedAt: '2023-06-10T09:15:00Z',
          expiresAt: '2024-06-10T09:15:00Z',
          institution: 'ICICI Bank'
        }
      ]);
    }
  }, [isOpen]);

  const handleRevokeConsent = async (consentId: string) => {
    setLoading(true);
    try {
      // In real app, make API call to revoke consent
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setConsents(prev => 
        prev.map(consent => 
          consent.id === consentId 
            ? { ...consent, status: 'revoked' as const }
            : consent
        )
      );
      
      onConsentChange?.(consentId, false);
    } catch (error) {
      console.error('Failed to revoke consent:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewConsent = async (consentId: string) => {
    setLoading(true);
    try {
      // In real app, make API call to renew consent
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newExpiryDate = new Date();
      newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
      
      setConsents(prev => 
        prev.map(consent => 
          consent.id === consentId 
            ? { 
                ...consent, 
                status: 'active' as const,
                expiresAt: newExpiryDate.toISOString()
              }
            : consent
        )
      );
      
      onConsentChange?.(consentId, true);
    } catch (error) {
      console.error('Failed to renew consent:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status: ConsentItem['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'expired':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'revoked':
        return <X className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: ConsentItem['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-orange-100 text-orange-800';
      case 'revoked':
        return 'bg-red-100 text-red-800';
    }
  };

  const activeConsents = consents.filter(c => c.status === 'active');
  const historyConsents = consents.filter(c => c.status !== 'active');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-8 w-8 mr-3" />
              <div>
                <h2 className="text-2xl font-bold">Consent Management</h2>
                <p className="text-blue-100">Manage your data sharing permissions</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'active'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Active Consents ({activeConsents.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              History ({historyConsents.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'active' && (
            <div className="space-y-6">
              {activeConsents.length === 0 ? (
                <div className="text-center py-8">
                  <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Consents</h3>
                  <p className="text-gray-500">You haven't granted any data access permissions yet.</p>
                </div>
              ) : (
                activeConsents.map((consent) => (
                  <div key={consent.id} className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start">
                        <div className="mr-4 mt-1">
                          {getStatusIcon(consent.status)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {consent.title}
                          </h3>
                          <p className="text-gray-600 mb-2">{consent.description}</p>
                          <div className="flex items-center text-sm text-gray-500">
                            <span className="mr-4">Institution: {consent.institution}</span>
                            <span>Expires: {formatDate(consent.expiresAt)}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(consent.status)}`}>
                        {consent.status.charAt(0).toUpperCase() + consent.status.slice(1)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Data Types</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {consent.dataTypes.map((type, index) => (
                            <li key={index} className="flex items-center">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                              {type}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Purpose</h4>
                        <p className="text-sm text-gray-600">{consent.purpose}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Duration</h4>
                        <p className="text-sm text-gray-600">{consent.duration}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-500">
                        Granted on {formatDate(consent.grantedAt)}
                      </div>
                      <button
                        onClick={() => handleRevokeConsent(consent.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                      >
                        {loading ? 'Revoking...' : 'Revoke Consent'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              {historyConsents.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No History</h3>
                  <p className="text-gray-500">No expired or revoked consents to show.</p>
                </div>
              ) : (
                historyConsents.map((consent) => (
                  <div key={consent.id} className="bg-gray-50 rounded-lg p-6 opacity-75">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start">
                        <div className="mr-4 mt-1">
                          {getStatusIcon(consent.status)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {consent.title}
                          </h3>
                          <p className="text-gray-600 mb-2">{consent.description}</p>
                          <div className="flex items-center text-sm text-gray-500">
                            <span className="mr-4">Institution: {consent.institution}</span>
                            <span>
                              {consent.status === 'expired' ? 'Expired' : 'Revoked'}: {formatDate(consent.expiresAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(consent.status)}`}>
                        {consent.status.charAt(0).toUpperCase() + consent.status.slice(1)}
                      </span>
                    </div>

                    {consent.status === 'expired' && (
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-500">
                          Originally granted on {formatDate(consent.grantedAt)}
                        </div>
                        <button
                          onClick={() => handleRenewConsent(consent.id)}
                          disabled={loading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                        >
                          {loading ? 'Renewing...' : 'Renew Consent'}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center text-sm text-gray-600">
            <Info className="h-4 w-4 mr-2" />
            <span>
              You can revoke consent at any time. Revoking consent will stop data access and may affect your credit score updates.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentManager;