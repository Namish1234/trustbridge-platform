import { query } from '../config/database';

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  type: 'credit' | 'debit';
  category?: string;
  description?: string;
  transactionDate: Date;
  balance?: number;
  merchantInfo?: string;
  isRecurring: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionData {
  accountId: string;
  amount: number;
  type: 'credit' | 'debit';
  category?: string;
  description?: string;
  transactionDate: Date;
  balance?: number;
  merchantInfo?: string;
  isRecurring?: boolean;
}

export interface UpdateTransactionData {
  category?: string;
  description?: string;
  merchantInfo?: string;
  isRecurring?: boolean;
}

export interface TransactionFilters {
  accountId?: string;
  userId?: string;
  type?: 'credit' | 'debit';
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
  amountMin?: number;
  amountMax?: number;
  isRecurring?: boolean;
}

export interface TransactionStats {
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  netAmount: number;
  averageTransaction: number;
  recurringTransactions: number;
  categoriesBreakdown: Record<string, { count: number; amount: number }>;
}

export class TransactionModel {
  // Create a new transaction
  static async create(transactionData: CreateTransactionData): Promise<Transaction> {
    try {
      const result = await query(
        `INSERT INTO transactions 
         (account_id, amount, type, category, description, transaction_date, balance, merchant_info, is_recurring) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING *`,
        [
          transactionData.accountId,
          transactionData.amount,
          transactionData.type,
          transactionData.category || null,
          transactionData.description || null,
          transactionData.transactionDate,
          transactionData.balance || null,
          transactionData.merchantInfo || null,
          transactionData.isRecurring || false
        ]
      );

      return this.mapRowToTransaction(result.rows[0]);
    } catch (error) {
      console.error('❌ Failed to create transaction:', error);
      throw new Error('Transaction creation failed');
    }
  }

  // Bulk create transactions
  static async createBulk(transactions: CreateTransactionData[]): Promise<Transaction[]> {
    try {
      if (transactions.length === 0) {
        return [];
      }

      const values: any[] = [];
      const placeholders: string[] = [];
      let paramCount = 1;

      transactions.forEach((transaction, index) => {
        const placeholder = `($${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++})`;
        placeholders.push(placeholder);

        values.push(
          transaction.accountId,
          transaction.amount,
          transaction.type,
          transaction.category || null,
          transaction.description || null,
          transaction.transactionDate,
          transaction.balance || null,
          transaction.merchantInfo || null,
          transaction.isRecurring || false
        );
      });

      const result = await query(
        `INSERT INTO transactions 
         (account_id, amount, type, category, description, transaction_date, balance, merchant_info, is_recurring) 
         VALUES ${placeholders.join(', ')} 
         RETURNING *`,
        values
      );

      return result.rows.map(row => this.mapRowToTransaction(row));
    } catch (error) {
      console.error('❌ Failed to create bulk transactions:', error);
      throw new Error('Bulk transaction creation failed');
    }
  }

  // Find transaction by ID
  static async findById(id: string): Promise<Transaction | null> {
    try {
      const result = await query('SELECT * FROM transactions WHERE id = $1', [id]);
      return result.rows.length > 0 ? this.mapRowToTransaction(result.rows[0]) : null;
    } catch (error) {
      console.error('❌ Failed to find transaction by ID:', error);
      throw new Error('Transaction lookup failed');
    }
  }

