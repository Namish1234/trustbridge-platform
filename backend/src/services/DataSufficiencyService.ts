import { TransactionModel } from '../models/Transaction';
import { AccountConnectionModel } from '../models/AccountConnection';
import { UserModel } from '../models/User';

export interface DataSufficiencyResult {
  sufficient: boolean;
  score: number; // 0-100 data quality score
  requirements: DataRequirement[];
  recommendations: DataRecommendation[];
  estimatedScoreAccuracy: number; // 0-1 range
}

export interface DataRequirement {
  category: 'transactions' | 'accounts' | 'timespan' | 'categories';
  name: string;
  current: number;
  required: number;
  met: boolean;
  weight: number; // Importance weight
}

export interface DataRecommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
  potentialImpact: number; // Estimated improvement in data quality score
}

export interface AccountTypeAnalysis {
  savings: number;
  current: number;
  credit: number;
  investment: number;
  loan: number;
  total: number;
}

export class DataSufficiencyService {
  // Minimum requirements for credit scoring
  private static readonly MIN_REQUIREMENTS = {
    transactions: 50,        // Minimum transactions needed
    accounts: 2,            // Minimum account connections
    timespan: 90,           // Minimum days of data
    categories: 3,          // Minimum transaction categories
    monthlyTransactions: 5   // Minimum transactions per month
  };

  // Optimal requirements for best accuracy
  private static readonly OPTIMAL_REQUIREMENTS = {
    transactions: 200,
    accounts: 4,
    timespan: 365,
    categories: 8,
    monthlyTransactions: 15
  };

  // Analyze data sufficiency for credit scoring
  async analyzeDataSufficiency(userId: string): Promise<DataSufficiencyResult> {
    try {
      console.log(`🔄 Analyzing data sufficiency for user ${userId}`);

      // Get user's transaction data
      const transactions = await TransactionModel.findByUserId(userId, 1, 1000, {
        dateFrom: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last 12 months
        dateTo: new Date()
      });

      // Get account connections
      const connections = await AccountConnectionModel.findByUserId(userId);
      const activeConnections = connections.filter(conn => conn.connectionStatus === 'active');

      // Analyze data quality
      const requirements = await this.evaluateRequirements(
        transactions.transactions,
        activeConnections
      );

      // Calculate overall data quality score
      const score = this.calculateDataQualityScore(requirements);

      // Determine if data is sufficient
      const sufficient = requirements.every(req => req.met);

      // Generate recommendations
      const recommendations = this.generateRecommendations(requirements, activeConnections);

      // Estimate score accuracy
      const estimatedAccuracy = this.estimateScoreAccuracy(score, requirements);

      const result: DataSufficiencyResult = {
        sufficient,
        score,
        requirements,
        recommendations,
        estimatedScoreAccuracy: estimatedAccuracy
      };

      console.log(`✅ Data sufficiency analysis complete: ${score}/100 (sufficient: ${sufficient})`);
      return result;

    } catch (error) {
      console.error('❌ Data sufficiency analysis failed:', error);
      throw error;
    }
  }

  // Evaluate individual requirements
  private async evaluateRequirements(
    transactions: any[],
    activeConnections: any[]
  ): Promise<DataRequirement[]> {
    const requirements: DataRequirement[] = [];

    // Transaction count requirement
    requirements.push({
      category: 'transactions',
      name: 'Transaction History',
      current: transactions.length,
      required: DataSufficiencyService.MIN_REQUIREMENTS.transactions,
      met: transactions.length >= DataSufficiencyService.MIN_REQUIREMENTS.transactions,
      weight: 0.3
    });

    // Account connections requirement
    requirements.push({
      category: 'accounts',
      name: 'Account Connections',
      current: activeConnections.length,
      required: DataSufficiencyService.MIN_REQUIREMENTS.accounts,
      met: activeConnections.length >= DataSufficiencyService.MIN_REQUIREMENTS.accounts,
      weight: 0.25
    });

    // Time span requirement
    const timeSpan = this.calculateDataTimespan(transactions);
    requirements.push({
      category: 'timespan',
      name: 'Data Time Span',
      current: timeSpan,
      required: DataSufficiencyService.MIN_REQUIREMENTS.timespan,
      met: timeSpan >= DataSufficiencyService.MIN_REQUIREMENTS.timespan,
      weight: 0.2
    });

    // Transaction categories requirement
    const categories = this.countTransactionCategories(transactions);
    requirements.push({
      category: 'categories',
      name: 'Transaction Categories',
      current: categories,
      required: DataSufficiencyService.MIN_REQUIREMENTS.categories,
      met: categories >= DataSufficiencyService.MIN_REQUIREMENTS.categories,
      weight: 0.15
    });

    // Monthly transaction frequency
    const monthlyFrequency = this.calculateMonthlyTransactionFrequency(transactions);
    requirements.push({
      category: 'transactions',
      name: 'Monthly Transaction Frequency',
      current: monthlyFrequency,
      required: DataSufficiencyService.MIN_REQUIREMENTS.monthlyTransactions,
      met: monthlyFrequency >= DataSufficiencyService.MIN_REQUIREMENTS.monthlyTransactions,
      weight: 0.1
    });

    return requirements;
  }

