import { Request } from 'express';
import pool from '../config/database';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
  success: boolean;
  errorMessage?: string;
}

export class AuditService {
  private static instance: AuditService;

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  // Log audit event
  async logEvent(entry: AuditLogEntry): Promise<void> {
    try {
      const query = `
        INSERT INTO audit_logs (
          user_id, action, resource, resource_id, details, 
          ip_address, user_agent, timestamp, success, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      const values = [
        entry.userId || null,
        entry.action,
        entry.resource,
        entry.resourceId || null,
        entry.details ? JSON.stringify(entry.details) : null,
        entry.ipAddress || null,
        entry.userAgent || null,
        entry.timestamp || new Date(),
        entry.success,
        entry.errorMessage || null
      ];

      await pool.query(query, values);
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  // Log authentication events
  async logAuth(
    action: 'LOGIN' | 'LOGOUT' | 'REGISTER' | 'PASSWORD_RESET' | 'TOKEN_REFRESH',
    userId: string | null,
    req: Request,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      action,
      resource: 'AUTH',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success,
      errorMessage
    });
  }

  // Log data access events
  async logDataAccess(
    action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE',
    resource: string,
    resourceId: string,
    userId: string,
    req: Request,
    success: boolean,
    details?: any,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: `DATA_${action}`,
      resource,
      resourceId,
      details,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success,
      errorMessage
    });
  }

  // Log consent events
  async logConsent(
    action: 'GRANT' | 'REVOKE' | 'EXPIRE' | 'RENEW',
    consentId: string,
    userId: string,
    req: Request,
    success: boolean,
    details?: any,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: `CONSENT_${action}`,
      resource: 'CONSENT',
      resourceId: consentId,
      details,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success,
      errorMessage
    });
  }

  // Log score calculation events
  async logScoreCalculation(
    userId: string,
    req: Request,
    success: boolean,
    scoreDetails?: any,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: 'SCORE_CALCULATION',
      resource: 'CREDIT_SCORE',
      details: scoreDetails,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success,
      errorMessage
    });
  }

  // Log account connection events
  async logAccountConnection(
    action: 'CONNECT' | 'DISCONNECT' | 'SYNC',
    connectionId: string,
    userId: string,
    req: Request,
    success: boolean,
    details?: any,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: `ACCOUNT_${action}`,
      resource: 'ACCOUNT_CONNECTION',
      resourceId: connectionId,
      details,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success,
      errorMessage
    });
  }

  // Get audit logs for a user
  async getUserAuditLogs(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditLogEntry[]> {
    try {
      const query = `
        SELECT 
          user_id, action, resource, resource_id, details,
          ip_address, user_agent, timestamp, success, error_message
        FROM audit_logs 
        WHERE user_id = $1 
        ORDER BY timestamp DESC 
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(query, [userId, limit, offset]);
      
      return result.rows.map(row => ({
        userId: row.user_id,
        action: row.action,
        resource: row.resource,
        resourceId: row.resource_id,
        details: row.details ? JSON.parse(row.details) : null,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.timestamp,
        success: row.success,
        errorMessage: row.error_message
      }));
    } catch (error) {
      console.error('Failed to get user audit logs:', error);
      throw new Error('Failed to retrieve audit logs');
    }
  }

  // Get audit logs for a specific resource
  async getResourceAuditLogs(
    resource: string,
    resourceId: string,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    try {
      const query = `
        SELECT 
          user_id, action, resource, resource_id, details,
          ip_address, user_agent, timestamp, success, error_message
        FROM audit_logs 
        WHERE resource = $1 AND resource_id = $2
        ORDER BY timestamp DESC 
        LIMIT $3
      `;

      const result = await pool.query(query, [resource, resourceId, limit]);
      
      return result.rows.map(row => ({
        userId: row.user_id,
        action: row.action,
        resource: row.resource,
        resourceId: row.resource_id,
        details: row.details ? JSON.parse(row.details) : null,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.timestamp,
        success: row.success,
        errorMessage: row.error_message
      }));
    } catch (error) {
      console.error('Failed to get resource audit logs:', error);
      throw new Error('Failed to retrieve audit logs');
    }
  }

  // Get security events (failed attempts, suspicious activity)
  async getSecurityEvents(
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLogEntry[]> {
    try {
      const query = `
        SELECT 
          user_id, action, resource, resource_id, details,
          ip_address, user_agent, timestamp, success, error_message
        FROM audit_logs 
        WHERE success = false 
           OR action LIKE '%FAILED%' 
           OR action LIKE '%SUSPICIOUS%'
           OR action LIKE '%BLOCKED%'
        ORDER BY timestamp DESC 
        LIMIT $1 OFFSET $2
      `;

      const result = await pool.query(query, [limit, offset]);
      
      return result.rows.map(row => ({
        userId: row.user_id,
        action: row.action,
        resource: row.resource,
        resourceId: row.resource_id,
        details: row.details ? JSON.parse(row.details) : null,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.timestamp,
        success: row.success,
        errorMessage: row.error_message
      }));
    } catch (error) {
      console.error('Failed to get security events:', error);
      throw new Error('Failed to retrieve security events');
    }
  }

  // Generate compliance report
  async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalEvents: number;
    authEvents: number;
    dataAccessEvents: number;
    consentEvents: number;
    securityEvents: number;
    topActions: Array<{ action: string; count: number }>;
    topUsers: Array<{ userId: string; count: number }>;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_events,
          COUNT(CASE WHEN resource = 'AUTH' THEN 1 END) as auth_events,
          COUNT(CASE WHEN action LIKE 'DATA_%' THEN 1 END) as data_access_events,
          COUNT(CASE WHEN action LIKE 'CONSENT_%' THEN 1 END) as consent_events,
          COUNT(CASE WHEN success = false THEN 1 END) as security_events
        FROM audit_logs 
        WHERE timestamp BETWEEN $1 AND $2
      `;

      const summaryResult = await pool.query(query, [startDate, endDate]);
      const summary = summaryResult.rows[0];

      // Get top actions
      const topActionsQuery = `
        SELECT action, COUNT(*) as count
        FROM audit_logs 
        WHERE timestamp BETWEEN $1 AND $2
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
      `;
      const topActionsResult = await pool.query(topActionsQuery, [startDate, endDate]);

      // Get top users
      const topUsersQuery = `
        SELECT user_id, COUNT(*) as count
        FROM audit_logs 
        WHERE timestamp BETWEEN $1 AND $2 AND user_id IS NOT NULL
        GROUP BY user_id
        ORDER BY count DESC
        LIMIT 10
      `;
      const topUsersResult = await pool.query(topUsersQuery, [startDate, endDate]);

      return {
        totalEvents: parseInt(summary.total_events),
        authEvents: parseInt(summary.auth_events),
        dataAccessEvents: parseInt(summary.data_access_events),
        consentEvents: parseInt(summary.consent_events),
        securityEvents: parseInt(summary.security_events),
        topActions: topActionsResult.rows.map(row => ({
          action: row.action,
          count: parseInt(row.count)
        })),
        topUsers: topUsersResult.rows.map(row => ({
          userId: row.user_id,
          count: parseInt(row.count)
        }))
      };
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw new Error('Failed to generate compliance report');
    }
  }
}

export default AuditService.getInstance();