  // Find transactions by account ID
  static async findByAccountId(
    accountId: string,
    page: number = 1,
    limit: number = 50,
    filters?: Omit<TransactionFilters, 'accountId'>
  ): Promise<{ transactions: Transaction[]; total: number; page: number; limit: number }> {
    try {
      const offset = (page - 1) * limit;
      const conditions = ['account_id = $1'];
      const values = [accountId];
      let paramCount = 2;

      // Apply filters
      if (filters?.type) {
        conditions.push(`type = $${paramCount++}`);
        values.push(filters.type);
      }

      if (filters?.category) {
        conditions.push(`category = $${paramCount++}`);
        values.push(filters.category);
      }

      if (filters?.dateFrom) {
        conditions.push(`transaction_date >= $${paramCount++}`);
        values.push(filters.dateFrom.toISOString());
      }

      if (filters?.dateTo) {
        conditions.push(`transaction_date <= $${paramCount++}`);
        values.push(filters.dateTo.toISOString());
      }

      if (filters?.amountMin !== undefined) {
        conditions.push(`amount >= $${paramCount++}`);
        values.push(filters.amountMin.toString());
      }

      if (filters?.amountMax !== undefined) {
        conditions.push(`amount <= $${paramCount++}`);
        values.push(filters.amountMax.toString());
      }

      if (filters?.isRecurring !== undefined) {
        conditions.push(`is_recurring = $${paramCount++}`);
        values.push(filters.isRecurring.toString());
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total FROM transactions ${whereClause}`,
        values
      );
      const total = parseInt(countResult.rows[0].total);

      // Get transactions
      const transactionsResult = await query(
        `SELECT * FROM transactions ${whereClause} 
         ORDER BY transaction_date DESC, created_at DESC 
         LIMIT $${paramCount++} OFFSET $${paramCount}`,
        [...values, limit, offset]
      );

      const transactions = transactionsResult.rows.map(row => this.mapRowToTransaction(row));

      return {
        transactions,
        total,
        page,
        limit
      };
    } catch (error) {
      console.error('❌ Failed to find transactions by account ID:', error);
      throw new Error('Transactions lookup failed');
    }
  }

  // Find transactions by user ID (across all accounts)
  static async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 50,
    filters?: Omit<TransactionFilters, 'userId'>
  ): Promise<{ transactions: Transaction[]; total: number; page: number; limit: number }> {
    try {
      const offset = (page - 1) * limit;
      const conditions = ['ac.user_id = $1'];
      const values = [userId];
      let paramCount = 2;

      // Apply filters
      if (filters?.accountId) {
        conditions.push(`t.account_id = $${paramCount++}`);
        values.push(filters.accountId);
      }

      if (filters?.type) {
        conditions.push(`t.type = $${paramCount++}`);
        values.push(filters.type);
      }

      if (filters?.category) {
        conditions.push(`t.category = $${paramCount++}`);
        values.push(filters.category);
      }

      if (filters?.dateFrom) {
        conditions.push(`t.transaction_date >= $${paramCount++}`);
        values.push(filters.dateFrom.toISOString());
      }

      if (filters?.dateTo) {
        conditions.push(`t.transaction_date <= $${paramCount++}`);
        values.push(filters.dateTo.toISOString());
      }

      if (filters?.amountMin !== undefined) {
        conditions.push(`t.amount >= $${paramCount++}`);
        values.push(filters.amountMin.toString());
      }

      if (filters?.amountMax !== undefined) {
        conditions.push(`t.amount <= $${paramCount++}`);
        values.push(filters.amountMax.toString());
      }

      if (filters?.isRecurring !== undefined) {
        conditions.push(`t.is_recurring = $${paramCount++}`);
        values.push(filters.isRecurring.toString());
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total 
         FROM transactions t 
         JOIN account_connections ac ON t.account_id = ac.id 
         ${whereClause}`,
        values
      );
      const total = parseInt(countResult.rows[0].total);

      // Get transactions
      const transactionsResult = await query(
        `SELECT t.* 
         FROM transactions t 
         JOIN account_connections ac ON t.account_id = ac.id 
         ${whereClause}
         ORDER BY t.transaction_date DESC, t.created_at DESC 
         LIMIT $${paramCount++} OFFSET $${paramCount}`,
        [...values, limit, offset]
      );

      const transactions = transactionsResult.rows.map(row => this.mapRowToTransaction(row));

      return {
        transactions,
        total,
        page,
        limit
      };
    } catch (error) {
      console.error('❌ Failed to find transactions by user ID:', error);
      throw new Error('Transactions lookup failed');
    }
  }

