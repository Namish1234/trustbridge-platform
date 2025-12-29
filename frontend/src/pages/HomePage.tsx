import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, Shield, TrendingUp, Users, CheckCircle, 
  Lock, Zap, ChevronRight 
} from 'lucide-react';

// --- COMPONENT: 3D Binary Cube (Unchanged) ---
const BinaryCube = () => {
  const [binaryContent, setBinaryContent] = useState<string[]>(Array(6).fill(''));

  const generateBinary = () => {
    const rows = 8;
    const cols = 8;
    return Array.from({ length: rows * cols }, () => Math.random() > 0.5 ? '1' : '0').join(' ');
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setBinaryContent(prev => prev.map(() => generateBinary()));
    }, 150);
    return () => clearInterval(interval);
  }, []);

  const faceStyle: React.CSSProperties = {
    position: 'absolute',
    width: '200px',
    height: '200px',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    background: 'rgba(15, 23, 42, 0.85)',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontFamily: 'monospace',
    lineHeight: '1',
    wordBreak: 'break-all',
    padding: '10px',
    color: '#3b82f6',
    boxShadow: '0 0 15px rgba(59, 130, 246, 0.2) inset',
    backfaceVisibility: 'visible',
  };

  return (
    <div className="relative w-[200px] h-[200px] perspective-[1000px]">
      <style>
        {`
          @keyframes rotateCube {
            0% { transform: rotateX(0deg) rotateY(0deg); }
            100% { transform: rotateX(360deg) rotateY(360deg); }
          }
        `}
      </style>
      <div 
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          animation: 'rotateCube 20s infinite linear'
        }}
      >
        <div style={{ ...faceStyle, transform: 'translateZ(100px)' }}>{binaryContent[0]}</div>
        <div style={{ ...faceStyle, transform: 'rotateY(180deg) translateZ(100px)' }}>{binaryContent[1]}</div>
        <div style={{ ...faceStyle, transform: 'rotateY(90deg) translateZ(100px)' }}>{binaryContent[2]}</div>
        <div style={{ ...faceStyle, transform: 'rotateY(-90deg) translateZ(100px)' }}>{binaryContent[3]}</div>
        <div style={{ ...faceStyle, transform: 'rotateX(90deg) translateZ(100px)' }}>{binaryContent[4]}</div>
        <div style={{ ...faceStyle, transform: 'rotateX(-90deg) translateZ(100px)' }}>{binaryContent[5]}</div>
      </div>
    </div>
  );
};