  // Calculate overall data quality score
  private calculateDataQualityScore(requirements: DataRequirement[]): number {
    let weightedScore = 0;
    let totalWeight = 0;

    for (const req of requirements) {
      const completionRatio = Math.min(req.current / req.required, 1);
      weightedScore += completionRatio * req.weight * 100;
      totalWeight += req.weight;
    }

    return Math.round(weightedScore / totalWeight);
  }

  // Generate recommendations for improving data quality
  private generateRecommendations(
    requirements: DataRequirement[],
    activeConnections: any[]
  ): DataRecommendation[] {
    const recommendations: DataRecommendation[] = [];

    // Check each unmet requirement
    for (const req of requirements) {
      if (!req.met) {
        const recommendation = this.getRequirementRecommendation(req, activeConnections);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    }

    // Add general recommendations
    recommendations.push(...this.getGeneralRecommendations(activeConnections));

    // Sort by priority and potential impact
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.potentialImpact - a.potentialImpact;
    }).slice(0, 5); // Return top 5 recommendations
  }

  // Get recommendation for specific requirement
  private getRequirementRecommendation(
    requirement: DataRequirement,
    activeConnections: any[]
  ): DataRecommendation | null {
    switch (requirement.category) {
      case 'transactions':
        if (requirement.name === 'Transaction History') {
          return {
            priority: 'high',
            title: 'Increase Transaction History',
            description: `You need ${requirement.required - requirement.current} more transactions for accurate scoring.`,
            actionItems: [
              'Connect additional bank accounts',
              'Include credit card accounts',
              'Wait for more transaction data to accumulate',
              'Ensure all primary accounts are connected'
            ],
            potentialImpact: 40
          };
        } else if (requirement.name === 'Monthly Transaction Frequency') {
          return {
            priority: 'medium',
            title: 'Improve Transaction Frequency',
            description: 'More regular transactions provide better insights into your financial behavior.',
            actionItems: [
              'Use connected accounts more regularly',
              'Connect accounts with higher transaction volume',
              'Include salary and utility payment accounts'
            ],
            potentialImpact: 20
          };
        }
        break;

      case 'accounts':
        return {
          priority: 'high',
          title: 'Connect More Accounts',
          description: `Connect ${requirement.required - requirement.current} more accounts for comprehensive analysis.`,
          actionItems: [
            'Add your primary savings account',
            'Connect credit card accounts',
            'Include investment accounts if available',
            'Add loan accounts for complete picture'
          ],
          potentialImpact: 35
        };

      case 'timespan':
        return {
          priority: 'medium',
          title: 'Extend Data History',
          description: `Need ${Math.ceil((requirement.required - requirement.current) / 30)} more months of data.`,
          actionItems: [
            'Wait for more transaction history to accumulate',
            'Connect older accounts with longer history',
            'Ensure data sync is working properly'
          ],
          potentialImpact: 25
        };

      case 'categories':
        return {
          priority: 'medium',
          title: 'Diversify Transaction Types',
          description: `Need ${requirement.required - requirement.current} more transaction categories.`,
          actionItems: [
            'Connect accounts used for different purposes',
            'Include utility payment accounts',
            'Add investment and loan accounts',
            'Connect credit cards for spending patterns'
          ],
          potentialImpact: 15
        };
    }

    return null;
  }

  // Get general recommendations
  private getGeneralRecommendations(activeConnections: any[]): DataRecommendation[] {
    const recommendations: DataRecommendation[] = [];

    // Analyze account type diversity
    const accountTypes = this.analyzeAccountTypes(activeConnections);

    if (accountTypes.savings === 0) {
      recommendations.push({
        priority: 'high',
        title: 'Connect Savings Account',
        description: 'Savings account data is crucial for analyzing your financial stability.',
        actionItems: [
          'Connect your primary savings account',
          'Include salary account if different',
          'Add any fixed deposit accounts'
        ],
        potentialImpact: 30
      });
    }

    if (accountTypes.credit === 0) {
      recommendations.push({
        priority: 'medium',
        title: 'Add Credit Accounts',
        description: 'Credit card data helps analyze spending patterns and payment behavior.',
        actionItems: [
          'Connect credit card accounts',
          'Include any loan accounts',
          'Add overdraft facilities if available'
        ],
        potentialImpact: 25
      });
    }

    if (accountTypes.investment === 0) {
      recommendations.push({
        priority: 'low',
        title: 'Include Investment Accounts',
        description: 'Investment data shows financial planning and risk appetite.',
        actionItems: [
          'Connect mutual fund accounts',
          'Add stock trading accounts',
          'Include SIP and recurring investment accounts'
        ],
        potentialImpact: 15
      });
    }

    return recommendations;
  }

  // Calculate data timespan in days
  private calculateDataTimespan(transactions: any[]): number {
    if (transactions.length === 0) return 0;

    const dates = transactions.map(txn => new Date(txn.transactionDate).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);

    return Math.floor((maxDate - minDate) / (1000 * 60 * 60 * 24));
  }

  // Count unique transaction categories
  private countTransactionCategories(transactions: any[]): number {
    const categories = new Set(transactions.map(txn => txn.category).filter(Boolean));
    return categories.size;
  }

  // Calculate average monthly transaction frequency
  private calculateMonthlyTransactionFrequency(transactions: any[]): number {
    if (transactions.length === 0) return 0;

    const timespan = this.calculateDataTimespan(transactions);
    const months = Math.max(1, timespan / 30);

    return Math.round(transactions.length / months);
  }

  // Analyze account type distribution
  private analyzeAccountTypes(connections: any[]): AccountTypeAnalysis {
    const analysis: AccountTypeAnalysis = {
      savings: 0,
      current: 0,
      credit: 0,
      investment: 0,
      loan: 0,
      total: connections.length
    };

    for (const conn of connections) {
      const accountType = conn.accountType?.toLowerCase() || '';
      
      if (accountType.includes('savings')) analysis.savings++;
      else if (accountType.includes('current')) analysis.current++;
      else if (accountType.includes('credit')) analysis.credit++;
      else if (accountType.includes('investment') || accountType.includes('mutual')) analysis.investment++;
      else if (accountType.includes('loan') || accountType.includes('mortgage')) analysis.loan++;
    }

    return analysis;
  }

  // Estimate credit score accuracy based on data quality
  private estimateScoreAccuracy(dataQualityScore: number, requirements: DataRequirement[]): number {
    let baseAccuracy = dataQualityScore / 100;

    // Adjust based on critical requirements
    const transactionReq = requirements.find(r => r.name === 'Transaction History');
    const accountReq = requirements.find(r => r.name === 'Account Connections');

    if (transactionReq && !transactionReq.met) {
      baseAccuracy *= 0.7; // Significantly reduce accuracy
    }

    if (accountReq && !accountReq.met) {
      baseAccuracy *= 0.8; // Reduce accuracy
    }

    // Bonus for exceeding optimal requirements
    const transactionBonus = transactionReq && transactionReq.current > DataSufficiencyService.OPTIMAL_REQUIREMENTS.transactions ? 0.1 : 0;
    const accountBonus = accountReq && accountReq.current > DataSufficiencyService.OPTIMAL_REQUIREMENTS.accounts ? 0.05 : 0;

    return Math.min(1.0, baseAccuracy + transactionBonus + accountBonus);
  }

  // Check if user can proceed with credit scoring
  async canProceedWithScoring(userId: string): Promise<{
    canProceed: boolean;
    reason?: string;
    minimumRequirements: string[];
  }> {
    try {
      const analysis = await this.analyzeDataSufficiency(userId);

      const criticalRequirements = analysis.requirements.filter(req => 
        req.weight >= 0.25 && !req.met
      );

      const canProceed = criticalRequirements.length === 0;

      return {
        canProceed,
        reason: canProceed ? undefined : 'Critical data requirements not met',
        minimumRequirements: criticalRequirements.map(req => 
          `${req.name}: ${req.current}/${req.required}`
        )
      };

    } catch (error) {
      console.error('❌ Failed to check scoring eligibility:', error);
      return {
        canProceed: false,
        reason: 'Unable to analyze data sufficiency',
        minimumRequirements: []
      };
    }
  }

  // Get data improvement suggestions
  async getImprovementSuggestions(userId: string): Promise<{
    currentScore: number;
    targetScore: number;
    suggestions: DataRecommendation[];
    estimatedTimeframe: string;
  }> {
    try {
      const analysis = await this.analyzeDataSufficiency(userId);

      const targetScore = 85; // Target for good data quality
      const improvementNeeded = Math.max(0, targetScore - analysis.score);

      // Estimate timeframe based on improvement needed
      let estimatedTimeframe = '1-2 weeks';
      if (improvementNeeded > 40) estimatedTimeframe = '4-8 weeks';
      else if (improvementNeeded > 20) estimatedTimeframe = '2-4 weeks';

      return {
        currentScore: analysis.score,
        targetScore,
        suggestions: analysis.recommendations,
        estimatedTimeframe
      };

    } catch (error) {
      console.error('❌ Failed to get improvement suggestions:', error);
      throw error;
    }
  }
}

export default DataSufficiencyService;