  // Update transaction
  static async update(id: string, updateData: UpdateTransactionData): Promise<Transaction | null> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updateData.category !== undefined) {
        updates.push(`category = $${paramCount++}`);
        values.push(updateData.category);
      }

      if (updateData.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(updateData.description);
      }

      if (updateData.merchantInfo !== undefined) {
        updates.push(`merchant_info = $${paramCount++}`);
        values.push(updateData.merchantInfo);
      }

      if (updateData.isRecurring !== undefined) {
        updates.push(`is_recurring = $${paramCount++}`);
        values.push(updateData.isRecurring);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const updateQuery = `
        UPDATE transactions 
        SET ${updates.join(', ')} 
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await query(updateQuery, values);
      return result.rows.length > 0 ? this.mapRowToTransaction(result.rows[0]) : null;
    } catch (error) {
      console.error('❌ Failed to update transaction:', error);
      throw new Error('Transaction update failed');
    }
  }

  // Delete transaction
  static async delete(id: string): Promise<boolean> {
    try {
      const result = await query('DELETE FROM transactions WHERE id = $1', [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Failed to delete transaction:', error);
      throw new Error('Transaction deletion failed');
    }
  }

  // Get transaction statistics
  static async getStats(userId: string, dateFrom?: Date, dateTo?: Date): Promise<TransactionStats> {
    try {
      const conditions = ['ac.user_id = $1'];
      const values = [userId];
      let paramCount = 2;

      if (dateFrom) {
        conditions.push(`t.transaction_date >= $${paramCount++}`);
        values.push(dateFrom.toISOString());
      }

      if (dateTo) {
        conditions.push(`t.transaction_date <= $${paramCount++}`);
        values.push(dateTo.toISOString());
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const result = await query(
        `SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END) as total_credits,
          SUM(CASE WHEN t.type = 'debit' THEN t.amount ELSE 0 END) as total_debits,
          SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END) as net_amount,
          AVG(t.amount) as average_transaction,
          COUNT(CASE WHEN t.is_recurring = true THEN 1 END) as recurring_transactions,
          t.category,
          COUNT(CASE WHEN t.category IS NOT NULL THEN 1 END) as category_count,
          SUM(CASE WHEN t.category IS NOT NULL THEN t.amount ELSE 0 END) as category_amount
         FROM transactions t 
         JOIN account_connections ac ON t.account_id = ac.id 
         ${whereClause}
         GROUP BY t.category`,
        values
      );

      const stats: TransactionStats = {
        totalTransactions: 0,
        totalCredits: 0,
        totalDebits: 0,
        netAmount: 0,
        averageTransaction: 0,
        recurringTransactions: 0,
        categoriesBreakdown: {}
      };

      if (result.rows.length > 0) {
        const firstRow = result.rows[0];
        stats.totalTransactions = parseInt(firstRow.total_transactions) || 0;
        stats.totalCredits = parseFloat(firstRow.total_credits) || 0;
        stats.totalDebits = parseFloat(firstRow.total_debits) || 0;
        stats.netAmount = parseFloat(firstRow.net_amount) || 0;
        stats.averageTransaction = parseFloat(firstRow.average_transaction) || 0;
        stats.recurringTransactions = parseInt(firstRow.recurring_transactions) || 0;

        // Build categories breakdown
        result.rows.forEach(row => {
          if (row.category) {
            stats.categoriesBreakdown[row.category] = {
              count: parseInt(row.category_count) || 0,
              amount: parseFloat(row.category_amount) || 0
            };
          }
        });
      }

      return stats;
    } catch (error) {
      console.error('❌ Failed to get transaction stats:', error);
      throw new Error('Transaction stats lookup failed');
    }
  }

  // Get recent transactions
  static async getRecent(userId: string, limit: number = 10): Promise<Transaction[]> {
    try {
      const result = await query(
        `SELECT t.* 
         FROM transactions t 
         JOIN account_connections ac ON t.account_id = ac.id 
         WHERE ac.user_id = $1 
         ORDER BY t.transaction_date DESC, t.created_at DESC 
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows.map(row => this.mapRowToTransaction(row));
    } catch (error) {
      console.error('❌ Failed to get recent transactions:', error);
      throw new Error('Recent transactions lookup failed');
    }
  }

  // Helper method to map database row to Transaction interface
  private static mapRowToTransaction(row: any): Transaction {
    return {
      id: row.id,
      accountId: row.account_id,
      amount: parseFloat(row.amount),
      type: row.type,
      category: row.category,
      description: row.description,
      transactionDate: row.transaction_date,
      balance: row.balance ? parseFloat(row.balance) : undefined,
      merchantInfo: row.merchant_info,
      isRecurring: row.is_recurring,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}