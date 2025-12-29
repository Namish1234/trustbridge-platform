import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { verifyIdToken } from '../config/firebase';
import { getSession } from '../config/redis';
import { query } from '../config/database';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        firebaseUid?: string;
        kycStatus?: string;
        consentStatus?: string;
      };
    }
  }
}

// Middleware to authenticate JWT tokens
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
      return;
    }

    // Verify JWT token
    const decoded: TokenPayload = verifyAccessToken(token);

    // Get user session from Redis for additional validation
    const session = await getSession(decoded.userId);
    if (!session) {
      res.status(401).json({ 
        error: 'Session expired',
        code: 'SESSION_EXPIRED'
      });
      return;
    }

    // Get user details from database
    const userResult = await query(
      'SELECT id, email, firebase_uid, kyc_status, consent_status, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (!user.is_active) {
      res.status(401).json({ 
        error: 'Account deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
      return;
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      email: user.email,
      firebaseUid: user.firebase_uid,
      kycStatus: user.kyc_status,
      consentStatus: user.consent_status,
    };

    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    res.status(401).json({ 
      error: 'Invalid token',
      code: 'TOKEN_INVALID'
    });
  }
}

// Middleware to authenticate Firebase ID tokens
export async function authenticateFirebaseToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const idToken = authHeader && authHeader.split(' ')[1]; // Bearer ID_TOKEN

    if (!idToken) {
      res.status(401).json({ 
        error: 'Firebase ID token required',
        code: 'FIREBASE_TOKEN_MISSING'
      });
      return;
    }

    // Verify Firebase ID token
    const decodedToken = await verifyIdToken(idToken);

    // Check if user exists in our database
    const userResult = await query(
      'SELECT id, email, firebase_uid, kyc_status, consent_status, is_active FROM users WHERE firebase_uid = $1',
      [decodedToken.uid]
    );

    if (userResult.rows.length === 0) {
      // User doesn't exist, create new user
      const newUserResult = await query(
        `INSERT INTO users (email, firebase_uid, kyc_status, consent_status) 
         VALUES ($1, $2, 'pending', 'active') 
         RETURNING id, email, firebase_uid, kyc_status, consent_status`,
        [decodedToken.email, decodedToken.uid]
      );

      const newUser = newUserResult.rows[0];
      req.user = {
        userId: newUser.id,
        email: newUser.email,
        firebaseUid: newUser.firebase_uid,
        kycStatus: newUser.kyc_status,
        consentStatus: newUser.consent_status,
      };

      console.log('✅ New user created:', newUser.id);
    } else {
      const user = userResult.rows[0];

      // Check if user is active
      if (!user.is_active) {
        res.status(401).json({ 
          error: 'Account deactivated',
          code: 'ACCOUNT_DEACTIVATED'
        });
        return;
      }

      req.user = {
        userId: user.id,
        email: user.email,
        firebaseUid: user.firebase_uid,
        kycStatus: user.kyc_status,
        consentStatus: user.consent_status,
      };
    }

    next();
  } catch (error) {
    console.error('❌ Firebase authentication error:', error);
    res.status(401).json({ 
      error: 'Invalid Firebase token',
      code: 'FIREBASE_TOKEN_INVALID'
    });
  }
}

// Middleware to check KYC status
export function requireKYC(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
    return;
  }

  if (req.user.kycStatus !== 'verified') {
    res.status(403).json({ 
      error: 'KYC verification required',
      code: 'KYC_REQUIRED',
      kycStatus: req.user.kycStatus
    });
    return;
  }

  next();
}

// Middleware to check consent status
export function requireConsent(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
    return;
  }

  if (req.user.consentStatus !== 'active') {
    res.status(403).json({ 
      error: 'Active consent required',
      code: 'CONSENT_REQUIRED',
      consentStatus: req.user.consentStatus
    });
    return;
  }

  next();
}

// Optional authentication middleware (doesn't fail if no token)
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded: TokenPayload = verifyAccessToken(token);
      const session = await getSession(decoded.userId);
      
      if (session) {
        const userResult = await query(
          'SELECT id, email, firebase_uid, kyc_status, consent_status, is_active FROM users WHERE id = $1',
          [decoded.userId]
        );

        if (userResult.rows.length > 0 && userResult.rows[0].is_active) {
          const user = userResult.rows[0];
          req.user = {
            userId: user.id,
            email: user.email,
            firebaseUid: user.firebase_uid,
            kycStatus: user.kyc_status,
            consentStatus: user.consent_status,
          };
        }
      }
    }

    next();
  } catch (error) {
    // Silently continue without authentication
    next();
  }
}