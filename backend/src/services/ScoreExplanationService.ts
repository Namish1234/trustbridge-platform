import { CreditScoreModel } from '../models/CreditScore';
import { query } from '../config/database';

export interface ScoreBreakdown {
  currentScore: number;
  scoreRange: {
    min: number;
    max: number;
    category: 'Poor' | 'Fair' | 'Good' | 'Very Good' | 'Excellent';
  };
  factors: FactorExplanation[];
  historicalTrend: ScoreHistoryPoint[];
  improvementTips: ImprovementTip[];
  nextReviewDate: Date;
}

export interface FactorExplanation {
  category: 'income_stability' | 'savings_rate' | 'payment_behavior' | 'investment_activity';
  name: string;
  impact: number; // -100 to +100
  weight: number; // 0-1
  currentValue: string;
  description: string;
  explanation: string;
  improvementActions: string[];
}

export interface ScoreHistoryPoint {
  date: Date;
  score: number;
  change: number;
  reason?: string;
}

export interface ImprovementTip {
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  potentialImpact: number; // Estimated score improvement
  timeframe: string;
  actionItems: string[];
}

export interface ScoreComparison {
  userScore: number;
  averageScore: number;
  percentile: number;
  betterThanPercent: number;
  similarProfiles: {
    ageGroup: string;
    incomeRange: string;
    averageScore: number;
  }[];
}

export class ScoreExplanationService {
  // Get comprehensive score breakdown
  async getScoreBreakdown(userId: string): Promise<ScoreBreakdown> {
    try {
      console.log(`🔄 Generating score breakdown for user ${userId}`);

      // Get latest score
      const latestScore = await CreditScoreModel.findLatestByUserId(userId);
      if (!latestScore) {
        throw new Error('No credit score found for user');
      }

      // Get score history
      const scoreHistory = await CreditScoreModel.getHistory(userId, 12);

      // Generate factor explanations
      const factorExplanations = await this.generateFactorExplanations(latestScore.factors);

      // Generate historical trend
      const historicalTrend = this.generateHistoricalTrend(scoreHistory);

      // Generate improvement tips
      const improvementTips = await this.generateImprovementTips(userId, latestScore.factors);

      const breakdown: ScoreBreakdown = {
        currentScore: latestScore.score,
        scoreRange: this.getScoreRange(latestScore.score),
        factors: factorExplanations,
        historicalTrend,
        improvementTips,
        nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      };

      console.log(`✅ Score breakdown generated for user ${userId}`);
      return breakdown;

    } catch (error) {
      console.error('❌ Failed to generate score breakdown:', error);
      throw error;
    }
  }

