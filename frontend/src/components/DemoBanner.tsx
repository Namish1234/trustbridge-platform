import React from 'react';

const DemoBanner: React.FC = () => {
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_API_URL;

  if (!isDemoMode) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 text-center text-sm">
      <div className="flex items-center justify-center space-x-2">
        <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse"></span>
        <span className="font-medium">
          🚀 Demo Mode - This is a demonstration of TrustBridge with simulated data
        </span>
        <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse"></span>
      </div>
      <div className="text-xs mt-1 opacity-90">
        All data shown is mock data for demonstration purposes. 
        <a 
          href="https://github.com/Namish1234/trustbridge-platform" 
          target="_blank" 
          rel="noopener noreferrer"
          className="underline hover:text-blue-200 ml-1"
        >
          View Source Code
        </a>
      </div>
    </div>
  );
};

export default DemoBanner;