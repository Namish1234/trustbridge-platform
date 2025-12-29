import React, { useState, useEffect } from 'react';
import { Shield, Lock, Eye, CheckCircle, Globe } from 'lucide-react';

interface TrustIndicator {
  id: string;
  icon: React.ComponentType<any>;
  text: string;
  status: 'verified' | 'warning' | 'info';
  color: string;
}

interface TrustTickerProps {
  className?: string;
  showDetails?: boolean;
}

const TrustTicker: React.FC<TrustTickerProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const trustIndicators: TrustIndicator[] = [
    {
      id: 'rbi-compliant',
      icon: Shield,
      text: 'RBI Account Aggregator Compliant',
      status: 'verified',
      color: 'text-green-600'
    },
    {
      id: 'bank-grade-security',
      icon: Lock,
      text: 'Bank-Grade AES-256 Encryption',
      status: 'verified',
      color: 'text-blue-600'
    },
    {
      id: 'zero-storage',
      icon: Eye,
      text: 'Zero Banking Credential Storage',
      status: 'verified',
      color: 'text-purple-600'
    },
    {
      id: 'iso-certified',
      icon: CheckCircle,
      text: 'ISO 27001 & SOC 2 Certified',
      status: 'verified',
      color: 'text-indigo-600'
    },
    {
      id: 'gdpr-compliant',
      icon: Globe,
      text: 'GDPR & Data Protection Compliant',
      status: 'verified',
      color: 'text-teal-600'
    }
  ];

  // Auto-rotate indicators every 4 seconds
  useEffect(() => {
    if (!showDetails) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % trustIndicators.length);
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [showDetails, trustIndicators.length]);

  const currentIndicator = trustIndicators[currentIndex];

  if (!isVisible) return null;

  if (showDetails) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Security & Trust</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trustIndicators.map((indicator) => (
              <div key={indicator.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                <indicator.icon className={`h-5 w-5 mr-3 ${indicator.color}`} />
                <span className="text-sm text-gray-700">{indicator.text}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Your data is protected:</strong> We use industry-leading security measures 
              and never store your banking credentials or sell your data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg ${className}`}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <currentIndicator.icon className={`h-5 w-5 mr-3 ${currentIndicator.color}`} />
            <span className="text-sm font-medium text-gray-800">
              {currentIndicator.text}
            </span>
            <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Progress dots */}
            <div className="flex space-x-1">
              {trustIndicators.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    index === currentIndex ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrustTicker;