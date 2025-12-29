import React from 'react';
import { Shield, Lock, Eye, FileText, Award, Users, TrendingUp, CheckCircle, AlertTriangle, Globe } from 'lucide-react';

const AboutPage: React.FC = () => {
  const trustIndicators = [
    {
      icon: Shield,
      title: 'RBI Compliant',
      description: 'Fully compliant with Reserve Bank of India regulations and Account Aggregator framework',
      status: 'verified'
    },
    {
      icon: Lock,
      title: 'Bank-Grade Security',
      description: 'AES-256 encryption, secure token management, and zero-knowledge architecture',
      status: 'verified'
    },
    {
      icon: Eye,
      title: 'Data Transparency',
      description: 'Complete visibility into what data we access and how we use it for scoring',
      status: 'verified'
    },
    {
      icon: FileText,
      title: 'Consent Management',
      description: 'Granular consent controls with easy revocation and data deletion options',
      status: 'verified'
    }
  ];

  const complianceBadges = [
    {
      name: 'RBI Account Aggregator',
      description: 'Licensed under RBI AA framework',
      logo: '🏛️',
      verified: true
    },
    {
      name: 'ISO 27001',
      description: 'Information Security Management',
      logo: '🔒',
      verified: true
    },
    {
      name: 'SOC 2 Type II',
      description: 'Security & Availability Controls',
      logo: '🛡️',
      verified: true
    },
    {
      name: 'GDPR Compliant',
      description: 'Global Data Protection Standards',
      logo: '🌍',
      verified: true
    }
  ];

  const securityFeatures = [
    {
      title: 'Zero Data Storage',
      description: 'We never store your banking credentials or sensitive financial data',
      icon: AlertTriangle
    },
    {
      title: 'Encrypted Transit',
      description: 'All data transmission uses TLS 1.3 encryption with perfect forward secrecy',
      icon: Lock
    },
    {
      title: 'Consent-First',
      description: 'Every data access requires explicit consent with clear purpose and duration',
      icon: CheckCircle
    },
    {
      title: 'Audit Trails',
      description: 'Complete audit logs of all data access and processing activities',
      icon: FileText
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">About TrustBridge</h1>
          <p className="text-xl text-blue-100 mb-8">
            Democratizing credit access through alternative scoring and financial inclusion
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-blue-200" />
              <h3 className="text-2xl font-bold">50M+</h3>
              <p className="text-blue-200">Credit-thin Indians</p>
            </div>
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-blue-200" />
              <h3 className="text-2xl font-bold">60%</h3>
              <p className="text-blue-200">Lower interest rates</p>
            </div>
            <div className="text-center">
              <Award className="h-12 w-12 mx-auto mb-4 text-blue-200" />
              <h3 className="text-2xl font-bold">RBI</h3>
              <p className="text-blue-200">Compliant platform</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              TrustBridge bridges the credit gap in India by leveraging alternative data sources 
              to create comprehensive credit profiles for the underserved population.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">The Problem</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  50+ million Indians lack traditional credit history
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  High interest rates (15-25%) for thin-file borrowers
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  Limited access to formal credit products
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  Reliance on expensive informal lending
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Our Solution</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Alternative credit scoring using banking data
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  RBI-compliant Account Aggregator framework
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Transparent, explainable credit assessments
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Access to competitive loan rates (8-12%)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Trust & Security</h2>
            <p className="text-lg text-gray-600">
              Your financial data security is our top priority
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {trustIndicators.map((indicator, index) => (
              <div key={index} className="text-center">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <indicator.icon className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{indicator.title}</h3>
                <p className="text-sm text-gray-600">{indicator.description}</p>
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Compliance Badges */}
          <div className="bg-gray-50 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-gray-900 text-center mb-8">Compliance & Certifications</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {complianceBadges.map((badge, index) => (
                <div key={index} className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <div className="text-3xl mb-2">{badge.logo}</div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">{badge.name}</h4>
                  <p className="text-xs text-gray-600 mb-2">{badge.description}</p>
                  {badge.verified && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Security Features */}
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Security Architecture</h2>
            <p className="text-lg text-gray-600">
              Built with security-first principles and zero-trust architecture
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {securityFeatures.map((feature, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-start">
                  <div className="bg-blue-100 rounded-lg p-3 mr-4">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Privacy */}
      <div className="bg-blue-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Data, Your Control</h2>
            <p className="text-lg text-gray-600 mb-8">
              Complete transparency and control over your financial data
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <Eye className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Full Transparency</h3>
                <p className="text-sm text-gray-600">
                  See exactly what data we access and how it's used in your credit score
                </p>
              </div>
              
              <div className="text-center">
                <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Granular Consent</h3>
                <p className="text-sm text-gray-600">
                  Choose which accounts to connect and what data to share
                </p>
              </div>
              
              <div className="text-center">
                <Globe className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Easy Revocation</h3>
                <p className="text-sm text-gray-600">
                  Revoke consent and delete your data anytime with one click
                </p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 text-center">
                <strong>Privacy Commitment:</strong> We never sell your data, never store banking credentials, 
                and provide complete audit trails of all data access.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact & Support */}
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Questions or Concerns?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Our team is here to help with any questions about security, privacy, or how TrustBridge works.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Security Team</h3>
              <p className="text-sm text-gray-600 mb-3">Report security issues</p>
              <a href="mailto:security@trustbridge.in" className="text-blue-600 hover:text-blue-700 text-sm">
                security@trustbridge.in
              </a>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Privacy Officer</h3>
              <p className="text-sm text-gray-600 mb-3">Data privacy questions</p>
              <a href="mailto:privacy@trustbridge.in" className="text-blue-600 hover:text-blue-700 text-sm">
                privacy@trustbridge.in
              </a>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Support Team</h3>
              <p className="text-sm text-gray-600 mb-3">General support</p>
              <a href="mailto:support@trustbridge.in" className="text-blue-600 hover:text-blue-700 text-sm">
                support@trustbridge.in
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;