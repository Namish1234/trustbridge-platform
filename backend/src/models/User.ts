import { query } from '../config/database';

export interface User {
  id: string;
  email: string;
  phone?: string;
  firebaseUid?: string;
  createdAt: Date;
  updatedAt: Date;
  kycStatus: 'pending' | 'verified' | 'rejected';
  consentStatus: 'active' | 'revoked' | 'expired';
  lastLoginAt?: Date;
  panNumber?: string; // Encrypted
  isActive: boolean;
}

export interface CreateUserData {
  email: string;
  phone?: string;
  firebaseUid?: string;
  kycStatus?: 'pending' | 'verified' | 'rejected';
  consentStatus?: 'active' | 'revoked' | 'expired';
  panNumber?: string;
}

export interface UpdateUserData {
  phone?: string;
  kycStatus?: 'pending' | 'verified' | 'rejected';
  consentStatus?: 'active' | 'revoked' | 'expired';
  panNumber?: string;
  isActive?: boolean;
}

export class UserModel {
  // Create a new user
  static async create(userData: CreateUserData): Promise<User> {
    try {
      const result = await query(
        `INSERT INTO users (email, phone, firebase_uid, kyc_status, consent_status, pan_number) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [
          userData.email,
          userData.phone || null,
          userData.firebaseUid || null,
          userData.kycStatus || 'pending',
          userData.consentStatus || 'active',
          userData.panNumber || null
        ]
      );

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      console.error('❌ Failed to create user:', error);
      throw new Error('User creation failed');
    }
  }

  // Find user by ID
  static async findById(id: string): Promise<User | null> {
    try {
      const result = await query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
    } catch (error) {
      console.error('❌ Failed to find user by ID:', error);
      throw new Error('User lookup failed');
    }
  }

  // Find user by email
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
    } catch (error) {
      console.error('❌ Failed to find user by email:', error);
      throw new Error('User lookup failed');
    }
  }

  // Find user by Firebase UID
  static async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    try {
      const result = await query('SELECT * FROM users WHERE firebase_uid = $1', [firebaseUid]);
      return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
    } catch (error) {
      console.error('❌ Failed to find user by Firebase UID:', error);
      throw new Error('User lookup failed');
    }
  }

  // Update user
  static async update(id: string, updateData: UpdateUserData): Promise<User | null> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updateData.phone !== undefined) {
        updates.push(`phone = $${paramCount++}`);
        values.push(updateData.phone);
      }

      if (updateData.kycStatus !== undefined) {
        updates.push(`kyc_status = $${paramCount++}`);
        values.push(updateData.kycStatus);
      }

      if (updateData.consentStatus !== undefined) {
        updates.push(`consent_status = $${paramCount++}`);
        values.push(updateData.consentStatus);
      }

      if (updateData.panNumber !== undefined) {
        updates.push(`pan_number = $${paramCount++}`);
        values.push(updateData.panNumber);
      }

      if (updateData.isActive !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(updateData.isActive);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const updateQuery = `
        UPDATE users 
        SET ${updates.join(', ')} 
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await query(updateQuery, values);
      return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
    } catch (error) {
      console.error('❌ Failed to update user:', error);
      throw new Error('User update failed');
    }
  }

  // Update last login time
  static async updateLastLogin(id: string): Promise<void> {
    try {
      await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [id]);
    } catch (error) {
      console.error('❌ Failed to update last login:', error);
      throw new Error('Last login update failed');
    }
  }

  // Soft delete user (deactivate)
  static async deactivate(id: string): Promise<boolean> {
    try {
      const result = await query(
        'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Failed to deactivate user:', error);
      throw new Error('User deactivation failed');
    }
  }

  // Get user statistics
  static async getStats(id: string): Promise<{
    accountConnections: number;
    totalTransactions: number;
    latestScoreDate?: Date;
    memberSince: Date;
  }> {
    try {
      const result = await query(
        `SELECT 
          u.created_at as member_since,
          COUNT(DISTINCT ac.id) as account_connections,
          COUNT(DISTINCT t.id) as total_transactions,
          MAX(cs.score_date) as latest_score_date
         FROM users u
         LEFT JOIN account_connections ac ON u.id = ac.user_id AND ac.connection_status = 'active'
         LEFT JOIN transactions t ON ac.id = t.account_id
         LEFT JOIN credit_scores cs ON u.id = cs.user_id
         WHERE u.id = $1
         GROUP BY u.id, u.created_at`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const row = result.rows[0];
      return {
        accountConnections: parseInt(row.account_connections) || 0,
        totalTransactions: parseInt(row.total_transactions) || 0,
        latestScoreDate: row.latest_score_date || undefined,
        memberSince: row.member_since,
      };
    } catch (error) {
      console.error('❌ Failed to get user stats:', error);
      throw new Error('User stats lookup failed');
    }
  }

  // List users with pagination
  static async list(
    page: number = 1, 
    limit: number = 20, 
    filters?: {
      kycStatus?: string;
      consentStatus?: string;
      isActive?: boolean;
    }
  ): Promise<{ users: User[]; total: number; page: number; limit: number }> {
    try {
      const offset = (page - 1) * limit;
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (filters?.kycStatus) {
        conditions.push(`kyc_status = $${paramCount++}`);
        values.push(filters.kycStatus);
      }

      if (filters?.consentStatus) {
        conditions.push(`consent_status = $${paramCount++}`);
        values.push(filters.consentStatus);
      }

      if (filters?.isActive !== undefined) {
        conditions.push(`is_active = $${paramCount++}`);
        values.push(filters.isActive);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total FROM users ${whereClause}`,
        values
      );
      const total = parseInt(countResult.rows[0].total);

      // Get users
      const usersResult = await query(
        `SELECT * FROM users ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT $${paramCount++} OFFSET $${paramCount}`,
        [...values, limit, offset]
      );

      const users = usersResult.rows.map(row => this.mapRowToUser(row));

      return {
        users,
        total,
        page,
        limit
      };
    } catch (error) {
      console.error('❌ Failed to list users:', error);
      throw new Error('User listing failed');
    }
  }

  // Helper method to map database row to User interface
  private static mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      phone: row.phone,
      firebaseUid: row.firebase_uid,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      kycStatus: row.kyc_status,
      consentStatus: row.consent_status,
      lastLoginAt: row.last_login_at,
      panNumber: row.pan_number,
      isActive: row.is_active,
    };
  }
}