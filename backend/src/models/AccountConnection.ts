import { query } from '../config/database';

export interface AccountConnection {
  id: string;
  userId: string;
  institutionId: string;
  institutionName: string;
  accountType: 'savings' | 'current' | 'investment' | 'credit';
  accountNumber?: string; // Encrypted
  connectionStatus: 'active' | 'inactive' | 'error';
  lastSyncAt?: Date;
  consentExpiryAt?: Date;
  encryptedTokens?: string; // Encrypted AA tokens
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAccountConnectionData {
  userId: string;
  institutionId: string;
  institutionName: string;
  accountType: 'savings' | 'current' | 'investment' | 'credit';
  accountNumber?: string;
  consentExpiryAt?: Date;
  encryptedTokens?: string;
}

export interface UpdateAccountConnectionData {
  connectionStatus?: 'active' | 'inactive' | 'error';
  lastSyncAt?: Date;
  consentExpiryAt?: Date;
  encryptedTokens?: string;
}

export class AccountConnectionModel {
  // Create a new account connection
  static async create(connectionData: CreateAccountConnectionData): Promise<AccountConnection> {
    try {
      const result = await query(
        `INSERT INTO account_connections 
         (user_id, institution_id, institution_name, account_type, account_number, consent_expiry_at, encrypted_tokens) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [
          connectionData.userId,
          connectionData.institutionId,
          connectionData.institutionName,
          connectionData.accountType,
          connectionData.accountNumber || null,
          connectionData.consentExpiryAt || null,
          connectionData.encryptedTokens || null
        ]
      );

      return this.mapRowToAccountConnection(result.rows[0]);
    } catch (error) {
      console.error('❌ Failed to create account connection:', error);
      throw new Error('Account connection creation failed');
    }
  }

  // Find account connection by ID
  static async findById(id: string): Promise<AccountConnection | null> {
    try {
      const result = await query('SELECT * FROM account_connections WHERE id = $1', [id]);
      return result.rows.length > 0 ? this.mapRowToAccountConnection(result.rows[0]) : null;
    } catch (error) {
      console.error('❌ Failed to find account connection by ID:', error);
      throw new Error('Account connection lookup failed');
    }
  }

  // Find account connections by user ID
  static async findByUserId(userId: string, status?: string): Promise<AccountConnection[]> {
    try {
      let queryText = 'SELECT * FROM account_connections WHERE user_id = $1';
      const values = [userId];

      if (status) {
        queryText += ' AND connection_status = $2';
        values.push(status);
      }

      queryText += ' ORDER BY created_at DESC';

      const result = await query(queryText, values);
      return result.rows.map((row: any) => this.mapRowToAccountConnection(row));
    } catch (error) {
      console.error('❌ Failed to find account connections by user ID:', error);
      throw new Error('Account connections lookup failed');
    }
  }

  // Find account connections by institution
  static async findByInstitution(institutionId: string): Promise<AccountConnection[]> {
    try {
      const result = await query(
        'SELECT * FROM account_connections WHERE institution_id = $1 ORDER BY created_at DESC',
        [institutionId]
      );
      return result.rows.map((row: any) => this.mapRowToAccountConnection(row));
    } catch (error) {
      console.error('❌ Failed to find account connections by institution:', error);
      throw new Error('Account connections lookup failed');
    }
  }

  // Update account connection
  static async update(id: string, updateData: UpdateAccountConnectionData): Promise<AccountConnection | null> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updateData.connectionStatus !== undefined) {
        updates.push(`connection_status = $${paramCount++}`);
        values.push(updateData.connectionStatus);
      }

      if (updateData.lastSyncAt !== undefined) {
        updates.push(`last_sync_at = $${paramCount++}`);
        values.push(updateData.lastSyncAt);
      }

      if (updateData.consentExpiryAt !== undefined) {
        updates.push(`consent_expiry_at = $${paramCount++}`);
        values.push(updateData.consentExpiryAt);
      }

      if (updateData.encryptedTokens !== undefined) {
        updates.push(`encrypted_tokens = $${paramCount++}`);
        values.push(updateData.encryptedTokens);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const updateQuery = `
        UPDATE account_connections 
        SET ${updates.join(', ')} 
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await query(updateQuery, values);
      return result.rows.length > 0 ? this.mapRowToAccountConnection(result.rows[0]) : null;
    } catch (error) {
      console.error('❌ Failed to update account connection:', error);
      throw new Error('Account connection update failed');
    }
  }

  // Update sync timestamp
  static async updateSyncTime(id: string): Promise<void> {
    try {
      await query(
        'UPDATE account_connections SET last_sync_at = NOW(), updated_at = NOW() WHERE id = $1',
        [id]
      );
    } catch (error) {
      console.error('❌ Failed to update sync time:', error);
      throw new Error('Sync time update failed');
    }
  }

  // Deactivate account connection
  static async deactivate(id: string): Promise<boolean> {
    try {
      const result = await query(
        'UPDATE account_connections SET connection_status = $1, updated_at = NOW() WHERE id = $2',
        ['inactive', id]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Failed to deactivate account connection:', error);
      throw new Error('Account connection deactivation failed');
    }
  }

  // Delete account connection (hard delete)
  static async delete(id: string): Promise<boolean> {
    try {
      const result = await query('DELETE FROM account_connections WHERE id = $1', [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Failed to delete account connection:', error);
      throw new Error('Account connection deletion failed');
    }
  }

  // Get account connection statistics
  static async getStats(userId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    error: number;
    byType: Record<string, number>;
  }> {
    try {
      const result = await query(
        `SELECT 
          connection_status,
          account_type,
          COUNT(*) as count
         FROM account_connections 
         WHERE user_id = $1 
         GROUP BY connection_status, account_type`,
        [userId]
      );

      const stats = {
        total: 0,
        active: 0,
        inactive: 0,
        error: 0,
        byType: {} as Record<string, number>
      };

      result.rows.forEach(row => {
        const count = parseInt(row.count);
        stats.total += count;
        
        // Count by status
        if (row.connection_status === 'active') stats.active += count;
        else if (row.connection_status === 'inactive') stats.inactive += count;
        else if (row.connection_status === 'error') stats.error += count;

        // Count by type
        stats.byType[row.account_type] = (stats.byType[row.account_type] || 0) + count;
      });

      return stats;
    } catch (error) {
      console.error('❌ Failed to get account connection stats:', error);
      throw new Error('Account connection stats lookup failed');
    }
  }

  // Find expired consents
  static async findExpiredConsents(): Promise<AccountConnection[]> {
    try {
      const result = await query(
        `SELECT * FROM account_connections 
         WHERE consent_expiry_at < NOW() 
         AND connection_status = 'active'
         ORDER BY consent_expiry_at ASC`
      );
      return result.rows.map(row => this.mapRowToAccountConnection(row));
    } catch (error) {
      console.error('❌ Failed to find expired consents:', error);
      throw new Error('Expired consents lookup failed');
    }
  }

  // List account connections with pagination
  static async list(
    page: number = 1,
    limit: number = 20,
    filters?: {
      userId?: string;
      institutionId?: string;
      accountType?: string;
      connectionStatus?: string;
    }
  ): Promise<{ connections: AccountConnection[]; total: number; page: number; limit: number }> {
    try {
      const offset = (page - 1) * limit;
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (filters?.userId) {
        conditions.push(`user_id = $${paramCount++}`);
        values.push(filters.userId);
      }

      if (filters?.institutionId) {
        conditions.push(`institution_id = $${paramCount++}`);
        values.push(filters.institutionId);
      }

      if (filters?.accountType) {
        conditions.push(`account_type = $${paramCount++}`);
        values.push(filters.accountType);
      }

      if (filters?.connectionStatus) {
        conditions.push(`connection_status = $${paramCount++}`);
        values.push(filters.connectionStatus);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total FROM account_connections ${whereClause}`,
        values
      );
      const total = parseInt(countResult.rows[0].total);

      // Get connections
      const connectionsResult = await query(
        `SELECT * FROM account_connections ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT $${paramCount++} OFFSET $${paramCount}`,
        [...values, limit, offset]
      );

      const connections = connectionsResult.rows.map(row => this.mapRowToAccountConnection(row));

      return {
        connections,
        total,
        page,
        limit
      };
    } catch (error) {
      console.error('❌ Failed to list account connections:', error);
      throw new Error('Account connections listing failed');
    }
  }

  // Helper method to map database row to AccountConnection interface
  private static mapRowToAccountConnection(row: any): AccountConnection {
    return {
      id: row.id,
      userId: row.user_id,
      institutionId: row.institution_id,
      institutionName: row.institution_name,
      accountType: row.account_type,
      accountNumber: row.account_number,
      connectionStatus: row.connection_status,
      lastSyncAt: row.last_sync_at,
      consentExpiryAt: row.consent_expiry_at,
      encryptedTokens: row.encrypted_tokens,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}