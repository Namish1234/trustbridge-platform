import express, { Request, Response } from 'express';
import { body, query as queryValidator, validationResult } from 'express-validator';
import { authenticateToken, requireKYC, requireConsent } from '../middleware/auth';
import AccountAggregatorService from '../services/AccountAggregatorService';
import { AccountConnectionModel } from '../models/AccountConnection';
import { TransactionModel } from '../models/Transaction';
import { storeOTP, verifyOTP, sendOTPSMS, sendOTPEmail } from '../utils/otp';
import { query } from '../config/database';

const router = express.Router();
const aaService = new AccountAggregatorService();

// Get user's account connections
router.get('/connections',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const connections = await AccountConnectionModel.findByUserId(req.user.userId);
      const stats = await AccountConnectionModel.getStats(req.user.userId);

      res.json({
        connections: connections.map(conn => ({
          id: conn.id,
          institutionName: conn.institutionName,
          accountType: conn.accountType,
          connectionStatus: conn.connectionStatus,
          lastSyncAt: conn.lastSyncAt,
          consentExpiryAt: conn.consentExpiryAt,
          createdAt: conn.createdAt
        })),
        stats
      });

    } catch (error) {
      console.error('❌ Failed to get account connections:', error);
      res.status(500).json({ 
        error: 'Failed to fetch account connections',
        code: 'CONNECTIONS_FETCH_FAILED'
      });
    }
  }
);

// Initiate account connection (Step 1: Create consent request)
router.post('/connect/initiate',
  [
    body('institutionId').notEmpty().withMessage('Institution ID is required'),
    body('accountTypes').isArray({ min: 1 }).withMessage('At least one account type is required'),
    body('purpose').notEmpty().withMessage('Purpose is required'),
    body('dataRangeMonths').isInt({ min: 1, max: 24 }).withMessage('Data range must be 1-24 months'),
  ],
  authenticateToken,
  requireKYC,
  requireConsent,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const { institutionId, accountTypes, purpose, dataRangeMonths } = req.body;

      // Create consent request
      const consentResponse = await aaService.createConsentRequest({
        userId: req.user.userId,
        institutionId,
        accountTypes,
        dataRange: {
          from: new Date(Date.now() - dataRangeMonths * 30 * 24 * 60 * 60 * 1000),
          to: new Date()
        },
        purpose
      });

      res.json({
        message: 'Consent request created successfully',
        consent: consentResponse
      });

    } catch (error) {
      console.error('❌ Failed to initiate account connection:', error);
      res.status(500).json({ 
        error: 'Failed to initiate account connection',
        code: 'CONNECTION_INITIATE_FAILED'
      });
    }
  }
);

// Check consent status and complete connection
router.post('/connect/complete',
  [
    body('consentId').notEmpty().withMessage('Consent ID is required'),
  ],
  authenticateToken,
  requireKYC,
  requireConsent,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const { consentId } = req.body;

      // Check consent status
      const consentStatus = await aaService.getConsentStatus(consentId);

      if (consentStatus.status !== 'ACTIVE') {
        return res.status(400).json({
          error: 'Consent is not active',
          code: 'CONSENT_NOT_ACTIVE',
          status: consentStatus.status
        });
      }

      // Fetch financial data
      const dataResponse = await aaService.fetchFinancialData({
        consentId,
        accountIds: consentStatus.accounts?.map(acc => acc.accountId) || [],
        dateRange: {
          from: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000), // 12 months
          to: new Date()
        }
      });

      // Store account connections
      const connectionIds = await aaService.storeAccountConnections(
        req.user.userId,
        dataResponse.accounts,
        consentId
      );

      // Store transactions
      const transactionCount = await aaService.storeTransactions(
        connectionIds,
        dataResponse.transactions
      );

      res.json({
        message: 'Account connection completed successfully',
        summary: {
          accountsConnected: dataResponse.accounts.length,
          transactionsImported: transactionCount,
          connectionIds
        }
      });

    } catch (error) {
      console.error('❌ Failed to complete account connection:', error);
      res.status(500).json({ 
        error: 'Failed to complete account connection',
        code: 'CONNECTION_COMPLETE_FAILED'
      });
    }
  }
);

// Generate OTP for account verification
router.post('/verify/generate-otp',
  [
    body('phone').isMobilePhone('en-IN').withMessage('Valid Indian phone number is required'),
  ],
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const { phone } = req.body;

      // Generate OTP
      const otp = await storeOTP(req.user.userId, 'account_connection');

      // Send OTP via SMS
      const smsSent = await sendOTPSMS(phone, otp, 'account verification');

      if (!smsSent) {
        return res.status(500).json({
          error: 'Failed to send OTP',
          code: 'OTP_SEND_FAILED'
        });
      }

      res.json({
        message: 'OTP sent successfully',
        expiresIn: 300 // 5 minutes
      });

    } catch (error) {
      console.error('❌ Failed to generate OTP:', error);
      res.status(500).json({ 
        error: 'Failed to generate OTP',
        code: 'OTP_GENERATION_FAILED'
      });
    }
  }
);

