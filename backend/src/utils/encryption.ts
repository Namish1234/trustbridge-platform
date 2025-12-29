import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dev_32_char_encryption_key_here';
const ALGORITHM = process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm';

// Ensure encryption key is 32 bytes for AES-256
const NORMALIZED_KEY = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

export class EncryptionService {
  // Encrypt sensitive data
  static encrypt(text: string): EncryptedData {
    try {
      if (!text) {
        throw new Error('Text to encrypt cannot be empty');
      }

      // Generate a random initialization vector
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipher('aes-256-gcm', NORMALIZED_KEY);
      
      // Encrypt the text
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get the authentication tag
      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  // Decrypt sensitive data
  static decrypt(encryptedData: EncryptedData): string {
    try {
      if (!encryptedData.encrypted || !encryptedData.iv || !encryptedData.authTag) {
        throw new Error('Invalid encrypted data format');
      }

      // Convert hex strings back to buffers
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      
      // Create decipher
      const decipher = crypto.createDecipher('aes-256-gcm', NORMALIZED_KEY);
      decipher.setAuthTag(authTag);
      
      // Decrypt the text
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw new Error('Data decryption failed');
    }
  }

  // Encrypt PAN number with additional validation
  static encryptPAN(panNumber: string): EncryptedData {
    try {
      // Validate PAN format (10 characters: 5 letters, 4 digits, 1 letter)
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(panNumber)) {
        throw new Error('Invalid PAN number format');
      }

      return this.encrypt(panNumber);
    } catch (error) {
      console.error('❌ PAN encryption failed:', error);
      throw new Error('PAN encryption failed');
    }
  }

  // Decrypt PAN number with validation
  static decryptPAN(encryptedPAN: EncryptedData): string {
    try {
      const decryptedPAN = this.decrypt(encryptedPAN);
      
      // Validate decrypted PAN format
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!decryptedPAN || !panRegex.test(decryptedPAN)) {
        throw new Error('Decrypted PAN has invalid format');
      }

      return decryptedPAN;
    } catch (error) {
      console.error('❌ PAN decryption failed:', error);
      throw new Error('PAN decryption failed');
    }
  }

  // Encrypt account number
  static encryptAccountNumber(accountNumber: string): EncryptedData {
    try {
      if (!accountNumber || accountNumber.length < 8) {
        throw new Error('Account number must be at least 8 characters');
      }

      return this.encrypt(accountNumber);
    } catch (error) {
      console.error('❌ Account number encryption failed:', error);
      throw new Error('Account number encryption failed');
    }
  }

  // Decrypt account number
  static decryptAccountNumber(encryptedAccountNumber: EncryptedData): string {
    try {
      const decryptedAccountNumber = this.decrypt(encryptedAccountNumber);
      
      if (!decryptedAccountNumber || decryptedAccountNumber.length < 8) {
        throw new Error('Decrypted account number is invalid');
      }

      return decryptedAccountNumber;
    } catch (error) {
      console.error('❌ Account number decryption failed:', error);
      throw new Error('Account number decryption failed');
    }
  }

  // Encrypt AA tokens (JSON object)
  static encryptAATokens(tokens: object): EncryptedData {
    try {
      const tokensString = JSON.stringify(tokens);
      return this.encrypt(tokensString);
    } catch (error) {
      console.error('❌ AA tokens encryption failed:', error);
      throw new Error('AA tokens encryption failed');
    }
  }

  // Decrypt AA tokens (returns JSON object)
  static decryptAATokens(encryptedTokens: EncryptedData): object {
    try {
      const decryptedString = this.decrypt(encryptedTokens);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('❌ AA tokens decryption failed:', error);
      throw new Error('AA tokens decryption failed');
    }
  }

  // Hash sensitive data (one-way, for comparison purposes)
  static hash(data: string, salt?: string): string {
    try {
      const actualSalt = salt || crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512');
      return `${actualSalt}:${hash.toString('hex')}`;
    } catch (error) {
      console.error('❌ Hashing failed:', error);
      throw new Error('Data hashing failed');
    }
  }

  // Verify hashed data
  static verifyHash(data: string, hashedData: string): boolean {
    try {
      const [salt, originalHash] = hashedData.split(':');
      const hash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512');
      return originalHash === hash.toString('hex');
    } catch (error) {
      console.error('❌ Hash verification failed:', error);
      return false;
    }
  }

  // Generate secure random token
  static generateSecureToken(length: number = 32): string {
    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      console.error('❌ Token generation failed:', error);
      throw new Error('Secure token generation failed');
    }
  }

  // Anonymize data (replace with asterisks, keeping first and last characters)
  static anonymize(data: string, visibleChars: number = 2): string {
    try {
      if (!data || data.length <= visibleChars * 2) {
        return '*'.repeat(data.length);
      }

      const start = data.substring(0, visibleChars);
      const end = data.substring(data.length - visibleChars);
      const middle = '*'.repeat(data.length - visibleChars * 2);

      return `${start}${middle}${end}`;
    } catch (error) {
      console.error('❌ Data anonymization failed:', error);
      return '***';
    }
  }

  // Anonymize PAN number (show first 4 and last 1 characters)
  static anonymizePAN(panNumber: string): string {
    try {
      if (!panNumber || panNumber.length !== 10) {
        return '**********';
      }

      return `${panNumber.substring(0, 4)}*****${panNumber.substring(9)}`;
    } catch (error) {
      console.error('❌ PAN anonymization failed:', error);
      return '**********';
    }
  }

  // Anonymize account number (show first 4 and last 4 characters)
  static anonymizeAccountNumber(accountNumber: string): string {
    try {
      if (!accountNumber || accountNumber.length < 8) {
        return '*'.repeat(accountNumber.length);
      }

      const start = accountNumber.substring(0, 4);
      const end = accountNumber.substring(accountNumber.length - 4);
      const middle = '*'.repeat(accountNumber.length - 8);

      return `${start}${middle}${end}`;
    } catch (error) {
      console.error('❌ Account number anonymization failed:', error);
      return '***';
    }
  }

  // Validate encryption key strength
  static validateEncryptionKey(): boolean {
    try {
      if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
        console.warn('⚠️  Encryption key is too short. Use at least 32 characters.');
        return false;
      }

      if (ENCRYPTION_KEY === 'dev_32_char_encryption_key_here') {
        console.warn('⚠️  Using default encryption key. Change this in production!');
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Encryption key validation failed:', error);
      return false;
    }
  }

  // Secure data wipe (overwrite memory)
  static secureWipe(data: string): void {
    try {
      // In JavaScript, we can't directly overwrite memory, but we can help GC
      // by creating a new string with random data of the same length
      const randomData = crypto.randomBytes(data.length).toString('hex');
      // The original data reference will be garbage collected
      data = randomData;
    } catch (error) {
      console.error('❌ Secure wipe failed:', error);
    }
  }
}

// Initialize encryption service and validate key
if (process.env.NODE_ENV === 'production') {
  if (!EncryptionService.validateEncryptionKey()) {
    console.error('❌ Invalid encryption configuration in production!');
    process.exit(1);
  }
} else {
  EncryptionService.validateEncryptionKey();
}

export default EncryptionService;