// --- COMPONENT: Endless Scrolling Badge (Soft Rectangular) ---
const ScrollingTrustBadge = () => {
  const items = [
    "RBI Account Aggregator Approved",
    "ISO 27001 Certified Security",
    "Real-time Credit Analysis",
    "256-bit Encryption",
    "100% Paperless Process"
  ];

  return (
    // Replaced rounded-sm with rounded-lg for smoother corners
    <div className="relative flex overflow-hidden max-w-md bg-blue-500/10 border border-blue-500/20 rounded-lg py-1.5 px-4 mb-6">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10"></div>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10"></div>

      <div className="flex whitespace-nowrap animate-scroll">
        {[...items, ...items].map((item, idx) => (
          <div key={idx} className="flex items-center mx-4 text-blue-400 text-sm font-medium">
            {/* Soft square dots */}
            <span className="w-1.5 h-1.5 rounded-sm bg-emerald-400 mr-3 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
            {item}
          </div>
        ))}
      </div>
      
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 20s linear infinite;
        }
      `}</style>
    </div>
  );
};

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-500/30">
      
      {/* ========================================
        HERO SECTION
        ========================================
      */}
      <section className="relative overflow-hidden bg-slate-900 pt-20 pb-32">
        
        {/* Abstract Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none">
           <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[100px]" />
           <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-6 pt-10"> 
              
              <ScrollingTrustBadge />

              <h1 className="text-5xl lg:text-7xl font-bold text-white tracking-tight leading-tight">
                Credit scores for the <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                  modern world.
                </span>
              </h1>
              
              <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
                Traditional credit scores ignore your real financial potential. 
                TrustBridge analyzes your cash flow, savings, and investments to 
                unlock the capital you deserve.
              </p>
              
              {/* Soft Rectangular Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link
                  to="/score"
                  // Changed rounded-sm to rounded-lg (The "Modern App" button shape)
                  className="group inline-flex items-center justify-center px-8 py-4 bg-white text-slate-900 font-bold rounded-lg hover:bg-blue-50 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  Check My Score
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/about"
                  // Changed rounded-sm to rounded-lg
                  className="inline-flex items-center justify-center px-8 py-4 bg-slate-800 text-white font-medium rounded-lg border border-slate-700 hover:bg-slate-700 transition-all"
                >
                  How it Works
                </Link>
              </div>

              <div className="flex items-center gap-6 text-sm font-medium text-slate-500 pt-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span>Bank-Grade Security</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span>10k+ Early Users</span>
                </div>
              </div>
            </div>

            {/* Right Content - GLASSMORPHISM CARD */}
            <div className="relative mx-auto w-full max-w-md perspective-1000">
              {/* Changed rounded-lg to rounded-2xl (Soft Box) */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl blur opacity-30 animate-pulse"></div>
              
              {/* Changed rounded-lg to rounded-2xl */}
              <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-700 p-8 rounded-2xl shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">TrustScore Beta</h3>
                    <p className="text-white font-medium text-lg">Namish Shukla</p>
                  </div>
                  {/* Changed rounded-md to rounded-xl */}
                  <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                    <Shield className="h-5 w-5 text-emerald-400" />
                  </div>
                </div>

                <div className="text-center py-6">
                  <span className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 tracking-tighter">
                    742
                  </span>
                  <div className="flex justify-center mt-4">
                    {/* Changed rounded-sm to rounded-md */}
                    <span className="px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wide border border-emerald-500/20">
                      Excellent • Top 15%
                    </span>
                  </div>
                </div>

                <div className="space-y-4 mt-8">
                  {[
                    { label: 'Income Stability', val: '92%', color: 'bg-emerald-500' },
                    { label: 'Savings Rate', val: '78%', color: 'bg-blue-500' },
                    { label: 'Bill Payments', val: '88%', color: 'bg-indigo-500' }
                  ].map((item, idx) => (
                    <div key={idx} className="group">
                      <div className="flex justify-between text-sm text-slate-400 mb-1 group-hover:text-white transition-colors">
                        <span>{item.label}</span>
                        <span>{item.val}</span>
                      </div>
                      {/* Changed rounded-sm to rounded-md */}
                      <div className="h-2 w-full bg-slate-800 rounded-md overflow-hidden">
                        <div 
                          className={`h-full ${item.color} rounded-md transition-all duration-1000 ease-out`} 
                          style={{ width: item.val }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Changed rounded-lg to rounded-2xl */}
              <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce-slow hidden md:flex border border-slate-100">
                {/* Changed rounded-sm to rounded-lg */}
                <div className="bg-green-100 p-2 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Rate Unlock</p>
                  <p className="text-gray-900 font-bold">12.5% → 8.2%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
        DATA CORE SECTION
        ========================================
      */}
      <section className="bg-slate-900 border-t border-slate-800 py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-16">
            
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Powered by Intelligent <br/>
                <span className="text-blue-500">Data Processing</span>
              </h2>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                Our core engine processes thousands of data points in real-time. 
                From transaction categorization to spending patterns, we turn raw 
                binary data into actionable financial trust.
              </p>
              
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-3xl font-bold text-white mb-1">50+</div>
                  <div className="text-sm text-slate-500">Data Points Analyzed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-1">200ms</div>
                  <div className="text-sm text-slate-500">Processing Speed</div>
                </div>
              </div>
            </div>

            <div className="relative flex justify-center items-center py-10 md:py-0">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
               <BinaryCube />
            </div>

          </div>
        </div>
      </section>

      {/* ========================================
        STATS SECTION (Bento Grid)
        ========================================
      */}
      <section className="py-24 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              The System is Broken. <br />
              <span className="text-blue-600">We Fixed It.</span>
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Millions of credit-worthy Indians are stuck in the "Credit Gap." 
              We use alternative data to bridge the divide.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Underserved Indians', value: '160M+', desc: 'Credit-thin individuals', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Grey Market Rates', value: '24-36%', desc: 'Predatory interest rates', icon: TrendingUp, color: 'text-red-500', bg: 'bg-red-50' },
              { label: 'TrustBridge Rates', value: '8-12%', desc: 'Fair, bank-grade loans', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Avg Limit Unlock', value: '₹2.5L', desc: 'Instant credit access', icon: Lock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            ].map((stat, idx) => (
              // Changed rounded-lg to rounded-2xl (Soft Square)
              <div key={idx} className="group p-8 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                {/* Changed rounded-md to rounded-xl */}
                <div className={`${stat.bg} w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">{stat.value}</h3>
                <p className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-1">{stat.label}</p>
                <p className="text-sm text-slate-500">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================
        HOW IT WORKS
        ========================================
      */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">How TrustBridge Works</h2>
              <p className="text-slate-600 mt-2">Three steps to your financial freedom.</p>
            </div>
            <Link to="/about" className="text-blue-600 font-semibold flex items-center hover:text-blue-700">
              View full documentation <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Connect Accounts',
                desc: 'Securely link your bank account via the RBI Account Aggregator framework. No paperwork needed.',
                icon: Lock,
                step: '01'
              },
              {
                title: 'AI Analysis',
                desc: 'Our engine analyzes 50+ alternative data points including savings consistency and utility payments.',
                icon: Zap,
                step: '02'
              },
              {
                title: 'Get Funded',
                desc: 'Receive instant loan offers from partner banks at fair interest rates tailored to your real profile.',
                icon: CheckCircle,
                step: '03'
              }
            ].map((card, idx) => (
              // Changed rounded-lg to rounded-2xl
              <div key={idx} className="relative bg-white p-8 rounded-2xl shadow-sm border border-slate-100 overflow-hidden group hover:border-blue-100 transition-colors">
                <div className="absolute top-0 right-0 p-8 opacity-10 font-black text-6xl text-slate-900 select-none group-hover:opacity-20 transition-opacity">
                  {card.step}
                </div>
                {/* Changed rounded-md to rounded-xl */}
                <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:bg-blue-600 transition-colors">
                  <card.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{card.title}</h3>
                <p className="text-slate-600 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================
        CTA SECTION
        ========================================
      */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Changed rounded-xl to rounded-3xl (Softer container) */}
          <div className="relative overflow-hidden rounded-3xl bg-blue-600 px-8 py-16 text-center shadow-2xl md:px-16">
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            <div className="relative z-10">
              <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to find out your <br/> real worth?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-blue-100">
                Join thousands of users who have unlocked better financial opportunities. No credit history required.
              </p>
              <div className="mt-10 flex justify-center gap-4">
                <Link
                  to="/score"
                  // Changed rounded-sm to rounded-lg
                  className="inline-flex items-center rounded-lg bg-white px-8 py-4 text-base font-bold text-blue-600 shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;