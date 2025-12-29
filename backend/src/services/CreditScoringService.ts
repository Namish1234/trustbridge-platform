import { TransactionModel } from '../models/Transaction';
import { AccountConnectionModel } from '../models/AccountConnection';
import { CreditScoreModel, CreateCreditScoreData, CreateScoreFactorData } from '../models/CreditScore';
import { UserModel } from '../models/User';
import { query } from '../config/database';

export interface ScoreAnalysis {
  incomeStability: {
    score: number;
    monthlyIncome: number;
    incomeVariability: number;
    salaryFrequency: 'monthly' | 'weekly' | 'irregular';
    consistencyMonths: number;
  };
  savingsRate: {
    score: number;
    averageSavingsRate: number;
    savingsTrend: 'increasing' | 'stable' | 'decreasing';
    emergencyFundMonths: number;
  };
  paymentBehavior: {
    score: number;
    onTimePayments: number;
    recurringPayments: number;
    overdrafts: number;
    bounceRate: number;
  };
  investmentActivity: {
    score: number;
    totalInvestments: number;
    investmentFrequency: number;
    diversificationScore: number;
    riskProfile: 'conservative' | 'moderate' | 'aggressive';
  };
}

export interface CreditScoreResult {
  score: number;
  confidence: number;
  trend: 'improving' | 'stable' | 'declining';
  factors: CreateScoreFactorData[];
  analysis: ScoreAnalysis;
  recommendations: string[];
}

export class CreditScoringService {
  // Main scoring function
  async calculateCreditScore(userId: string): Promise<CreditScoreResult> {
    try {
      console.log(`🔄 Calculating credit score for user ${userId}`);

      // Get user's transaction data (last 12 months)
      const transactions = await TransactionModel.findByUserId(userId, 1, 1000, {
        dateFrom: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        dateTo: new Date()
      });

      if (transactions.transactions.length < 10) {
        throw new Error('Insufficient transaction data for scoring');
      }

      // Analyze different aspects of financial behavior
      const incomeAnalysis = await this.analyzeIncomeStability(userId, transactions.transactions);
      const savingsAnalysis = await this.analyzeSavingsRate(userId, transactions.transactions);
      const paymentAnalysis = await this.analyzePaymentBehavior(userId, transactions.transactions);
      const investmentAnalysis = await this.analyzeInvestmentActivity(userId, transactions.transactions);

      const analysis: ScoreAnalysis = {
        incomeStability: incomeAnalysis,
        savingsRate: savingsAnalysis,
        paymentBehavior: paymentAnalysis,
        investmentActivity: investmentAnalysis
      };

      // Calculate weighted score
      const weightedScore = this.calculateWeightedScore(analysis);
      
      // Determine confidence based on data quality and quantity
      const confidence = this.calculateConfidence(transactions.transactions.length, analysis);
      
      // Determine trend
      const trend = await this.determineTrend(userId);

      // Generate score factors
      const factors = this.generateScoreFactors(analysis);

      // Generate recommendations
      const recommendations = this.generateRecommendations(analysis);

      const result: CreditScoreResult = {
        score: Math.round(weightedScore),
        confidence: Math.round(confidence * 100) / 100,
        trend,
        factors,
        analysis,
        recommendations
      };

      console.log(`✅ Credit score calculated: ${result.score} (confidence: ${result.confidence})`);
      return result;

    } catch (error) {
      console.error('❌ Credit score calculation failed:', error);
      throw error;
    }
  }

