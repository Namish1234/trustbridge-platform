import React, { useState } from 'react';
import { Shield, AlertCircle, CheckCircle, ArrowRight, Info } from 'lucide-react';

const ScorePage: React.FC = () => {
  const [step, setStep] = useState<'pan' | 'otp' | 'consent' | 'calculating' | 'result'>('pan');
  const [panNumber, setPanNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // PAN validation
  const validatePAN = (pan: string): boolean => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  };

  // Phone validation
  const validatePhone = (phoneNum: string): boolean => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phoneNum);
  };

  const handlePANSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!panNumber.trim()) {
      newErrors.pan = 'PAN number is required';
    } else if (!validatePAN(panNumber.toUpperCase())) {
      newErrors.pan = 'Please enter a valid PAN number (e.g., ABCDE1234F)';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Mobile number is required';
    } else if (!validatePhone(phone)) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    
    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStep('otp');
    } catch (error) {
      setErrors({ general: 'Failed to send OTP. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!otpCode.trim() || otpCode.length !== 6) {
      setErrors({ otp: 'Please enter the 6-digit OTP' });
      return;
    }

    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStep('consent');
    } catch (error) {
      setErrors({ otp: 'Invalid OTP. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleConsentAccept = async () => {
    setLoading(true);
    setStep('calculating');
    
    // Simulate score calculation
    setTimeout(() => {
      setStep('result');
      setLoading(false);
    }, 3000);
  };

  const renderPANForm = () => (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Identity</h2>
        <p className="text-gray-600">
          We need to verify your PAN to calculate your TrustScore securely
        </p>
      </div>

      <form onSubmit={handlePANSubmit} className="space-y-6">
        <div>
          <label htmlFor="pan" className="block text-sm font-medium text-gray-700 mb-2">
            PAN Number
          </label>
          <input
            type="text"
            id="pan"
            value={panNumber}
            onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
            placeholder="ABCDE1234F"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.pan ? 'border-red-500' : 'border-gray-300'
            }`}
            maxLength={10}
          />
          {errors.pan && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.pan}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
            Mobile Number
          </label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="9876543210"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            maxLength={10}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.phone}
            </p>
          )}
        </div>

        {errors.general && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {errors.general}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              Send OTP
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Why do we need your PAN?</p>
            <p>Your PAN helps us verify your identity and comply with RBI regulations for financial services.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOTPForm = () => (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter OTP</h2>
        <p className="text-gray-600">
          We've sent a 6-digit code to +91 {phone.replace(/(\d{5})(\d{5})/, '$1*****')}
        </p>
      </div>

      <form onSubmit={handleOTPSubmit} className="space-y-6">
        <div>
          <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
            OTP Code
          </label>
          <input
            type="text"
            id="otp"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className={`w-full px-4 py-3 border rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.otp ? 'border-red-500' : 'border-gray-300'
            }`}
            maxLength={6}
          />
          {errors.otp && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.otp}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            'Verify OTP'
          )}
        </button>

        <button
          type="button"
          className="w-full text-blue-600 py-2 text-sm hover:text-blue-700"
          onClick={() => setStep('pan')}
        >
          Resend OTP
        </button>
      </form>
    </div>
  );

  const renderConsentForm = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Aggregator Consent</h2>
        <p className="text-gray-600">
          Connect your bank accounts securely to calculate your TrustScore
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Access Permissions</h3>
        
        <div className="space-y-4">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Transaction History</p>
              <p className="text-sm text-gray-600">Last 12 months of transaction data for income and spending analysis</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Account Balances</p>
              <p className="text-sm text-gray-600">Current and historical balance information for savings analysis</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Investment Details</p>
              <p className="text-sm text-gray-600">SIP, mutual fund, and other investment information</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Your Data is Safe</p>
            <ul className="space-y-1">
              <li>• Data is encrypted with bank-grade security</li>
              <li>• We never store your banking passwords</li>
              <li>• You can revoke access anytime</li>
              <li>• Consent expires in 12 months</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={() => setStep('pan')}
          className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={handleConsentAccept}
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            'Accept & Continue'
          )}
        </button>
      </div>
    </div>
  );

  const renderCalculating = () => (
    <div className="max-w-md mx-auto text-center">
      <div className="mb-8">
        <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Calculating Your TrustScore</h2>
        <p className="text-gray-600 mb-6">
          Analyzing your financial behavior across multiple factors...
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-sm text-green-800">✓ Income stability analysis</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-sm text-green-800">✓ Savings rate calculation</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-800">⏳ Payment behavior scoring</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <span className="text-sm text-gray-600">⏳ Investment activity assessment</span>
        </div>
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Your TrustScore is Ready!</h2>
        <p className="text-gray-600">Based on your comprehensive financial behavior analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Score Display */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8">
          <div className="text-center">
            <div className="text-6xl font-bold text-blue-600 mb-2">742</div>
            <div className="text-lg text-gray-700 mb-4">Excellent Score</div>
            <div className="flex justify-center mb-6">
              <div className="w-64 bg-gray-200 rounded-full h-3">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full" style={{ width: '74%' }}></div>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              You're in the top 25% of TrustBridge users
            </p>
          </div>
        </div>

        {/* Score Analysis */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Score Analysis</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Income Stability</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <span className="text-sm font-medium text-green-600">+42</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Savings Rate</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '72%' }}></div>
                </div>
                <span className="text-sm font-medium text-blue-600">+28</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Payment Behavior</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '90%' }}></div>
                </div>
                <span className="text-sm font-medium text-purple-600">+38</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Investment Activity</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                </div>
                <span className="text-sm font-medium text-orange-600">+15</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 mr-4">
          View Detailed Report
        </button>
        <button className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50">
          Compare Loan Offers
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-center space-x-8">
            {[
              { key: 'pan', label: 'Verify Identity', active: step === 'pan' },
              { key: 'otp', label: 'OTP Verification', active: step === 'otp' },
              { key: 'consent', label: 'Account Access', active: step === 'consent' },
              { key: 'calculating', label: 'Calculate Score', active: step === 'calculating' },
              { key: 'result', label: 'Your TrustScore', active: step === 'result' },
            ].map((stepItem, index) => (
              <div key={stepItem.key} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  stepItem.active 
                    ? 'bg-blue-600 text-white' 
                    : ['pan', 'otp', 'consent'].includes(step) && index < ['pan', 'otp', 'consent', 'calculating', 'result'].indexOf(step)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <span className={`ml-2 text-sm ${stepItem.active ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                  {stepItem.label}
                </span>
                {index < 4 && <div className="w-8 h-px bg-gray-300 mx-4"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {step === 'pan' && renderPANForm()}
          {step === 'otp' && renderOTPForm()}
          {step === 'consent' && renderConsentForm()}
          {step === 'calculating' && renderCalculating()}
          {step === 'result' && renderResult()}
        </div>
      </div>
    </div>
  );
};

export default ScorePage;