  // Generate detailed factor explanations
  private async generateFactorExplanations(factors: any[]): Promise<FactorExplanation[]> {
    const explanations: FactorExplanation[] = [];

    for (const factor of factors) {
      const explanation = this.getFactorExplanation(factor);
      explanations.push(explanation);
    }

    return explanations.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)); // Sort by impact magnitude
  }

  // Get explanation for individual factor
  private getFactorExplanation(factor: any): FactorExplanation {
    const category = factor.category;
    const impact = factor.impact;
    const weight = factor.weight;
    const description = factor.description;

    let name: string;
    let explanation: string;
    let improvementActions: string[];
    let currentValue: string;

    switch (category) {
      case 'income_stability':
        name = 'Income Stability';
        currentValue = this.extractIncomeValue(description);
        explanation = this.getIncomeStabilityExplanation(impact, description);
        improvementActions = this.getIncomeImprovementActions(impact);
        break;

      case 'savings_rate':
        name = 'Savings Rate';
        currentValue = this.extractSavingsValue(description);
        explanation = this.getSavingsRateExplanation(impact, description);
        improvementActions = this.getSavingsImprovementActions(impact);
        break;

      case 'payment_behavior':
        name = 'Payment Behavior';
        currentValue = this.extractPaymentValue(description);
        explanation = this.getPaymentBehaviorExplanation(impact, description);
        improvementActions = this.getPaymentImprovementActions(impact);
        break;

      case 'investment_activity':
        name = 'Investment Activity';
        currentValue = this.extractInvestmentValue(description);
        explanation = this.getInvestmentActivityExplanation(impact, description);
        improvementActions = this.getInvestmentImprovementActions(impact);
        break;

      default:
        name = 'Unknown Factor';
        currentValue = 'N/A';
        explanation = 'This factor could not be analyzed.';
        improvementActions = [];
    }

    return {
      category,
      name,
      impact,
      weight,
      currentValue,
      description,
      explanation,
      improvementActions
    };
  }

  // Income stability explanations
  private getIncomeStabilityExplanation(impact: number, _description: string): string {
    if (impact > 30) {
      return 'Your income is very stable and consistent, which significantly boosts your credit score. Lenders view stable income as a strong indicator of your ability to repay loans.';
    } else if (impact > 10) {
      return 'Your income shows good stability, positively contributing to your credit score. Regular income patterns demonstrate financial reliability.';
    } else if (impact > -10) {
      return 'Your income stability is moderate. While not negatively impacting your score significantly, there\'s room for improvement in income consistency.';
    } else if (impact > -30) {
      return 'Your income shows some variability, which is reducing your credit score. Irregular income patterns make lenders cautious about lending decisions.';
    } else {
      return 'Your income is highly variable, significantly impacting your credit score. Inconsistent income makes it difficult for lenders to assess your repayment capacity.';
    }
  }

  // Savings rate explanations
  private getSavingsRateExplanation(impact: number, _description: string): string {
    if (impact > 30) {
      return 'Excellent savings rate! You consistently save a significant portion of your income, demonstrating strong financial discipline and planning.';
    } else if (impact > 10) {
      return 'Good savings habits are positively contributing to your score. Regular savings show financial responsibility and planning for the future.';
    } else if (impact > -10) {
      return 'Your savings rate is moderate. Building a more consistent savings habit could help improve your credit score over time.';
    } else if (impact > -30) {
      return 'Low savings rate is impacting your score. Increasing your monthly savings would demonstrate better financial management to lenders.';
    } else {
      return 'Very low or negative savings rate is significantly reducing your credit score. Focus on reducing expenses and increasing savings.';
    }
  }

  // Payment behavior explanations
  private getPaymentBehaviorExplanation(impact: number, _description: string): string {
    if (impact > 30) {
      return 'Excellent payment history! You consistently pay bills on time with no overdrafts, which is the strongest positive factor for your credit score.';
    } else if (impact > 10) {
      return 'Good payment behavior is helping your credit score. Most of your payments are on time with minimal issues.';
    } else if (impact > -10) {
      return 'Your payment behavior is average. Some late payments or overdrafts are preventing a higher score.';
    } else if (impact > -30) {
      return 'Payment issues are negatively affecting your score. Multiple late payments or overdrafts indicate financial stress to lenders.';
    } else {
      return 'Poor payment history is significantly hurting your credit score. Frequent overdrafts and missed payments are major red flags for lenders.';
    }
  }

  // Investment activity explanations
  private getInvestmentActivityExplanation(impact: number, _description: string): string {
    if (impact > 20) {
      return 'Strong investment activity shows financial sophistication and long-term planning, positively contributing to your credit score.';
    } else if (impact > 5) {
      return 'Regular investments demonstrate good financial planning and contribute positively to your creditworthiness.';
    } else if (impact > -5) {
      return 'Limited investment activity. While not negatively impacting your score, regular investments could help improve it.';
    } else {
      return 'No significant investment activity detected. Starting regular investments could help improve your credit score over time.';
    }
  }

  // Generate improvement actions
  private getIncomeImprovementActions(impact: number): string[] {
    if (impact < 0) {
      return [
        'Consider finding additional income sources to reduce income variability',
        'Negotiate for a more stable salary structure with your employer',
        'Build skills that could lead to higher, more stable income',
        'Consider freelancing or part-time work to supplement irregular income'
      ];
    } else if (impact < 20) {
      return [
        'Maintain current income stability',
        'Look for opportunities to increase income gradually',
        'Document all income sources for better credit assessment'
      ];
    }
    return ['Continue maintaining excellent income stability'];
  }

  private getSavingsImprovementActions(impact: number): string[] {
    if (impact < 0) {
      return [
        'Create a monthly budget to track expenses',
        'Set up automatic transfers to savings account',
        'Start with saving at least 10% of monthly income',
        'Reduce unnecessary expenses to increase savings rate'
      ];
    } else if (impact < 20) {
      return [
        'Increase savings rate gradually by 2-3% each month',
        'Set up emergency fund covering 3-6 months of expenses',
        'Consider high-yield savings accounts for better returns'
      ];
    }
    return ['Maintain excellent savings discipline', 'Consider investment options for surplus savings'];
  }

  private getPaymentImprovementActions(impact: number): string[] {
    if (impact < 0) {
      return [
        'Set up automatic payments for all recurring bills',
        'Maintain minimum balance to avoid overdrafts',
        'Use calendar reminders for payment due dates',
        'Consider consolidating bills to reduce payment complexity'
      ];
    } else if (impact < 20) {
      return [
        'Continue current payment discipline',
        'Set up alerts for low account balances',
        'Pay bills a few days before due date for safety'
      ];
    }
    return ['Maintain excellent payment history', 'Consider increasing credit utilization responsibly'];
  }

  private getInvestmentImprovementActions(impact: number): string[] {
    if (impact < 5) {
      return [
        'Start with small SIP investments in mutual funds',
        'Learn about different investment options',
        'Set aside 10-15% of income for investments',
        'Consider consulting a financial advisor'
      ];
    } else if (impact < 15) {
      return [
        'Diversify investment portfolio across asset classes',
        'Increase investment amount gradually',
        'Review and rebalance portfolio quarterly'
      ];
    }
    return ['Maintain current investment discipline', 'Consider advanced investment strategies'];
  }

  // Generate historical trend
  private generateHistoricalTrend(scoreHistory: any[]): ScoreHistoryPoint[] {
    const trend: ScoreHistoryPoint[] = [];

    for (let i = 0; i < scoreHistory.length; i++) {
      const current = scoreHistory[i];
      const previous = i < scoreHistory.length - 1 ? scoreHistory[i + 1] : null;
      const change = previous ? current.score - previous.score : 0;

      trend.push({
        date: current.date,
        score: current.score,
        change,
        reason: this.getScoreChangeReason(change)
      });
    }

    return trend;
  }

  // Get reason for score change
  private getScoreChangeReason(change: number): string | undefined {
    if (change > 20) return 'Significant improvement in financial behavior';
    if (change > 10) return 'Positive changes in spending and saving patterns';
    if (change > 5) return 'Minor improvements in financial management';
    if (change < -20) return 'Concerning changes in financial behavior';
    if (change < -10) return 'Some negative changes in financial patterns';
    if (change < -5) return 'Minor decline in financial metrics';
    return undefined; // Stable
  }

  // Generate improvement tips
  private async generateImprovementTips(_userId: string, factors: any[]): Promise<ImprovementTip[]> {
    const tips: ImprovementTip[] = [];

    // Analyze each factor and generate specific tips
    for (const factor of factors) {
      if (factor.impact < 20) { // Room for improvement
        const tip = this.generateFactorImprovementTip(factor);
        if (tip) tips.push(tip);
      }
    }

    // Add general tips
    tips.push(...this.getGeneralImprovementTips());

    // Sort by priority and potential impact
    return tips.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.potentialImpact - a.potentialImpact;
    }).slice(0, 5); // Return top 5 tips
  }

  // Generate factor-specific improvement tip
  private generateFactorImprovementTip(factor: any): ImprovementTip | null {
    const category = factor.category;
    const impact = factor.impact;

    if (impact > 10) return null; // Already good

    switch (category) {
      case 'income_stability':
        return {
          category: 'Income',
          priority: 'high',
          title: 'Stabilize Your Income',
          description: 'Consistent income is crucial for a good credit score. Focus on creating predictable income streams.',
          potentialImpact: 50,
          timeframe: '3-6 months',
          actionItems: [
            'Negotiate for a fixed salary component',
            'Develop multiple income sources',
            'Build skills for higher-paying stable jobs'
          ]
        };

      case 'savings_rate':
        return {
          category: 'Savings',
          priority: 'high',
          title: 'Increase Your Savings Rate',
          description: 'Higher savings rate demonstrates financial discipline and improves your creditworthiness.',
          potentialImpact: 40,
          timeframe: '2-3 months',
          actionItems: [
            'Create and stick to a monthly budget',
            'Automate savings transfers',
            'Reduce discretionary spending by 10-15%'
          ]
        };

      case 'payment_behavior':
        return {
          category: 'Payments',
          priority: 'high',
          title: 'Perfect Your Payment History',
          description: 'Payment history is the most important factor. Never miss a payment or overdraft.',
          potentialImpact: 60,
          timeframe: '1-2 months',
          actionItems: [
            'Set up automatic bill payments',
            'Maintain buffer balance in accounts',
            'Use payment reminder apps'
          ]
        };

      case 'investment_activity':
        return {
          category: 'Investments',
          priority: 'medium',
          title: 'Start Regular Investments',
          description: 'Regular investments show financial planning and can boost your credit score.',
          potentialImpact: 25,
          timeframe: '1-3 months',
          actionItems: [
            'Start SIP in mutual funds',
            'Invest 10-15% of monthly income',
            'Diversify across different asset classes'
          ]
        };

      default:
        return null;
    }
  }

  // Get general improvement tips
  private getGeneralImprovementTips(): ImprovementTip[] {
    return [
      {
        category: 'General',
        priority: 'medium',
        title: 'Build Emergency Fund',
        description: 'An emergency fund covering 3-6 months of expenses shows financial preparedness.',
        potentialImpact: 30,
        timeframe: '6-12 months',
        actionItems: [
          'Calculate monthly expenses',
          'Save 20% of income until target is reached',
          'Keep emergency fund in liquid savings account'
        ]
      },
      {
        category: 'General',
        priority: 'low',
        title: 'Monitor Your Score Regularly',
        description: 'Regular monitoring helps you track progress and catch issues early.',
        potentialImpact: 10,
        timeframe: 'Ongoing',
        actionItems: [
          'Check score monthly',
          'Review factor changes',
          'Adjust financial behavior based on insights'
        ]
      }
    ];
  }

  // Get score comparison with peers
  async getScoreComparison(userId: string): Promise<ScoreComparison> {
    try {
      const userScore = await CreditScoreModel.findLatestByUserId(userId);
      if (!userScore) {
        throw new Error('No score found for user');
      }

      // Get average score (simplified - in real implementation, you'd have more sophisticated peer grouping)
      const avgResult = await query(
        'SELECT AVG(score) as average_score FROM credit_scores WHERE score_date >= $1',
        [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] // Last 30 days
      );

      const averageScore = parseFloat(avgResult.rows[0]?.average_score) || 650;

      // Calculate percentile (simplified)
      const percentileResult = await query(
        'SELECT COUNT(*) as lower_count FROM credit_scores WHERE score < $1 AND score_date >= $2',
        [userScore.score, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)]
      );

      const totalScoresResult = await query(
        'SELECT COUNT(*) as total_count FROM credit_scores WHERE score_date >= $1',
        [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)]
      );

      const lowerCount = parseInt(percentileResult.rows[0]?.lower_count) || 0;
      const totalCount = parseInt(totalScoresResult.rows[0]?.total_count) || 1;
      const percentile = Math.round((lowerCount / totalCount) * 100);

      return {
        userScore: userScore.score,
        averageScore: Math.round(averageScore),
        percentile,
        betterThanPercent: percentile,
        similarProfiles: [
          {
            ageGroup: '25-35 years',
            incomeRange: '₹25K-50K/month',
            averageScore: Math.round(averageScore * 0.95)
          },
          {
            ageGroup: '35-45 years',
            incomeRange: '₹50K-1L/month',
            averageScore: Math.round(averageScore * 1.05)
          }
        ]
      };

    } catch (error) {
      console.error('❌ Failed to get score comparison:', error);
      throw error;
    }
  }

  // Helper methods to extract values from descriptions
  private extractIncomeValue(description: string): string {
    const match = description.match(/Monthly income: ₹([\d,]+)/);
    return match ? `₹${match[1]}/month` : 'N/A';
  }

  private extractSavingsValue(description: string): string {
    const match = description.match(/Average savings rate: (\d+)%/);
    return match ? `${match[1]}%` : 'N/A';
  }

  private extractPaymentValue(description: string): string {
    const match = description.match(/On-time payments: (\d+)%/);
    return match ? `${match[1]}%` : 'N/A';
  }

  private extractInvestmentValue(description: string): string {
    const match = description.match(/Total investments: ₹([\d,]+)/);
    return match ? `₹${match[1]}` : 'N/A';
  }

  // Get score range category
  private getScoreRange(score: number): ScoreBreakdown['scoreRange'] {
    if (score >= 750) {
      return { min: 750, max: 850, category: 'Excellent' };
    } else if (score >= 700) {
      return { min: 700, max: 749, category: 'Very Good' };
    } else if (score >= 650) {
      return { min: 650, max: 699, category: 'Good' };
    } else if (score >= 600) {
      return { min: 600, max: 649, category: 'Fair' };
    } else {
      return { min: 300, max: 599, category: 'Poor' };
    }
  }
}

export default ScoreExplanationService;