  // Analyze income stability
  private async analyzeIncomeStability(userId: string, transactions: any[]): Promise<ScoreAnalysis['incomeStability']> {
    // Filter salary/income transactions
    const incomeTransactions = transactions.filter(txn => 
      txn.type === 'credit' && 
      (txn.category === 'salary' || 
       (txn.description && txn.description.toLowerCase().includes('salary')) ||
       txn.amount > 10000) // Assume large credits are income
    );

    if (incomeTransactions.length === 0) {
      return {
        score: 300, // Minimum score
        monthlyIncome: 0,
        incomeVariability: 1,
        salaryFrequency: 'irregular',
        consistencyMonths: 0
      };
    }

    // Calculate monthly income
    const monthlyIncomes = this.groupTransactionsByMonth(incomeTransactions);
    const avgMonthlyIncome = monthlyIncomes.reduce((sum, income) => sum + income, 0) / monthlyIncomes.length;

    // Calculate income variability (coefficient of variation)
    const variance = monthlyIncomes.reduce((sum, income) => sum + Math.pow(income - avgMonthlyIncome, 2), 0) / monthlyIncomes.length;
    const stdDev = Math.sqrt(variance);
    const incomeVariability = avgMonthlyIncome > 0 ? stdDev / avgMonthlyIncome : 1;

    // Determine salary frequency
    const salaryFrequency = this.determineSalaryFrequency(incomeTransactions);

    // Count consistent months (months with income)
    const consistencyMonths = monthlyIncomes.filter(income => income > 0).length;

    // Calculate score (300-850 range)
    let score = 300;
    
    // Base score from income level
    if (avgMonthlyIncome > 100000) score += 150; // 1L+ per month
    else if (avgMonthlyIncome > 50000) score += 120; // 50K+ per month
    else if (avgMonthlyIncome > 25000) score += 90; // 25K+ per month
    else if (avgMonthlyIncome > 15000) score += 60; // 15K+ per month
    else score += 30;

    // Bonus for consistency
    if (incomeVariability < 0.2) score += 100; // Very stable
    else if (incomeVariability < 0.4) score += 70; // Stable
    else if (incomeVariability < 0.6) score += 40; // Moderately stable
    else score += 10; // Unstable

    // Bonus for frequency
    if (salaryFrequency === 'monthly') score += 50;
    else if (salaryFrequency === 'weekly') score += 30;

    // Bonus for consistency months
    score += Math.min(consistencyMonths * 10, 100);

    return {
      score: Math.min(score, 850),
      monthlyIncome: avgMonthlyIncome,
      incomeVariability,
      salaryFrequency,
      consistencyMonths
    };
  }

  // Analyze savings rate
  private async analyzeSavingsRate(userId: string, transactions: any[]): Promise<ScoreAnalysis['savingsRate']> {
    const monthlyData = this.groupTransactionsByMonth(transactions);
    const monthlyCredits = this.groupTransactionsByMonth(transactions.filter(t => t.type === 'credit'));
    const monthlyDebits = this.groupTransactionsByMonth(transactions.filter(t => t.type === 'debit'));

    const savingsRates: number[] = [];
    for (let i = 0; i < Math.min(monthlyCredits.length, monthlyDebits.length); i++) {
      const income = monthlyCredits[i];
      const expenses = monthlyDebits[i];
      if (income > 0) {
        const savingsRate = (income - expenses) / income;
        savingsRates.push(Math.max(0, savingsRate)); // Ensure non-negative
      }
    }

    const averageSavingsRate = savingsRates.length > 0 ? 
      savingsRates.reduce((sum, rate) => sum + rate, 0) / savingsRates.length : 0;

    // Determine savings trend
    let savingsTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (savingsRates.length >= 3) {
      const recentAvg = savingsRates.slice(-3).reduce((sum, rate) => sum + rate, 0) / 3;
      const earlierAvg = savingsRates.slice(0, 3).reduce((sum, rate) => sum + rate, 0) / 3;
      
      if (recentAvg > earlierAvg + 0.05) savingsTrend = 'increasing';
      else if (recentAvg < earlierAvg - 0.05) savingsTrend = 'decreasing';
    }

    // Calculate emergency fund months (simplified)
    const avgMonthlyExpenses = monthlyDebits.reduce((sum, exp) => sum + exp, 0) / monthlyDebits.length;
    const emergencyFundMonths = avgMonthlyExpenses > 0 ? (averageSavingsRate * 12) : 0;

    // Calculate score
    let score = 300;
    
    if (averageSavingsRate > 0.3) score += 150; // 30%+ savings rate
    else if (averageSavingsRate > 0.2) score += 120; // 20%+ savings rate
    else if (averageSavingsRate > 0.1) score += 90; // 10%+ savings rate
    else if (averageSavingsRate > 0.05) score += 60; // 5%+ savings rate
    else score += 20;

    // Bonus for trend
    if (savingsTrend === 'increasing') score += 50;
    else if (savingsTrend === 'stable') score += 30;

    // Bonus for emergency fund
    if (emergencyFundMonths > 6) score += 50;
    else if (emergencyFundMonths > 3) score += 30;
    else if (emergencyFundMonths > 1) score += 15;

    return {
      score: Math.min(score, 850),
      averageSavingsRate,
      savingsTrend,
      emergencyFundMonths
    };
  }

  // Analyze payment behavior
  private async analyzePaymentBehavior(userId: string, transactions: any[]): Promise<ScoreAnalysis['paymentBehavior']> {
    // Filter utility and bill payments
    const billPayments = transactions.filter(txn => 
      txn.type === 'debit' && 
      (txn.category === 'utilities' || 
       (txn.description && (
         txn.description.toLowerCase().includes('electricity') ||
         txn.description.toLowerCase().includes('water') ||
         txn.description.toLowerCase().includes('gas') ||
         txn.description.toLowerCase().includes('internet') ||
         txn.description.toLowerCase().includes('mobile')
       )))
    );

    const recurringPayments = transactions.filter(txn => txn.isRecurring && txn.type === 'debit');
    
    // Count overdrafts (negative balances)
    const overdrafts = transactions.filter(txn => txn.balance && txn.balance < 0).length;
    
    // Calculate bounce rate (simplified - based on failed transactions)
    const totalPaymentAttempts = billPayments.length + recurringPayments.length;
    const bounceRate = totalPaymentAttempts > 0 ? overdrafts / totalPaymentAttempts : 0;

    // On-time payments (simplified - assume all recorded payments are on-time)
    const onTimePayments = billPayments.length + recurringPayments.length - overdrafts;
    const onTimeRate = totalPaymentAttempts > 0 ? onTimePayments / totalPaymentAttempts : 0;

    // Calculate score
    let score = 300;
    
    // Base score from on-time payment rate
    if (onTimeRate > 0.95) score += 150; // 95%+ on-time
    else if (onTimeRate > 0.9) score += 120; // 90%+ on-time
    else if (onTimeRate > 0.8) score += 90; // 80%+ on-time
    else if (onTimeRate > 0.7) score += 60; // 70%+ on-time
    else score += 20;

    // Penalty for overdrafts
    if (overdrafts === 0) score += 100;
    else if (overdrafts <= 2) score += 50;
    else if (overdrafts <= 5) score += 20;
    // No bonus for more overdrafts

    // Bonus for recurring payments (shows financial discipline)
    if (recurringPayments.length > 10) score += 50;
    else if (recurringPayments.length > 5) score += 30;
    else if (recurringPayments.length > 2) score += 15;

    return {
      score: Math.min(score, 850),
      onTimePayments: onTimeRate,
      recurringPayments: recurringPayments.length,
      overdrafts,
      bounceRate
    };
  }

  // Analyze investment activity
  private async analyzeInvestmentActivity(userId: string, transactions: any[]): Promise<ScoreAnalysis['investmentActivity']> {
    // Filter investment transactions
    const investmentTransactions = transactions.filter(txn => 
      txn.type === 'debit' && 
      (txn.category === 'investment' || 
       (txn.description && (
         txn.description.toLowerCase().includes('sip') ||
         txn.description.toLowerCase().includes('mutual fund') ||
         txn.description.toLowerCase().includes('equity') ||
         txn.description.toLowerCase().includes('stock')
       )))
    );

    const totalInvestments = investmentTransactions.reduce((sum, txn) => sum + txn.amount, 0);
    const investmentFrequency = investmentTransactions.length;

    // Calculate diversification (simplified - based on different investment types)
    const investmentTypes = new Set(investmentTransactions.map(txn => {
      const desc = txn.description.toLowerCase();
      if (desc.includes('sip') || desc.includes('mutual fund')) return 'mutual_fund';
      if (desc.includes('equity') || desc.includes('stock')) return 'equity';
      if (desc.includes('fd') || desc.includes('fixed deposit')) return 'fixed_deposit';
      return 'other';
    }));

    const diversificationScore = investmentTypes.size;

    // Determine risk profile based on investment types
    let riskProfile: 'conservative' | 'moderate' | 'aggressive' = 'conservative';
    if (investmentTypes.has('equity')) riskProfile = 'aggressive';
    else if (investmentTypes.has('mutual_fund')) riskProfile = 'moderate';

    // Calculate score
    let score = 300;
    
    // Base score from investment amount
    if (totalInvestments > 500000) score += 150; // 5L+ invested
    else if (totalInvestments > 200000) score += 120; // 2L+ invested
    else if (totalInvestments > 100000) score += 90; // 1L+ invested
    else if (totalInvestments > 50000) score += 60; // 50K+ invested
    else if (totalInvestments > 10000) score += 30; // 10K+ invested

    // Bonus for frequency (regular investing)
    if (investmentFrequency > 24) score += 100; // 2+ years of regular investing
    else if (investmentFrequency > 12) score += 70; // 1+ year
    else if (investmentFrequency > 6) score += 40; // 6+ months
    else if (investmentFrequency > 0) score += 20;

    // Bonus for diversification
    score += diversificationScore * 25;

    // Bonus for risk profile (shows financial sophistication)
    if (riskProfile === 'aggressive') score += 30;
    else if (riskProfile === 'moderate') score += 20;
    else score += 10;

    return {
      score: Math.min(score, 850),
      totalInvestments,
      investmentFrequency,
      diversificationScore,
      riskProfile
    };
  }

  // Calculate weighted final score
  private calculateWeightedScore(analysis: ScoreAnalysis): number {
    const weights = {
      incomeStability: 0.35,    // 35% - Most important
      paymentBehavior: 0.25,    // 25% - Payment history
      savingsRate: 0.25,        // 25% - Financial discipline
      investmentActivity: 0.15   // 15% - Financial sophistication
    };

    const weightedScore = 
      analysis.incomeStability.score * weights.incomeStability +
      analysis.paymentBehavior.score * weights.paymentBehavior +
      analysis.savingsRate.score * weights.savingsRate +
      analysis.investmentActivity.score * weights.investmentActivity;

    return Math.max(300, Math.min(850, weightedScore));
  }

  // Calculate confidence based on data quality
  private calculateConfidence(transactionCount: number, analysis: ScoreAnalysis): number {
    let confidence = 0.5; // Base confidence

    // More transactions = higher confidence
    if (transactionCount > 500) confidence += 0.3;
    else if (transactionCount > 200) confidence += 0.2;
    else if (transactionCount > 100) confidence += 0.1;

    // Consistent income = higher confidence
    if (analysis.incomeStability.consistencyMonths > 6) confidence += 0.1;
    if (analysis.incomeStability.incomeVariability < 0.3) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  // Determine score trend
  private async determineTrend(userId: string): Promise<'improving' | 'stable' | 'declining'> {
    try {
      const recentScores = await CreditScoreModel.getHistory(userId, 3);
      
      if (recentScores.length < 2) return 'stable';

      const latestScore = recentScores[0].score;
      const previousScore = recentScores[1].score;
      const difference = latestScore - previousScore;

      if (difference > 20) return 'improving';
      if (difference < -20) return 'declining';
      return 'stable';

    } catch (error) {
      return 'stable';
    }
  }

  // Generate score factors
  private generateScoreFactors(analysis: ScoreAnalysis): CreateScoreFactorData[] {
    const factors: CreateScoreFactorData[] = [];

    // Income stability factor
    const incomeImpact = Math.round(((analysis.incomeStability.score - 300) / 550) * 100 - 50);
    factors.push({
      category: 'income_stability',
      impact: incomeImpact,
      description: `Monthly income: ₹${Math.round(analysis.incomeStability.monthlyIncome).toLocaleString()}, Consistency: ${analysis.incomeStability.consistencyMonths} months`,
      weight: 0.35
    });

    // Payment behavior factor
    const paymentImpact = Math.round(((analysis.paymentBehavior.score - 300) / 550) * 100 - 50);
    factors.push({
      category: 'payment_behavior',
      impact: paymentImpact,
      description: `On-time payments: ${Math.round(analysis.paymentBehavior.onTimePayments * 100)}%, Overdrafts: ${analysis.paymentBehavior.overdrafts}`,
      weight: 0.25
    });

    // Savings rate factor
    const savingsImpact = Math.round(((analysis.savingsRate.score - 300) / 550) * 100 - 50);
    factors.push({
      category: 'savings_rate',
      impact: savingsImpact,
      description: `Average savings rate: ${Math.round(analysis.savingsRate.averageSavingsRate * 100)}%, Trend: ${analysis.savingsRate.savingsTrend}`,
      weight: 0.25
    });

    // Investment activity factor
    const investmentImpact = Math.round(((analysis.investmentActivity.score - 300) / 550) * 100 - 50);
    factors.push({
      category: 'investment_activity',
      impact: investmentImpact,
      description: `Total investments: ₹${Math.round(analysis.investmentActivity.totalInvestments).toLocaleString()}, Risk profile: ${analysis.investmentActivity.riskProfile}`,
      weight: 0.15
    });

    return factors;
  }

  // Generate recommendations
  private generateRecommendations(analysis: ScoreAnalysis): string[] {
    const recommendations: string[] = [];

    // Income recommendations
    if (analysis.incomeStability.incomeVariability > 0.4) {
      recommendations.push('Consider diversifying income sources to reduce income variability');
    }
    if (analysis.incomeStability.monthlyIncome < 25000) {
      recommendations.push('Focus on increasing monthly income through skill development or additional income streams');
    }

    // Savings recommendations
    if (analysis.savingsRate.averageSavingsRate < 0.1) {
      recommendations.push('Aim to save at least 10% of your monthly income');
    }
    if (analysis.savingsRate.emergencyFundMonths < 3) {
      recommendations.push('Build an emergency fund covering 3-6 months of expenses');
    }

    // Payment recommendations
    if (analysis.paymentBehavior.onTimePayments < 0.9) {
      recommendations.push('Set up automatic payments for recurring bills to improve payment history');
    }
    if (analysis.paymentBehavior.overdrafts > 2) {
      recommendations.push('Maintain a buffer balance to avoid overdrafts');
    }

    // Investment recommendations
    if (analysis.investmentActivity.totalInvestments < 50000) {
      recommendations.push('Start investing regularly through SIPs to build long-term wealth');
    }
    if (analysis.investmentActivity.diversificationScore < 2) {
      recommendations.push('Diversify investments across different asset classes');
    }

    return recommendations;
  }

  // Helper: Group transactions by month
  private groupTransactionsByMonth(transactions: any[]): number[] {
    const monthlyTotals = new Map<string, number>();

    transactions.forEach(txn => {
      const monthKey = new Date(txn.transactionDate).toISOString().substring(0, 7); // YYYY-MM
      monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + txn.amount);
    });

    return Array.from(monthlyTotals.values());
  }

  // Helper: Determine salary frequency
  private determineSalaryFrequency(incomeTransactions: any[]): 'monthly' | 'weekly' | 'irregular' {
    if (incomeTransactions.length < 2) return 'irregular';

    const intervals: number[] = [];
    const sortedTransactions = incomeTransactions.sort((a, b) => 
      new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    );

    for (let i = 1; i < sortedTransactions.length; i++) {
      const daysDiff = Math.floor(
        (new Date(sortedTransactions[i].transactionDate).getTime() - 
         new Date(sortedTransactions[i-1].transactionDate).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      intervals.push(daysDiff);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

    if (avgInterval >= 25 && avgInterval <= 35) return 'monthly'; // ~30 days
    if (avgInterval >= 5 && avgInterval <= 9) return 'weekly'; // ~7 days
    return 'irregular';
  }

  // Store calculated score
  async storeScore(userId: string, scoreResult: CreditScoreResult): Promise<string> {
    try {
      const scoreData: CreateCreditScoreData = {
        userId,
        score: scoreResult.score,
        confidence: scoreResult.confidence,
        trend: scoreResult.trend,
        factors: scoreResult.factors
      };

      const creditScore = await CreditScoreModel.create(scoreData);

      // Log score calculation
      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, details) 
         VALUES ($1, 'SCORE_CALCULATED', 'CREDIT_SCORE', $2)`,
        [
          userId,
          JSON.stringify({
            scoreId: creditScore.id,
            score: scoreResult.score,
            confidence: scoreResult.confidence,
            factorCount: scoreResult.factors.length
          })
        ]
      );

      console.log(`✅ Credit score stored: ${creditScore.id}`);
      return creditScore.id;

    } catch (error) {
      console.error('❌ Failed to store credit score:', error);
      throw error;
    }
  }

  // Get user's latest score with analysis
  async getUserScore(userId: string): Promise<{
    score: any;
    analysis?: ScoreAnalysis;
    recommendations?: string[];
  } | null> {
    try {
      const latestScore = await CreditScoreModel.findLatestByUserId(userId);
      
      if (!latestScore) {
        return null;
      }

      // For now, return just the score
      // In a real implementation, you might store analysis separately
      return {
        score: latestScore
      };

    } catch (error) {
      console.error('❌ Failed to get user score:', error);
      throw error;
    }
  }

  // Recalculate score (triggered by new data)
  async recalculateScore(userId: string): Promise<CreditScoreResult> {
    try {
      console.log(`🔄 Recalculating credit score for user ${userId}`);

      const scoreResult = await this.calculateCreditScore(userId);
      await this.storeScore(userId, scoreResult);

      return scoreResult;

    } catch (error) {
      console.error('❌ Score recalculation failed:', error);
      throw error;
    }
  }
}

export default CreditScoringService;