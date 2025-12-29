import { query } from '../config/database';

export interface CreditScore {
  id: string;
  userId: string;
  score: number; // 300-850 range
  scoreDate: Date;
  confidence: number; // 0-1 range
  traditionalScore?: number; // null for users without credit history
  trend: 'improving' | 'stable' | 'declining';
  factors: ScoreFactor[];
  createdAt: Date;
}

export interface ScoreFactor {
  id: string;
  creditScoreId: string;
  category: 'income_stability' | 'savings_rate' | 'payment_behavior' | 'investment_activity';
  impact: number; // -100 to +100
  description: string;
  weight: number; // 0-1 range
  createdAt: Date;
}

export interface CreateCreditScoreData {
  userId: string;
  score: number;
  confidence: number;
  traditionalScore?: number;
  trend?: 'improving' | 'stable' | 'declining';
  factors: CreateScoreFactorData[];
}

export interface CreateScoreFactorData {
  category: 'income_stability' | 'savings_rate' | 'payment_behavior' | 'investment_activity';
  impact: number;
  description: string;
  weight: number;
}

export interface UpdateCreditScoreData {
  score?: number;
  confidence?: number;
  traditionalScore?: number;
  trend?: 'improving' | 'stable' | 'declining';
}

export interface ScoreHistory {
  date: Date;
  score: number;
  confidence: number;
  trend: string;
}

export interface ScoreComparison {
  current: CreditScore | null;
  previous: CreditScore | null;
  change: number;
  changePercent: number;
  daysApart: number;
}

export class CreditScoreModel {
  // Create a new credit score with factors
  static async create(scoreData: CreateCreditScoreData): Promise<CreditScore> {
    const client = await import('../config/database').then(db => db.getClient());
    
    try {
      await client.query('BEGIN');

      // Create credit score
      const scoreResult = await client.query(
        `INSERT INTO credit_scores 
         (user_id, score, confidence, traditional_score, trend) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [
          scoreData.userId,
          scoreData.score,
          scoreData.confidence,
          scoreData.traditionalScore || null,
          scoreData.trend || 'stable'
        ]
      );

      const creditScore = scoreResult.rows[0];

      // Create score factors
      const factors: ScoreFactor[] = [];
      for (const factorData of scoreData.factors) {
        const factorResult = await client.query(
          `INSERT INTO score_factors 
           (credit_score_id, category, impact, description, weight) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING *`,
          [
            creditScore.id,
            factorData.category,
            factorData.impact,
            factorData.description,
            factorData.weight
          ]
        );
        factors.push(this.mapRowToScoreFactor(factorResult.rows[0]));
      }

      await client.query('COMMIT');

      return {
        ...this.mapRowToCreditScore(creditScore),
        factors
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Failed to create credit score:', error);
      throw new Error('Credit score creation failed');
    } finally {
      client.release();
    }
  }

  // Find credit score by ID (with factors)
  static async findById(id: string): Promise<CreditScore | null> {
    try {
      const scoreResult = await query('SELECT * FROM credit_scores WHERE id = $1', [id]);
      
      if (scoreResult.rows.length === 0) {
        return null;
      }

      const score = this.mapRowToCreditScore(scoreResult.rows[0]);

      // Get factors
      const factorsResult = await query(
        'SELECT * FROM score_factors WHERE credit_score_id = $1 ORDER BY weight DESC',
        [id]
      );

      score.factors = factorsResult.rows.map(row => this.mapRowToScoreFactor(row));

      return score;
    } catch (error) {
      console.error('❌ Failed to find credit score by ID:', error);
      throw new Error('Credit score lookup failed');
    }
  }

  // Find latest credit score for user
  static async findLatestByUserId(userId: string): Promise<CreditScore | null> {
    try {
      const scoreResult = await query(
        'SELECT * FROM credit_scores WHERE user_id = $1 ORDER BY score_date DESC LIMIT 1',
        [userId]
      );

      if (scoreResult.rows.length === 0) {
        return null;
      }

      const score = this.mapRowToCreditScore(scoreResult.rows[0]);

      // Get factors
      const factorsResult = await query(
        'SELECT * FROM score_factors WHERE credit_score_id = $1 ORDER BY weight DESC',
        [score.id]
      );

      score.factors = factorsResult.rows.map(row => this.mapRowToScoreFactor(row));

      return score;
    } catch (error) {
      console.error('❌ Failed to find latest credit score:', error);
      throw new Error('Latest credit score lookup failed');
    }
  }

  // Get credit score history for user
  static async getHistory(
    userId: string,
    limit: number = 12,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<ScoreHistory[]> {
    try {
      const conditions = ['user_id = $1'];
      const values = [userId];
      let paramCount = 2;

      if (dateFrom) {
        conditions.push(`score_date >= $${paramCount++}`);
        values.push(dateFrom.toISOString());
      }

      if (dateTo) {
        conditions.push(`score_date <= $${paramCount++}`);
        values.push(dateTo.toISOString());
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const result = await query(
        `SELECT score_date, score, confidence, trend 
         FROM credit_scores 
         ${whereClause}
         ORDER BY score_date DESC 
         LIMIT $${paramCount}`,
        [...values, limit]
      );

      return result.rows.map(row => ({
        date: row.score_date,
        score: row.score,
        confidence: parseFloat(row.confidence),
        trend: row.trend
      }));
    } catch (error) {
      console.error('❌ Failed to get credit score history:', error);
      throw new Error('Credit score history lookup failed');
    }
  }

  // Compare current score with previous
  static async getScoreComparison(userId: string): Promise<ScoreComparison> {
    try {
      const result = await query(
        `SELECT * FROM credit_scores 
         WHERE user_id = $1 
         ORDER BY score_date DESC 
         LIMIT 2`,
        [userId]
      );

      const current = result.rows.length > 0 ? this.mapRowToCreditScore(result.rows[0]) : null;
      const previous = result.rows.length > 1 ? this.mapRowToCreditScore(result.rows[1]) : null;

      let change = 0;
      let changePercent = 0;
      let daysApart = 0;

      if (current && previous) {
        change = current.score - previous.score;
        changePercent = (change / previous.score) * 100;
        daysApart = Math.floor(
          (current.scoreDate.getTime() - previous.scoreDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      return {
        current,
        previous,
        change,
        changePercent,
        daysApart
      };
    } catch (error) {
      console.error('❌ Failed to get score comparison:', error);
      throw new Error('Score comparison lookup failed');
    }
  }

  // Update credit score
  static async update(id: string, updateData: UpdateCreditScoreData): Promise<CreditScore | null> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updateData.score !== undefined) {
        updates.push(`score = $${paramCount++}`);
        values.push(updateData.score);
      }

      if (updateData.confidence !== undefined) {
        updates.push(`confidence = $${paramCount++}`);
        values.push(updateData.confidence);
      }

      if (updateData.traditionalScore !== undefined) {
        updates.push(`traditional_score = $${paramCount++}`);
        values.push(updateData.traditionalScore);
      }

      if (updateData.trend !== undefined) {
        updates.push(`trend = $${paramCount++}`);
        values.push(updateData.trend);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(id);

      const updateQuery = `
        UPDATE credit_scores 
        SET ${updates.join(', ')} 
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await query(updateQuery, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      const score = this.mapRowToCreditScore(result.rows[0]);

      // Get factors
      const factorsResult = await query(
        'SELECT * FROM score_factors WHERE credit_score_id = $1 ORDER BY weight DESC',
        [id]
      );

      score.factors = factorsResult.rows.map(row => this.mapRowToScoreFactor(row));

      return score;
    } catch (error) {
      console.error('❌ Failed to update credit score:', error);
      throw new Error('Credit score update failed');
    }
  }

  // Delete credit score and its factors
  static async delete(id: string): Promise<boolean> {
    try {
      // Factors will be deleted automatically due to CASCADE constraint
      const result = await query('DELETE FROM credit_scores WHERE id = $1', [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Failed to delete credit score:', error);
      throw new Error('Credit score deletion failed');
    }
  }

  // Get score statistics for user
  static async getStats(userId: string): Promise<{
    totalScores: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    currentTrend: string;
    improvementRate: number; // scores per month
    factorBreakdown: Record<string, { count: number; averageImpact: number }>;
  }> {
    try {
      const result = await query(
        `SELECT 
          COUNT(*) as total_scores,
          AVG(score) as average_score,
          MAX(score) as highest_score,
          MIN(score) as lowest_score,
          (SELECT trend FROM credit_scores WHERE user_id = $1 ORDER BY score_date DESC LIMIT 1) as current_trend,
          sf.category,
          COUNT(sf.id) as factor_count,
          AVG(sf.impact) as average_impact
         FROM credit_scores cs
         LEFT JOIN score_factors sf ON cs.id = sf.credit_score_id
         WHERE cs.user_id = $1
         GROUP BY sf.category`,
        [userId]
      );

      const stats = {
        totalScores: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        currentTrend: 'stable',
        improvementRate: 0,
        factorBreakdown: {} as Record<string, { count: number; averageImpact: number }>
      };

      if (result.rows.length > 0) {
        const firstRow = result.rows[0];
        stats.totalScores = parseInt(firstRow.total_scores) || 0;
        stats.averageScore = parseFloat(firstRow.average_score) || 0;
        stats.highestScore = parseInt(firstRow.highest_score) || 0;
        stats.lowestScore = parseInt(firstRow.lowest_score) || 0;
        stats.currentTrend = firstRow.current_trend || 'stable';

        // Calculate improvement rate (scores per month)
        if (stats.totalScores > 1) {
          const dateRangeResult = await query(
            `SELECT 
              MIN(score_date) as first_score_date,
              MAX(score_date) as last_score_date
             FROM credit_scores 
             WHERE user_id = $1`,
            [userId]
          );

          if (dateRangeResult.rows.length > 0) {
            const { first_score_date, last_score_date } = dateRangeResult.rows[0];
            const monthsDiff = (new Date(last_score_date).getTime() - new Date(first_score_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
            stats.improvementRate = monthsDiff > 0 ? stats.totalScores / monthsDiff : 0;
          }
        }

        // Build factor breakdown
        result.rows.forEach(row => {
          if (row.category) {
            stats.factorBreakdown[row.category] = {
              count: parseInt(row.factor_count) || 0,
              averageImpact: parseFloat(row.average_impact) || 0
            };
          }
        });
      }

      return stats;
    } catch (error) {
      console.error('❌ Failed to get credit score stats:', error);
      throw new Error('Credit score stats lookup failed');
    }
  }

  // List credit scores with pagination
  static async list(
    page: number = 1,
    limit: number = 20,
    filters?: {
      userId?: string;
      scoreMin?: number;
      scoreMax?: number;
      trend?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<{ scores: CreditScore[]; total: number; page: number; limit: number }> {
    try {
      const offset = (page - 1) * limit;
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (filters?.userId) {
        conditions.push(`user_id = $${paramCount++}`);
        values.push(filters.userId);
      }

      if (filters?.scoreMin !== undefined) {
        conditions.push(`score >= $${paramCount++}`);
        values.push(filters.scoreMin);
      }

      if (filters?.scoreMax !== undefined) {
        conditions.push(`score <= $${paramCount++}`);
        values.push(filters.scoreMax);
      }

      if (filters?.trend) {
        conditions.push(`trend = $${paramCount++}`);
        values.push(filters.trend);
      }

      if (filters?.dateFrom) {
        conditions.push(`score_date >= $${paramCount++}`);
        values.push(filters.dateFrom);
      }

      if (filters?.dateTo) {
        conditions.push(`score_date <= $${paramCount++}`);
        values.push(filters.dateTo);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total FROM credit_scores ${whereClause}`,
        values
      );
      const total = parseInt(countResult.rows[0].total);

      // Get scores (without factors for list view)
      const scoresResult = await query(
        `SELECT * FROM credit_scores ${whereClause} 
         ORDER BY score_date DESC 
         LIMIT $${paramCount++} OFFSET $${paramCount}`,
        [...values, limit, offset]
      );

      const scores = scoresResult.rows.map(row => ({
        ...this.mapRowToCreditScore(row),
        factors: [] // Empty for list view, use findById to get factors
      }));

      return {
        scores,
        total,
        page,
        limit
      };
    } catch (error) {
      console.error('❌ Failed to list credit scores:', error);
      throw new Error('Credit scores listing failed');
    }
  }

  // Helper method to map database row to CreditScore interface
  private static mapRowToCreditScore(row: any): CreditScore {
    return {
      id: row.id,
      userId: row.user_id,
      score: parseInt(row.score),
      scoreDate: row.score_date,
      confidence: parseFloat(row.confidence),
      traditionalScore: row.traditional_score ? parseInt(row.traditional_score) : undefined,
      trend: row.trend,
      factors: [], // Will be populated separately
      createdAt: row.created_at,
    };
  }

  // Helper method to map database row to ScoreFactor interface
  private static mapRowToScoreFactor(row: any): ScoreFactor {
    return {
      id: row.id,
      creditScoreId: row.credit_score_id,
      category: row.category,
      impact: parseInt(row.impact),
      description: row.description,
      weight: parseFloat(row.weight),
      createdAt: row.created_at,
    };
  }
}