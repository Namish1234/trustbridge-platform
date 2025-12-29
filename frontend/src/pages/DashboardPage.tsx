import React, { useState } from 'react';
import { 
  TrendingUp, TrendingDown, Target, AlertCircle, CheckCircle, 
  ArrowRight, BarChart3, PieChart, Activity, RefreshCw 
} from 'lucide-react';
import { useMockData } from '../contexts/DataContext';
import { useMockAuth } from '../contexts/AuthContext';

const DashboardPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'3M' | '6M' | '1Y'>('6M');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  
  const { } = useMockAuth();
  const { 
    creditScore, 
    scoreHistory, 
    isLoading, 
    error,
    refreshScore,
    syncAccountData 
  } = useMockData();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshScore = async () => {
    setIsRefreshing(true);
    try { await refreshScore(); } 
    catch (error) { console.error('Failed to refresh score:', error); } 
    finally { setIsRefreshing(false); }
  };

  const handleSyncData = async () => {
    setIsRefreshing(true);
    try { await syncAccountData(); } 
    catch (error) { console.error('Failed to sync data:', error); } 
    finally { setIsRefreshing(false); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // --- Data Preparation ---
  const currentScore = creditScore?.score || 0;
  const previousScore = scoreHistory.length > 1 ? scoreHistory[scoreHistory.length - 2].score : currentScore;
  const scoreChange = currentScore - previousScore;
  
  // Prepare Graph Data
  const graphData = scoreHistory.map((item) => ({
    label: new Date(item.date).toLocaleDateString('en-US', { month: 'short' }),
    value: item.score
  }));

  const factors = creditScore?.factors.map(factor => ({
    name: factor.name,
    current: factor.value,
    change: Math.floor(Math.random() * 10) - 5,
    trend: factor.impact === 'positive' ? 'up' : factor.impact === 'negative' ? 'down' : 'stable',
    color: factor.impact === 'positive' ? 'green' : factor.impact === 'negative' ? 'red' : 'blue'
  })) || [];

  const recentTransactions = [
    { date: '2024-01-15', description: 'Salary Credit', amount: 75000, type: 'credit', impact: '+2 points' },
    { date: '2024-01-14', description: 'SIP Investment', amount: -5000, type: 'debit', impact: '+1 point' },
    { date: '2024-01-12', description: 'Utility Payment', amount: -2500, type: 'debit', impact: '+1 point' },
    { date: '2024-01-10', description: 'Rent Payment', amount: -25000, type: 'debit', impact: 'No impact' },
  ];

  const recommendations = [
    {
      priority: 'high',
      title: 'Increase Investment Frequency',
      description: 'Your investment activity decreased this month. Consider increasing your SIP amount.',
      potentialImpact: '+15 points',
      timeframe: '2-3 months'
    },
    {
      priority: 'medium',
      title: 'Maintain Savings Rate',
      description: 'Great job on maintaining a 22% savings rate. Keep it up!',
      potentialImpact: '+5 points',
      timeframe: '1 month'
    },
    {
      priority: 'low',
      title: 'Diversify Investments',
      description: 'Consider adding equity investments to your portfolio for better scoring.',
      potentialImpact: '+8 points',
      timeframe: '3-6 months'
    }
  ];

  // --- Graph Calculation Helpers (The Fix) ---
  const CHART_HEIGHT = 200;
  const CHART_WIDTH = 600;
  const PADDING_X = 40;
  const PADDING_Y = 20;
  const MAX_SCORE = 850;
  const MIN_SCORE = 450;

  const getX = (index: number) => {
    const availableWidth = CHART_WIDTH - (PADDING_X * 2);
    return PADDING_X + (index * (availableWidth / (Math.max(graphData.length - 1, 1))));
  };

  const getY = (score: number) => {
    const availableHeight = CHART_HEIGHT - (PADDING_Y * 2);
    const percentage = (score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE);
    return (CHART_HEIGHT - PADDING_Y) - (percentage * availableHeight);
  };

  // Generate dynamic path so line meets dots perfectly
  const linePathPoints = graphData.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');
  const areaPathPoints = `${linePathPoints} ${getX(graphData.length - 1)},${CHART_HEIGHT} ${getX(0)},${CHART_HEIGHT}`;

  // --- Render Functions ---

  const renderScoreChart = () => (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Score Trend</h2>
        <div className="flex space-x-2">
          {(['3M', '6M', '1Y'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Score Chart SVG */}
      <div className="relative h-64 mb-4">
        <svg className="w-full h-full" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[1, 2, 3, 4].map((i) => {
            const y = (CHART_HEIGHT / 5) * i;
            return (
              <line 
                key={i} 
                x1="0" y1={y} x2={CHART_WIDTH} y2={y} 
                stroke="#f3f4f6" strokeWidth="1" 
              />
            );
          })}

          {/* Area Fill (Gradient under curve) */}
          <path
            d={`M ${areaPathPoints} Z`}
            fill="url(#scoreGradient)"
            stroke="none"
          />

          {/* Main Line (Dynamic Calculation) */}
          <polyline
            points={linePathPoints}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points & Tooltips */}
          {graphData.map((d, i) => {
            const x = getX(i);
            const y = getY(d.value);
            const isHovered = hoveredPoint === i;

            return (
              <g 
                key={i} 
                onMouseEnter={() => setHoveredPoint(i)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer"
              >
                {/* Invisible Hit Area */}
                <circle cx={x} cy={y} r="20" fill="transparent" />
                
                {/* Visible Dot */}
                <circle 
                  cx={x} cy={y} 
                  r={isHovered ? 6 : 4} 
                  fill={isHovered ? "#3b82f6" : "#ffffff"}
                  stroke="#3b82f6" 
                  strokeWidth="2.5"
                  className="transition-all duration-200"
                />

                {/* Tooltip */}
                {isHovered && (
                  <g transform={`translate(${x}, ${y - 45})`}>
                    <rect 
                      x="-35" y="0" width="70" height="35" 
                      rx="6" fill="#1e293b" 
                      filter="drop-shadow(0px 4px 6px rgba(0,0,0,0.1))"
                    />
                    <path d="M -6 35 L 6 35 L 0 41 Z" fill="#1e293b" />
                    <text x="0" y="15" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="500">{d.label}</text>
                    <text x="0" y="28" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{d.value}</text>
                  </g>
                )}
                
                {/* Labels on X-axis */}
                {!hoveredPoint && (
                  <text 
                    x={x} y={CHART_HEIGHT - 5} 
                    textAnchor="middle" 
                    fill="#94a3b8" 
                    fontSize="10"
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-0.5 bg-blue-500 mr-2"></div>
          <span className="text-gray-600">Your TrustScore</span>
        </div>
      </div>
    </div>
  );

  const renderCurrentScore = () => (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-lg p-6">
      <div className="text-center">
        <div className="text-5xl font-bold text-blue-600 mb-2">{currentScore}</div>
        <div className="text-lg text-gray-700 mb-4">Excellent Score</div>
        
        <div className="flex items-center justify-center mb-4">
          {scoreChange > 0 ? (
            <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-500 mr-2" />
          )}
          <span className={`text-sm font-medium ${scoreChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {scoreChange > 0 ? '+' : ''}{scoreChange} points this month
          </span>
        </div>

        <div className="flex justify-center mb-4">
          <div className="w-48 bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full" 
              style={{ width: `${(currentScore - 300) / 550 * 100}%` }}
            ></div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          You're in the top 25% of TrustBridge users
        </p>

        <div className="bg-white bg-opacity-50 rounded-lg p-3">
          <p className="text-xs text-gray-600 mb-1">Next milestone</p>
          <p className="text-sm font-medium text-gray-800">Reach 780 for Premium rates</p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '65%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFactorBreakdown = () => (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Score Factors</h3>
      
      <div className="space-y-4">
        {factors.map((factor, index) => (
          <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full bg-${factor.color}-500`}></div>
              <span className="font-medium text-gray-900">{factor.name}</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">{factor.current}%</div>
                <div className={`text-sm flex items-center ${
                  factor.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {factor.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {factor.change > 0 ? '+' : ''}{factor.change}
                </div>
              </div>
              
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div 
                  className={`bg-${factor.color}-500 h-2 rounded-full`}
                  style={{ width: `${factor.current}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRecentActivity = () => (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Recent Activity</h3>
        <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
          View All
        </button>
      </div>
      
      <div className="space-y-4">
        {recentTransactions.map((transaction, index) => (
          <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${
                transaction.type === 'credit' ? 'bg-green-500' : 'bg-blue-500'
              }`}></div>
              <div>
                <p className="font-medium text-gray-900">{transaction.description}</p>
                <p className="text-sm text-gray-500">{transaction.date}</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className={`font-semibold ${
                transaction.type === 'credit' ? 'text-green-600' : 'text-gray-900'
              }`}>
                {transaction.type === 'credit' ? '+' : '-'}₹{Math.abs(transaction.amount).toLocaleString()}
              </p>
              <p className="text-xs text-blue-600">{transaction.impact}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRecommendations = () => (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Recommendations</h3>
      
      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <div key={index} className={`p-4 rounded-lg border-l-4 ${
            rec.priority === 'high' ? 'border-red-500 bg-red-50' :
            rec.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
            'border-green-500 bg-green-50'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  {rec.priority === 'high' ? (
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  ) : rec.priority === 'medium' ? (
                    <Target className="h-4 w-4 text-yellow-500 mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  )}
                  <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                </div>
                <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Impact: {rec.potentialImpact}</span>
                  <span>Timeframe: {rec.timeframe}</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 ml-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderQuickStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center">
          <div className="p-3 bg-blue-100 rounded-lg">
            <BarChart3 className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Monthly Income</p>
            <p className="text-2xl font-bold text-gray-900">₹75,000</p>
            <p className="text-sm text-green-600">+5% from last month</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center">
          <div className="p-3 bg-green-100 rounded-lg">
            <PieChart className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Savings Rate</p>
            <p className="text-2xl font-bold text-gray-900">22%</p>
            <p className="text-sm text-green-600">Above average</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Activity className="h-6 w-6 text-purple-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Credit Utilization</p>
            <p className="text-2xl font-bold text-gray-900">N/A</p>
            <p className="text-sm text-gray-500">No credit history</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Financial Dashboard</h1>
            <p className="text-gray-600">Track your TrustScore and financial health in real-time</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSyncData}
              disabled={isRefreshing}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Syncing...' : 'Sync Data'}
            </button>
            <button
              onClick={handleRefreshScore}
              disabled={isRefreshing}
              className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Refresh Score
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        {renderQuickStats()}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Current Score */}
          <div className="lg:col-span-1">
            {renderCurrentScore()}
          </div>

          {/* Score Chart */}
          <div className="lg:col-span-2">
            {renderScoreChart()}
          </div>
        </div>

        {/* Secondary Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Factor Breakdown */}
          {renderFactorBreakdown()}

          {/* Recent Activity */}
          {renderRecentActivity()}
        </div>

        {/* Recommendations */}
        {renderRecommendations()}
      </div>
    </div>
  );
};

export default DashboardPage;