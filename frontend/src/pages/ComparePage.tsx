import React, { useState } from 'react';
import { TrendingDown, Shield, CheckCircle, AlertCircle, ArrowRight, Building, Percent, Clock, Star } from 'lucide-react';

const ComparePage: React.FC = () => {
  const [selectedLoanType, setSelectedLoanType] = useState<'personal' | 'business' | 'home'>('personal');
  const [loanAmount, setLoanAmount] = useState(500000);
  const [tenure, setTenure] = useState(24);

  // Mock user data
  const userScore = 742;
  const isEligible = userScore >= 650;
  const maxCreditLimit = 750000;

  // Mock loan offers from partner banks
  const loanOffers = [
    {
      bankName: 'HDFC Bank',
      logo: '🏦',
      interestRate: 8.5,
      processingFee: 1.5,
      maxAmount: 750000,
      tenure: '12-60 months',
      approval: '24 hours',
      rating: 4.8,
      features: ['No collateral', 'Instant approval', 'Flexible EMI'],
      trustBridgeRate: true,
      originalRate: 14.5,
      savings: 6.0
    },
    {
      bankName: 'ICICI Bank',
      logo: '🏛️',
      interestRate: 9.2,
      processingFee: 2.0,
      maxAmount: 600000,
      tenure: '12-48 months',
      approval: '48 hours',
      rating: 4.6,
      features: ['Digital process', 'Quick disbursal', 'No hidden charges'],
      trustBridgeRate: true,
      originalRate: 15.2,
      savings: 6.0
    },
    {
      bankName: 'Axis Bank',
      logo: '🏢',
      interestRate: 9.8,
      processingFee: 1.8,
      maxAmount: 500000,
      tenure: '12-36 months',
      approval: '72 hours',
      rating: 4.4,
      features: ['Competitive rates', 'Easy documentation', 'Customer support'],
      trustBridgeRate: true,
      originalRate: 16.8,
      savings: 7.0
    },
    {
      bankName: 'Traditional Bank',
      logo: '🏪',
      interestRate: 18.5,
      processingFee: 3.0,
      maxAmount: 300000,
      tenure: '12-24 months',
      approval: '7-10 days',
      rating: 3.8,
      features: ['Standard process', 'Branch visit required', 'Extensive paperwork'],
      trustBridgeRate: false,
      originalRate: 18.5,
      savings: 0
    }
  ];

  const calculateEMI = (principal: number, rate: number, months: number) => {
    const monthlyRate = rate / 100 / 12;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                (Math.pow(1 + monthlyRate, months) - 1);
    return Math.round(emi);
  };

  const renderEligibilityCard = () => (
    <div className={`rounded-2xl shadow-lg p-6 ${isEligible ? 'bg-gradient-to-br from-green-50 to-emerald-100' : 'bg-gradient-to-br from-red-50 to-pink-100'}`}>
      <div className="text-center">
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
          isEligible ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {isEligible ? (
            <CheckCircle className="h-8 w-8 text-green-600" />
          ) : (
            <AlertCircle className="h-8 w-8 text-red-600" />
          )}
        </div>
        
        <h2 className={`text-2xl font-bold mb-2 ${isEligible ? 'text-green-800' : 'text-red-800'}`}>
          {isEligible ? 'You\'re Eligible!' : 'Not Eligible Yet'}
        </h2>
        
        <p className={`text-lg mb-4 ${isEligible ? 'text-green-700' : 'text-red-700'}`}>
          {isEligible 
            ? `With your TrustScore of ${userScore}, you qualify for premium rates`
            : `Your TrustScore of ${userScore} needs improvement for loan eligibility`
          }
        </p>

        {isEligible && (
          <div className="bg-white bg-opacity-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-green-700">Maximum Credit Limit</p>
                <p className="text-2xl font-bold text-green-800">₹{maxCreditLimit.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-green-700">Interest Rate From</p>
                <p className="text-2xl font-bold text-green-800">8.5%</p>
              </div>
            </div>
          </div>
        )}

        {!isEligible && (
          <div className="bg-white bg-opacity-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-700 mb-2">To become eligible:</p>
            <ul className="text-sm text-red-600 space-y-1">
              <li>• Improve your TrustScore to 650+</li>
              <li>• Connect more bank accounts</li>
              <li>• Maintain consistent savings</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  const renderLoanCalculator = () => (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Loan Calculator</h3>
      
      {/* Loan Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Loan Type</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'personal', label: 'Personal Loan' },
            { key: 'business', label: 'Business Loan' },
            { key: 'home', label: 'Home Loan' }
          ].map((type) => (
            <button
              key={type.key}
              onClick={() => setSelectedLoanType(type.key as any)}
              className={`p-3 rounded-lg border text-sm font-medium ${
                selectedLoanType === type.key
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loan Amount */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Loan Amount: ₹{loanAmount.toLocaleString()}
        </label>
        <input
          type="range"
          min="100000"
          max="1000000"
          step="50000"
          value={loanAmount}
          onChange={(e) => setLoanAmount(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>₹1L</span>
          <span>₹10L</span>
        </div>
      </div>

      {/* Tenure */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tenure: {tenure} months
        </label>
        <input
          type="range"
          min="12"
          max="60"
          step="6"
          value={tenure}
          onChange={(e) => setTenure(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>12 months</span>
          <span>60 months</span>
        </div>
      </div>
    </div>
  );

  const renderLoanOffers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">Available Offers</h3>
        <div className="flex items-center text-sm text-gray-600">
          <TrendingDown className="h-4 w-4 mr-1 text-green-500" />
          Rates up to 60% lower with TrustBridge
        </div>
      </div>

      {loanOffers.map((offer, index) => {
        const emi = calculateEMI(loanAmount, offer.interestRate, tenure);
        const totalAmount = emi * tenure;
        const totalInterest = totalAmount - loanAmount;

        return (
          <div key={index} className={`bg-white rounded-2xl shadow-lg p-6 border-2 ${
            offer.trustBridgeRate ? 'border-blue-200' : 'border-gray-200'
          }`}>
            {offer.trustBridgeRate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-4">
                <div className="flex items-center justify-center">
                  <Shield className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">TrustBridge Partner Rate</span>
                </div>
              </div>
            )}

            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="text-3xl mr-3">{offer.logo}</div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{offer.bankName}</h4>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 mr-1" />
                    <span className="text-sm text-gray-600">{offer.rating} rating</span>
                  </div>
                </div>
              </div>

              {offer.trustBridgeRate && (
                <div className="text-right">
                  <div className="text-sm text-gray-500 line-through">
                    {offer.originalRate}% original rate
                  </div>
                  <div className="text-sm font-medium text-green-600">
                    Save {offer.savings}% with TrustBridge
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <Percent className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <p className="text-sm text-gray-600">Interest Rate</p>
                <p className="text-lg font-bold text-gray-900">{offer.interestRate}%</p>
              </div>

              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <Building className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-sm text-gray-600">EMI</p>
                <p className="text-lg font-bold text-gray-900">₹{emi.toLocaleString()}</p>
              </div>

              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                <p className="text-sm text-gray-600">Processing</p>
                <p className="text-lg font-bold text-gray-900">{offer.processingFee}%</p>
              </div>

              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-orange-600 mx-auto mb-1" />
                <p className="text-sm text-gray-600">Approval</p>
                <p className="text-lg font-bold text-gray-900">{offer.approval}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Key Features:</p>
              <div className="flex flex-wrap gap-2">
                {offer.features.map((feature, idx) => (
                  <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                <p>Total Interest: ₹{totalInterest.toLocaleString()}</p>
                <p>Total Amount: ₹{totalAmount.toLocaleString()}</p>
              </div>

              <button className={`px-6 py-2 rounded-lg font-semibold flex items-center ${
                offer.trustBridgeRate
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}>
                Apply Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderComparisonChart = () => (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Interest Rate Comparison</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Traditional Banks</span>
          <div className="flex items-center space-x-2">
            <div className="w-32 bg-gray-200 rounded-full h-3">
              <div className="bg-red-500 h-3 rounded-full" style={{ width: '85%' }}></div>
            </div>
            <span className="text-sm font-medium">15-22%</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">NBFCs</span>
          <div className="flex items-center space-x-2">
            <div className="w-32 bg-gray-200 rounded-full h-3">
              <div className="bg-orange-500 h-3 rounded-full" style={{ width: '75%' }}></div>
            </div>
            <span className="text-sm font-medium">12-18%</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 font-medium">TrustBridge Partners</span>
          <div className="flex items-center space-x-2">
            <div className="w-32 bg-gray-200 rounded-full h-3">
              <div className="bg-green-500 h-3 rounded-full" style={{ width: '45%' }}></div>
            </div>
            <span className="text-sm font-medium text-green-600">8.5-12%</span>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-800">
          <strong>Your Savings:</strong> With your TrustScore of {userScore}, you can save up to 
          ₹{Math.round((18.5 - 8.5) / 100 * loanAmount * tenure / 12).toLocaleString()} 
          in interest over {tenure} months compared to traditional rates.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Compare Loan Offers</h1>
          <p className="text-gray-600">Get the best rates with your TrustScore</p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Eligibility Card */}
          <div className="lg:col-span-1">
            {renderEligibilityCard()}
          </div>

          {/* Loan Calculator */}
          <div className="lg:col-span-1">
            {renderLoanCalculator()}
          </div>

          {/* Comparison Chart */}
          <div className="lg:col-span-1">
            {renderComparisonChart()}
          </div>
        </div>

        {/* Loan Offers */}
        {isEligible && renderLoanOffers()}

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Disclaimer:</strong> Interest rates and loan terms are indicative and subject to bank approval. 
            Final rates may vary based on additional factors. TrustBridge is not a lender but facilitates connections 
            with partner financial institutions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComparePage;