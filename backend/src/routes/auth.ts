import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateFirebaseToken, authenticateToken } from '../middleware/auth';
import { generateTokenPair, refreshAccessToken, revokeRefreshToken, revokeAllRefreshTokens } from '../utils/jwt';
import { query } from '../config/database';
import { setSession } from '../config/redis';

const router = express.Router();

// Login with Firebase ID token
router.post('/login', 
  [
    body('idToken').notEmpty().withMessage('Firebase ID token is required'),
  ],
  authenticateFirebaseToken,
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
          error: 'Authentication failed',
          code: 'AUTH_FAILED'
        });
      }

      // Generate JWT token pair
      const tokenPair = await generateTokenPair(
        req.user.userId, 
        req.user.email, 
        req.user.firebaseUid
      );

      // Update last login time
      await query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [req.user.userId]
      );

      // Log successful login
      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, details, ip_address, user_agent) 
         VALUES ($1, 'LOGIN', 'USER', $2, $3, $4)`,
        [
          req.user.userId,
          JSON.stringify({ method: 'firebase' }),
          req.ip,
          req.get('User-Agent')
        ]
      );

      res.json({
        message: 'Login successful',
        user: {
          id: req.user.userId,
          email: req.user.email,
          kycStatus: req.user.kycStatus,
          consentStatus: req.user.consentStatus,
        },
        tokens: tokenPair
      });

    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({ 
        error: 'Login failed',
        code: 'LOGIN_FAILED'
      });
    }
  }
);

// Refresh access token
router.post('/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { refreshToken } = req.body;

      // Refresh the access token
      const newTokenPair = await refreshAccessToken(refreshToken);

      res.json({
        message: 'Token refreshed successfully',
        tokens: newTokenPair
      });

    } catch (error) {
      console.error('❌ Token refresh error:', error);
      res.status(401).json({ 
        error: 'Token refresh failed',
        code: 'REFRESH_FAILED'
      });
    }
  }
);

// Logout (revoke refresh token)
router.post('/logout',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
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

      const { refreshToken } = req.body;

      // Revoke the refresh token
      await revokeRefreshToken(refreshToken);

      // Log logout
      if (req.user) {
        await query(
          `INSERT INTO audit_logs (user_id, action, resource_type, details, ip_address, user_agent) 
           VALUES ($1, 'LOGOUT', 'USER', $2, $3, $4)`,
          [
            req.user.userId,
            JSON.stringify({ method: 'single_device' }),
            req.ip,
            req.get('User-Agent')
          ]
        );
      }

      res.json({
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('❌ Logout error:', error);
      res.status(500).json({ 
        error: 'Logout failed',
        code: 'LOGOUT_FAILED'
      });
    }
  }
);

// Logout from all devices
router.post('/logout-all',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Revoke all refresh tokens for the user
      await revokeAllRefreshTokens(req.user.userId);

      // Log logout from all devices
      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, details, ip_address, user_agent) 
         VALUES ($1, 'LOGOUT', 'USER', $2, $3, $4)`,
        [
          req.user.userId,
          JSON.stringify({ method: 'all_devices' }),
          req.ip,
          req.get('User-Agent')
        ]
      );

      res.json({
        message: 'Logged out from all devices successfully'
      });

    } catch (error) {
      console.error('❌ Logout all error:', error);
      res.status(500).json({ 
        error: 'Logout from all devices failed',
        code: 'LOGOUT_ALL_FAILED'
      });
    }
  }
);

// Get current user profile
router.get('/profile',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Get detailed user information
      const userResult = await query(
        `SELECT id, email, phone, firebase_uid, created_at, updated_at, 
                kyc_status, consent_status, last_login_at, pan_number
         FROM users WHERE id = $1`,
        [req.user.userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      const user = userResult.rows[0];

      // Get account connections count
      const connectionsResult = await query(
        'SELECT COUNT(*) as connection_count FROM account_connections WHERE user_id = $1 AND connection_status = $2',
        [req.user.userId, 'active']
      );

      // Get latest credit score
      const scoreResult = await query(
        'SELECT score, score_date, confidence, trend FROM credit_scores WHERE user_id = $1 ORDER BY score_date DESC LIMIT 1',
        [req.user.userId]
      );

      res.json({
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          kycStatus: user.kyc_status,
          consentStatus: user.consent_status,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at,
          hasPanNumber: !!user.pan_number,
        },
        stats: {
          accountConnections: parseInt(connectionsResult.rows[0].connection_count),
          latestScore: scoreResult.rows.length > 0 ? {
            score: scoreResult.rows[0].score,
            date: scoreResult.rows[0].score_date,
            confidence: scoreResult.rows[0].confidence,
            trend: scoreResult.rows[0].trend,
          } : null,
        }
      });

    } catch (error) {
      console.error('❌ Profile fetch error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch profile',
        code: 'PROFILE_FETCH_FAILED'
      });
    }
  }
);

// Update user profile
router.put('/profile',
  [
    body('phone').optional().isMobilePhone('en-IN').withMessage('Invalid Indian phone number'),
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
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (phone !== undefined) {
        updates.push(`phone = $${paramCount++}`);
        values.push(phone);
      }

      if (updates.length === 0) {
        return res.status(400).json({ 
          error: 'No valid fields to update',
          code: 'NO_UPDATES'
        });
      }

      updates.push(`updated_at = NOW()`);
      values.push(req.user.userId);

      const updateQuery = `
        UPDATE users 
        SET ${updates.join(', ')} 
        WHERE id = $${paramCount}
        RETURNING id, email, phone, kyc_status, consent_status, updated_at
      `;

      const result = await query(updateQuery, values);

      // Log profile update
      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, details, ip_address, user_agent) 
         VALUES ($1, 'UPDATE', 'USER_PROFILE', $2, $3, $4)`,
        [
          req.user.userId,
          JSON.stringify({ updatedFields: Object.keys(req.body) }),
          req.ip,
          req.get('User-Agent')
        ]
      );

      res.json({
        message: 'Profile updated successfully',
        user: result.rows[0]
      });

    } catch (error) {
      console.error('❌ Profile update error:', error);
      res.status(500).json({ 
        error: 'Failed to update profile',
        code: 'PROFILE_UPDATE_FAILED'
      });
    }
  }
);

// Verify token endpoint (for client-side token validation)
router.get('/verify',
  authenticateToken,
  (req: Request, res: Response) => {
    res.json({
      valid: true,
      user: req.user
    });
  }
);

export default router;