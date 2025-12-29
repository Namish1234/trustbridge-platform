import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../config/database';
import { setSession, deleteSession } from '../config/redis';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_key_change_in_production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  firebaseUid?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Generate access token
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'trustbridge-api',
    audience: 'trustbridge-app',
  } as jwt.SignOptions);
}

// Generate refresh token
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'trustbridge-api',
    audience: 'trustbridge-app',
  } as jwt.SignOptions);
}

// Generate token pair with refresh token rotation
export async function generateTokenPair(userId: string, email: string, firebaseUid?: string): Promise<TokenPair> {
  const payload: TokenPayload = {
    userId,
    email,
    firebaseUid,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Store refresh token in database with hash
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  try {
    // Invalidate old refresh tokens for this user
    await query(
      'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
      [userId]
    );

    // Store new refresh token
    await query(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at, is_active) 
       VALUES ($1, $2, $3, true)`,
      [userId, refreshTokenHash, expiresAt]
    );

    // Store session in Redis for quick access
    await setSession(userId, {
      userId,
      email,
      firebaseUid,
      lastActivity: new Date().toISOString(),
    }, 15 * 60); // 15 minutes

    console.log('✅ Token pair generated for user:', userId);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  } catch (error) {
    console.error('❌ Failed to store refresh token:', error);
    throw new Error('Token generation failed');
  }
}

// Verify access token
export function verifyAccessToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'trustbridge-api',
      audience: 'trustbridge-app',
    }) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error('❌ Access token verification failed:', error);
    throw new Error('Invalid access token');
  }
}

// Verify refresh token
export function verifyRefreshToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'trustbridge-api',
      audience: 'trustbridge-app',
    }) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error('❌ Refresh token verification failed:', error);
    throw new Error('Invalid refresh token');
  }
}

// Refresh access token using refresh token
export async function refreshAccessToken(refreshToken: string): Promise<TokenPair> {
  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Check if refresh token exists in database
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const result = await query(
      `SELECT user_id, expires_at FROM user_sessions 
       WHERE refresh_token_hash = $1 AND is_active = true`,
      [refreshTokenHash]
    );

    if (result.rows.length === 0) {
      throw new Error('Refresh token not found or inactive');
    }

    const session = result.rows[0];
    
    // Check if token is expired
    if (new Date() > new Date(session.expires_at)) {
      // Clean up expired token
      await query(
        'UPDATE user_sessions SET is_active = false WHERE refresh_token_hash = $1',
        [refreshTokenHash]
      );
      throw new Error('Refresh token expired');
    }

    // Generate new token pair (refresh token rotation)
    const newTokenPair = await generateTokenPair(decoded.userId, decoded.email, decoded.firebaseUid);

    // Invalidate old refresh token
    await query(
      'UPDATE user_sessions SET is_active = false WHERE refresh_token_hash = $1',
      [refreshTokenHash]
    );

    console.log('✅ Access token refreshed for user:', decoded.userId);
    return newTokenPair;

  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    throw new Error('Token refresh failed');
  }
}

// Revoke refresh token (logout)
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  try {
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    // Get user ID before revoking
    const result = await query(
      'SELECT user_id FROM user_sessions WHERE refresh_token_hash = $1',
      [refreshTokenHash]
    );

    // Invalidate refresh token
    await query(
      'UPDATE user_sessions SET is_active = false WHERE refresh_token_hash = $1',
      [refreshTokenHash]
    );

    // Remove session from Redis
    if (result.rows.length > 0) {
      await deleteSession(result.rows[0].user_id);
    }

    console.log('✅ Refresh token revoked');
  } catch (error) {
    console.error('❌ Failed to revoke refresh token:', error);
    throw new Error('Token revocation failed');
  }
}

// Revoke all refresh tokens for a user (logout from all devices)
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  try {
    await query(
      'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
      [userId]
    );

    // Remove session from Redis
    await deleteSession(userId);

    console.log('✅ All refresh tokens revoked for user:', userId);
  } catch (error) {
    console.error('❌ Failed to revoke all refresh tokens:', error);
    throw new Error('Token revocation failed');
  }
}

// Clean up expired tokens (should be run periodically)
export async function cleanupExpiredTokens(): Promise<void> {
  try {
    const result = await query(
      'DELETE FROM user_sessions WHERE expires_at < NOW() OR is_active = false'
    );
    console.log(`✅ Cleaned up ${result.rowCount} expired/inactive tokens`);
  } catch (error) {
    console.error('❌ Failed to cleanup expired tokens:', error);
  }
}