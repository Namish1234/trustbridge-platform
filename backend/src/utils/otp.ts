import crypto from 'crypto';
import { setCache, getCache, deleteCache } from '../config/redis';
import { query } from '../config/database';

export interface OTPData {
  otp: string;
  userId: string;
  purpose: 'account_connection' | 'kyc_verification' | 'transaction_auth';
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
}

// Generate OTP
export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  
  return otp;
}

// Store OTP in Redis with expiration
export async function storeOTP(
  userId: string, 
  purpose: OTPData['purpose'], 
  ttl: number = 300 // 5 minutes
): Promise<string> {
  try {
    const otp = generateOTP();
    const otpKey = `otp:${userId}:${purpose}`;
    
    const otpData: OTPData = {
      otp,
      userId,
      purpose,
      attempts: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + ttl * 1000),
    };

    // Store in Redis
    await setCache(otpKey, otpData, ttl);

    // Log OTP generation (without storing the actual OTP)
    await query(
      `INSERT INTO audit_logs (user_id, action, resource_type, details, ip_address) 
       VALUES ($1, 'OTP_GENERATED', 'OTP', $2, $3)`,
      [
        userId,
        JSON.stringify({ purpose, expiresAt: otpData.expiresAt }),
        '127.0.0.1' // Will be updated with actual IP in route handler
      ]
    );

    console.log(`✅ OTP generated for user ${userId}, purpose: ${purpose}`);
    return otp;

  } catch (error) {
    console.error('❌ Failed to store OTP:', error);
    throw new Error('OTP generation failed');
  }
}

// Verify OTP
export async function verifyOTP(
  userId: string, 
  purpose: OTPData['purpose'], 
  providedOTP: string
): Promise<{ valid: boolean; attemptsLeft: number; error?: string }> {
  try {
    const otpKey = `otp:${userId}:${purpose}`;
    const otpData: OTPData | null = await getCache(otpKey);

    if (!otpData) {
      return { 
        valid: false, 
        attemptsLeft: 0, 
        error: 'OTP not found or expired' 
      };
    }

    // Check if OTP is expired
    if (new Date() > new Date(otpData.expiresAt)) {
      await deleteCache(otpKey);
      return { 
        valid: false, 
        attemptsLeft: 0, 
        error: 'OTP expired' 
      };
    }

    // Check attempts limit (max 3 attempts)
    if (otpData.attempts >= 3) {
      await deleteCache(otpKey);
      
      // Log failed verification due to max attempts
      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, details) 
         VALUES ($1, 'OTP_MAX_ATTEMPTS', 'OTP', $2)`,
        [userId, JSON.stringify({ purpose, attempts: otpData.attempts })]
      );

      return { 
        valid: false, 
        attemptsLeft: 0, 
        error: 'Maximum attempts exceeded' 
      };
    }

    // Verify OTP
    if (otpData.otp === providedOTP) {
      // OTP is valid, remove from cache
      await deleteCache(otpKey);

      // Log successful verification
      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, details) 
         VALUES ($1, 'OTP_VERIFIED', 'OTP', $2)`,
        [userId, JSON.stringify({ purpose, attempts: otpData.attempts + 1 })]
      );

      console.log(`✅ OTP verified for user ${userId}, purpose: ${purpose}`);
      return { valid: true, attemptsLeft: 0 };

    } else {
      // Invalid OTP, increment attempts
      otpData.attempts += 1;
      const remainingTTL = Math.floor((new Date(otpData.expiresAt).getTime() - Date.now()) / 1000);
      
      if (remainingTTL > 0) {
        await setCache(otpKey, otpData, remainingTTL);
      }

      // Log failed verification
      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, details) 
         VALUES ($1, 'OTP_FAILED', 'OTP', $2)`,
        [userId, JSON.stringify({ purpose, attempts: otpData.attempts })]
      );

      const attemptsLeft = 3 - otpData.attempts;
      return { 
        valid: false, 
        attemptsLeft, 
        error: `Invalid OTP. ${attemptsLeft} attempts remaining` 
      };
    }

  } catch (error) {
    console.error('❌ Failed to verify OTP:', error);
    return { 
      valid: false, 
      attemptsLeft: 0, 
      error: 'OTP verification failed' 
    };
  }
}

// Resend OTP (with rate limiting)
export async function resendOTP(
  userId: string, 
  purpose: OTPData['purpose']
): Promise<{ success: boolean; otp?: string; error?: string; cooldownSeconds?: number }> {
  try {
    const resendKey = `otp_resend:${userId}:${purpose}`;
    const lastResend = await getCache(resendKey);

    // Check cooldown period (60 seconds between resends)
    if (lastResend) {
      const cooldownSeconds = 60 - Math.floor((Date.now() - new Date(lastResend.timestamp).getTime()) / 1000);
      if (cooldownSeconds > 0) {
        return { 
          success: false, 
          error: 'Please wait before requesting another OTP',
          cooldownSeconds 
        };
      }
    }

    // Generate new OTP
    const otp = await storeOTP(userId, purpose);

    // Set resend cooldown
    await setCache(resendKey, { timestamp: new Date().toISOString() }, 60);

    // Log OTP resend
    await query(
      `INSERT INTO audit_logs (user_id, action, resource_type, details) 
       VALUES ($1, 'OTP_RESENT', 'OTP', $2)`,
      [userId, JSON.stringify({ purpose })]
    );

    console.log(`✅ OTP resent for user ${userId}, purpose: ${purpose}`);
    return { success: true, otp };

  } catch (error) {
    console.error('❌ Failed to resend OTP:', error);
    return { 
      success: false, 
      error: 'Failed to resend OTP' 
    };
  }
}

// Clean up expired OTPs (should be run periodically)
export async function cleanupExpiredOTPs(): Promise<void> {
  try {
    // This would typically be handled by Redis TTL, but we can add additional cleanup logic here
    console.log('🧹 OTP cleanup completed (handled by Redis TTL)');
  } catch (error) {
    console.error('❌ Failed to cleanup expired OTPs:', error);
  }
}

// Mock SMS/Email sending functions (replace with actual service integration)
export async function sendOTPSMS(phone: string, otp: string, purpose: string): Promise<boolean> {
  try {
    // In production, integrate with SMS service like Twilio, AWS SNS, etc.
    console.log(`📱 [MOCK SMS] Sending OTP ${otp} to ${phone} for ${purpose}`);
    
    // Simulate SMS sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return true;
  } catch (error) {
    console.error('❌ Failed to send SMS:', error);
    return false;
  }
}

export async function sendOTPEmail(email: string, otp: string, purpose: string): Promise<boolean> {
  try {
    // In production, integrate with email service like SendGrid, AWS SES, etc.
    console.log(`📧 [MOCK EMAIL] Sending OTP ${otp} to ${email} for ${purpose}`);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return false;
  }
}