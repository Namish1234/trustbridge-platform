import { TransactionModel, CreateTransactionData } from '../models/Transaction';
import { AccountConnectionModel } from '../models/AccountConnection';
import { query } from '../config/database';
import AccountAggregatorService from './AccountAggregatorService';

export interface RawTransactionData {
  transactionId: string;
  accountId: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  transactionDate: Date;
  balance?: number;
  merchantInfo?: string;
  rawData?: any; // Original data from AA
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface IngestionStats {
  totalProcessed: number;
  successful: number;
  failed: number;
  duplicates: number;
  categorized: number;
  processingTime: number;
}

export class DataIngestionService {
  private aaService: AccountAggregatorService;

  constructor() {
    this.aaService = new AccountAggregatorService();
  }

  // Main ingestion pipeline
  async ingestTransactionData(
    userId: string,
    rawTransactions: RawTransactionData[]
  ): Promise<IngestionStats> {
    const startTime = Date.now();
    const stats: IngestionStats = {
      totalProcessed: rawTransactions.length,
      successful: 0,
      failed: 0,
      duplicates: 0,
      categorized: 0,
      processingTime: 0
    };

    try {
      console.log(`🔄 Starting data ingestion for user ${userId}: ${rawTransactions.length} transactions`);

      // Step 1: Validate and sanitize data
      const validatedTransactions = await this.validateAndSanitize(rawTransactions);

      // Step 2: Check for duplicates
      const deduplicatedTransactions = await this.removeDuplicates(userId, validatedTransactions);
      stats.duplicates = validatedTransactions.length - deduplicatedTransactions.length;

      // Step 3: Categorize transactions
      const categorizedTransactions = await this.categorizeTransactions(deduplicatedTransactions);
      stats.categorized = categorizedTransactions.filter(t => t.category).length;

      // Step 4: Detect recurring transactions
      const enrichedTransactions = await this.detectRecurringTransactions(categorizedTransactions);

      // Step 5: Store transactions in batches
      const storedTransactions = await this.storeTransactionsBatch(enrichedTransactions);
      stats.successful = storedTransactions.length;
      stats.failed = enrichedTransactions.length - storedTransactions.length;

      // Step 6: Update account sync timestamps
      await this.updateAccountSyncTimestamps(userId);

      stats.processingTime = Date.now() - startTime;

      // Log ingestion results
      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, details) 
         VALUES ($1, 'DATA_INGESTION', 'TRANSACTIONS', $2)`,
        [userId, JSON.stringify(stats)]
      );

      console.log(`✅ Data ingestion completed for user ${userId}:`, stats);
      return stats;

    } catch (error) {
      console.error('❌ Data ingestion failed:', error);
      stats.processingTime = Date.now() - startTime;
      stats.failed = stats.totalProcessed - stats.successful;
      throw error;
    }
  }

  // Validate and sanitize raw transaction data
  private async validateAndSanitize(
    rawTransactions: RawTransactionData[]
  ): Promise<CreateTransactionData[]> {
    const validatedTransactions: CreateTransactionData[] = [];

    for (const rawTxn of rawTransactions) {
      const validation = this.validateTransaction(rawTxn);
      
      if (validation.isValid) {
        // Sanitize and convert to internal format
        const sanitizedTxn: CreateTransactionData = {
          accountId: rawTxn.accountId,
          amount: Math.abs(rawTxn.amount), // Ensure positive amount
          type: rawTxn.type,
          description: this.sanitizeDescription(rawTxn.description),
          transactionDate: rawTxn.transactionDate,
          balance: rawTxn.balance,
          merchantInfo: rawTxn.merchantInfo ? this.sanitizeMerchantInfo(rawTxn.merchantInfo) : undefined,
          isRecurring: false // Will be determined later
        };

        validatedTransactions.push(sanitizedTxn);
      } else {
        console.warn('Invalid transaction data:', validation.errors);
      }
    }

    console.log(`✅ Validated ${validatedTransactions.length}/${rawTransactions.length} transactions`);
    return validatedTransactions;
  }

  // Validate individual transaction
  private validateTransaction(txn: RawTransactionData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!txn.transactionId) errors.push('Transaction ID is required');
    if (!txn.accountId) errors.push('Account ID is required');
    if (txn.amount === undefined || txn.amount === null) errors.push('Amount is required');
    if (!txn.type || !['credit', 'debit'].includes(txn.type)) errors.push('Valid transaction type is required');
    if (!txn.transactionDate) errors.push('Transaction date is required');

    // Data validation
    if (txn.amount && (isNaN(txn.amount) || txn.amount < 0)) errors.push('Amount must be a positive number');
    if (txn.transactionDate && isNaN(new Date(txn.transactionDate).getTime())) errors.push('Invalid transaction date');
    if (txn.balance && isNaN(txn.balance)) warnings.push('Invalid balance value');

    // Business rules
    if (txn.amount && txn.amount > 10000000) warnings.push('Unusually large transaction amount'); // 1 crore
    if (txn.transactionDate && new Date(txn.transactionDate) > new Date()) warnings.push('Future transaction date');

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Remove duplicate transactions
  private async removeDuplicates(
    userId: string,
    transactions: CreateTransactionData[]
  ): Promise<CreateTransactionData[]> {
    try {
      // Get existing transaction hashes for the user (last 90 days)
      const existingHashes = await query(
        `SELECT DISTINCT 
          CONCAT(account_id, '|', amount, '|', type, '|', transaction_date::text) as txn_hash
         FROM transactions t
         JOIN account_connections ac ON t.account_id = ac.id
         WHERE ac.user_id = $1 
         AND t.transaction_date >= $2`,
        [userId, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)]
      );

      const existingHashSet = new Set(existingHashes.rows.map(row => row.txn_hash));

      // Filter out duplicates
      const uniqueTransactions = transactions.filter(txn => {
        const hash = `${txn.accountId}|${txn.amount}|${txn.type}|${txn.transactionDate.toISOString()}`;
        return !existingHashSet.has(hash);
      });

      console.log(`✅ Removed ${transactions.length - uniqueTransactions.length} duplicate transactions`);
      return uniqueTransactions;

    } catch (error) {
      console.error('❌ Failed to remove duplicates:', error);
      return transactions; // Return original if deduplication fails
    }
  }

  // Categorize transactions using rules and ML
  private async categorizeTransactions(
    transactions: CreateTransactionData[]
  ): Promise<CreateTransactionData[]> {
    const categorizedTransactions = transactions.map(txn => {
      const category = this.determineCategory(txn.description || '', txn.merchantInfo);
      return {
        ...txn,
        category
      };
    });

    console.log(`✅ Categorized ${categorizedTransactions.filter(t => t.category).length} transactions`);
    return categorizedTransactions;
  }

  // Determine transaction category based on description and merchant info
  private determineCategory(description: string, merchantInfo?: string): string | undefined {
    const text = `${description} ${merchantInfo || ''}`.toLowerCase();

    // Salary and income
    if (text.includes('salary') || text.includes('sal cr') || text.includes('payroll')) {
      return 'salary';
    }

    // Food and dining
    if (text.includes('zomato') || text.includes('swiggy') || text.includes('restaurant') || 
        text.includes('food') || text.includes('cafe') || text.includes('pizza')) {
      return 'food';
    }

    // Transportation
    if (text.includes('uber') || text.includes('ola') || text.includes('metro') || 
        text.includes('petrol') || text.includes('fuel') || text.includes('transport')) {
      return 'transport';
    }

    // Shopping
    if (text.includes('amazon') || text.includes('flipkart') || text.includes('shopping') || 
        text.includes('mall') || text.includes('store')) {
      return 'shopping';
    }

    // Utilities
    if (text.includes('electricity') || text.includes('water') || text.includes('gas') || 
        text.includes('internet') || text.includes('mobile') || text.includes('recharge')) {
      return 'utilities';
    }

    // Investment
    if (text.includes('sip') || text.includes('mutual fund') || text.includes('investment') || 
        text.includes('equity') || text.includes('stock') || text.includes('zerodha')) {
      return 'investment';
    }

    // Healthcare
    if (text.includes('hospital') || text.includes('medical') || text.includes('pharmacy') || 
        text.includes('doctor') || text.includes('health')) {
      return 'healthcare';
    }

    // Entertainment
    if (text.includes('netflix') || text.includes('spotify') || text.includes('movie') || 
        text.includes('entertainment') || text.includes('gaming')) {
      return 'entertainment';
    }

    // ATM and cash
    if (text.includes('atm') || text.includes('cash withdrawal') || text.includes('cash dep')) {
      return 'cash';
    }

    // Transfer
    if (text.includes('transfer') || text.includes('upi') || text.includes('imps') || 
        text.includes('neft') || text.includes('rtgs')) {
      return 'transfer';
    }

    return undefined; // Uncategorized
  }

  // Detect recurring transactions
  private async detectRecurringTransactions(
    transactions: CreateTransactionData[]
  ): Promise<CreateTransactionData[]> {
    // Group transactions by amount and description
    const transactionGroups = new Map<string, CreateTransactionData[]>();

    transactions.forEach(txn => {
      const key = `${txn.amount}|${txn.description}|${txn.type}`;
      if (!transactionGroups.has(key)) {
        transactionGroups.set(key, []);
      }
      transactionGroups.get(key)!.push(txn);
    });

    // Mark transactions as recurring if they appear multiple times with regular intervals
    transactionGroups.forEach((group, key) => {
      if (group.length >= 2) {
        // Sort by date
        group.sort((a, b) => a.transactionDate.getTime() - b.transactionDate.getTime());

        // Check for regular intervals (monthly, weekly, etc.)
        const intervals: number[] = [];
        for (let i = 1; i < group.length; i++) {
          const daysDiff = Math.floor(
            (group[i].transactionDate.getTime() - group[i-1].transactionDate.getTime()) / 
            (1000 * 60 * 60 * 24)
          );
          intervals.push(daysDiff);
        }

        // Check if intervals are consistent (within 3 days tolerance)
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const isRecurring = intervals.every(interval => Math.abs(interval - avgInterval) <= 3);

        if (isRecurring) {
          group.forEach(txn => {
            txn.isRecurring = true;
          });
        }
      }
    });

    const recurringCount = transactions.filter(txn => txn.isRecurring).length;
    console.log(`✅ Detected ${recurringCount} recurring transactions`);

    return transactions;
  }

  // Store transactions in batches for better performance
  private async storeTransactionsBatch(
    transactions: CreateTransactionData[]
  ): Promise<any[]> {
    const batchSize = 100;
    const storedTransactions: any[] = [];

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      
      try {
        const batchResult = await TransactionModel.createBulk(batch);
        storedTransactions.push(...batchResult);
        console.log(`✅ Stored batch ${Math.floor(i/batchSize) + 1}: ${batchResult.length} transactions`);
      } catch (error) {
        console.error(`❌ Failed to store batch ${Math.floor(i/batchSize) + 1}:`, error);
        // Continue with next batch
      }
    }

    return storedTransactions;
  }

  // Update account sync timestamps
  private async updateAccountSyncTimestamps(userId: string): Promise<void> {
    try {
      await query(
        `UPDATE account_connections 
         SET last_sync_at = NOW(), updated_at = NOW() 
         WHERE user_id = $1 AND connection_status = 'active'`,
        [userId]
      );
    } catch (error) {
      console.error('❌ Failed to update sync timestamps:', error);
    }
  }

  // Sanitize transaction description
  private sanitizeDescription(description: string): string {
    return description
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 255); // Limit length
  }

  // Sanitize merchant information
  private sanitizeMerchantInfo(merchantInfo: string): string {
    return merchantInfo
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 255); // Limit length
  }

  // Real-time data synchronization
  async syncRealTimeData(userId: string): Promise<IngestionStats> {
    try {
      console.log(`🔄 Starting real-time sync for user ${userId}`);

      // Get active account connections
      const connections = await AccountConnectionModel.findByUserId(userId, 'active');
      
      if (connections.length === 0) {
        console.log('No active connections found for real-time sync');
        return {
          totalProcessed: 0,
          successful: 0,
          failed: 0,
          duplicates: 0,
          categorized: 0,
          processingTime: 0
        };
      }

      // Sync data from AA service
      const syncResult = await this.aaService.syncAccountData(userId);

      // The AA service handles the ingestion internally, so we return the stats
      return {
        totalProcessed: syncResult.transactionsAdded,
        successful: syncResult.transactionsAdded,
        failed: 0,
        duplicates: 0,
        categorized: syncResult.transactionsAdded, // Assume all are categorized
        processingTime: 0 // Not tracked in sync
      };

    } catch (error) {
      console.error('❌ Real-time sync failed:', error);
      throw error;
    }
  }

  // Get ingestion statistics for a user
  async getIngestionStats(userId: string, days: number = 30): Promise<{
    totalTransactions: number;
    recentIngestions: number;
    categorizedPercentage: number;
    recurringTransactions: number;
    lastSyncDate?: Date;
  }> {
    try {
      const result = await query(
        `SELECT 
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN t.created_at >= $2 THEN 1 END) as recent_ingestions,
          COUNT(CASE WHEN t.category IS NOT NULL THEN 1 END) as categorized_count,
          COUNT(CASE WHEN t.is_recurring = true THEN 1 END) as recurring_count,
          MAX(ac.last_sync_at) as last_sync_date
         FROM transactions t
         JOIN account_connections ac ON t.account_id = ac.id
         WHERE ac.user_id = $1`,
        [userId, new Date(Date.now() - days * 24 * 60 * 60 * 1000)]
      );

      const row = result.rows[0];
      const totalTransactions = parseInt(row.total_transactions) || 0;

      return {
        totalTransactions,
        recentIngestions: parseInt(row.recent_ingestions) || 0,
        categorizedPercentage: totalTransactions > 0 ? 
          (parseInt(row.categorized_count) / totalTransactions) * 100 : 0,
        recurringTransactions: parseInt(row.recurring_count) || 0,
        lastSyncDate: row.last_sync_date || undefined
      };

    } catch (error) {
      console.error('❌ Failed to get ingestion stats:', error);
      throw error;
    }
  }

  // Clean up old transaction data (for data retention compliance)
  async cleanupOldData(retentionDays: number = 1095): Promise<number> { // 3 years default
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      
      const result = await query(
        'DELETE FROM transactions WHERE created_at < $1',
        [cutoffDate]
      );

      const deletedCount = result.rowCount || 0;
      console.log(`✅ Cleaned up ${deletedCount} old transactions`);

      return deletedCount;

    } catch (error) {
      console.error('❌ Failed to cleanup old data:', error);
      throw error;
    }
  }
}

export default DataIngestionService;