// Verify OTP for account verification
router.post('/verify/otp',
  [
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const { otp } = req.body;

      // Verify OTP
      const verification = await verifyOTP(req.user.userId, 'account_connection', otp);

      if (!verification.valid) {
        return res.status(400).json({
          error: verification.error || 'Invalid OTP',
          code: 'OTP_INVALID',
          attemptsLeft: verification.attemptsLeft
        });
      }

      res.json({
        message: 'OTP verified successfully',
        verified: true
      });

    } catch (error) {
      console.error('❌ Failed to verify OTP:', error);
      res.status(500).json({ 
        error: 'Failed to verify OTP',
        code: 'OTP_VERIFICATION_FAILED'
      });
    }
  }
);

// Get user transactions
router.get('/transactions',
  [
    queryValidator('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    queryValidator('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    queryValidator('accountId').optional().isUUID().withMessage('Account ID must be valid UUID'),
    queryValidator('type').optional().isIn(['credit', 'debit']).withMessage('Type must be credit or debit'),
    queryValidator('category').optional().isString().withMessage('Category must be a string'),
    queryValidator('dateFrom').optional().isISO8601().withMessage('Date from must be valid ISO date'),
    queryValidator('dateTo').optional().isISO8601().withMessage('Date to must be valid ISO date'),
  ],
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = {
        accountId: req.query.accountId as string,
        type: req.query.type as 'credit' | 'debit',
        category: req.query.category as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });

      const result = await TransactionModel.findByUserId(req.user.userId, page, limit, filters);

      res.json(result);

    } catch (error) {
      console.error('❌ Failed to get transactions:', error);
      res.status(500).json({ 
        error: 'Failed to fetch transactions',
        code: 'TRANSACTIONS_FETCH_FAILED'
      });
    }
  }
);

// Get transaction statistics
router.get('/transactions/stats',
  [
    queryValidator('dateFrom').optional().isISO8601().withMessage('Date from must be valid ISO date'),
    queryValidator('dateTo').optional().isISO8601().withMessage('Date to must be valid ISO date'),
  ],
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const stats = await TransactionModel.getStats(req.user.userId, dateFrom, dateTo);

      res.json(stats);

    } catch (error) {
      console.error('❌ Failed to get transaction stats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch transaction statistics',
        code: 'TRANSACTION_STATS_FAILED'
      });
    }
  }
);

// Sync account data
router.post('/sync',
  authenticateToken,
  requireConsent,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const syncResult = await aaService.syncAccountData(req.user.userId);

      res.json({
        message: 'Account data synchronized successfully',
        result: syncResult
      });

    } catch (error) {
      console.error('❌ Failed to sync account data:', error);
      res.status(500).json({ 
        error: 'Failed to sync account data',
        code: 'ACCOUNT_SYNC_FAILED'
      });
    }
  }
);

// Revoke consent and disconnect account
router.delete('/connections/:connectionId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const { connectionId } = req.params;

      // Get connection details
      const connection = await AccountConnectionModel.findById(connectionId);
      if (!connection || connection.userId !== req.user.userId) {
        return res.status(404).json({
          error: 'Account connection not found',
          code: 'CONNECTION_NOT_FOUND'
        });
      }

      // Extract consent ID from encrypted tokens
      let consentId = '';
      try {
        const encryptedTokens = JSON.parse(connection.encryptedTokens || '{}');
        const tokens = await import('../utils/encryption').then(enc => enc.EncryptionService.decryptAATokens(encryptedTokens));
        consentId = (tokens as any).consentId;
      } catch (error) {
        console.warn('Failed to extract consent ID:', error);
      }

      // Revoke consent with AA
      if (consentId) {
        await aaService.revokeConsent(consentId, req.user.userId);
      }

      // Deactivate connection
      await AccountConnectionModel.deactivate(connectionId);

      res.json({
        message: 'Account connection revoked successfully'
      });

    } catch (error) {
      console.error('❌ Failed to revoke account connection:', error);
      res.status(500).json({ 
        error: 'Failed to revoke account connection',
        code: 'CONNECTION_REVOKE_FAILED'
      });
    }
  }
);

// Get user's active consents
router.get('/consents',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const consents = await aaService.getUserConsents(req.user.userId);

      res.json({
        consents
      });

    } catch (error) {
      console.error('❌ Failed to get user consents:', error);
      res.status(500).json({ 
        error: 'Failed to fetch user consents',
        code: 'CONSENTS_FETCH_FAILED'
      });
    }
  }
);

// AA service health check
router.get('/health',
  async (req: Request, res: Response) => {
    try {
      const isHealthy = await aaService.healthCheck();

      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        service: 'Account Aggregator',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ AA health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        service: 'Account Aggregator',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;