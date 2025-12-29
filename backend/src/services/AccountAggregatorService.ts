import axios from 'axios';
import crypto from 'crypto';
import { query } from '../config/database';
import { EncryptionService } from '../utils/encryption';
import { AccountConnectionModel } from '../models/AccountConnection';
import { TransactionModel } from '../models/Transaction';
import dotenv from 'dotenv';

dotenv.config();

export interface AAConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface ConsentRequest {
  userId: string;
  institutionId: string;
  accountTypes: string[];
  dataRange: {
    from: Date;
    to: Date;
  };
  purpose: string;
}

export interface ConsentResponse {
  consentId: string;
  consentHandle: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  expiryDate: Date;
  redirectUrl: string;
}

export interface AccountInfo {
  accountId: string;
  accountType: 'savings' | 'current' | 'investment' | 'credit';
  accountNumber: string;
  institutionId: string;
  institutionName: string;
  balance?: number;
  currency: string;
}

export interface TransactionData {
  transactionId: string;
  accountId: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  transactionDate: Date;
  balance?: number;
  category?: string;
  merchantInfo?: string;
}

export interface DataFetchRequest {
  consentId: string;
  accountIds: string[];
  dateRange: {
    from: Date;
    to: Date;
  };
}

export interface DataFetchResponse {
  accounts: AccountInfo[];
  transactions: TransactionData[];
  fetchedAt: Date;
}

export class AccountAggregatorService {
  private client: any;
  private config: AAConfig;

  constructor() {
    this.config = {
      baseUrl: process.env.AA_BASE_URL || 'https://api-sandbox.sahamati.org.in',
      clientId: process.env.AA_CLIENT_ID || 'dev_aa_client_id',
      clientSecret: process.env.AA_CLIENT_SECRET || 'dev_aa_client_secret',
      redirectUri: process.env.AA_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/aa/callback',
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        const timestamp = new Date().toISOString();
        const signature = this.generateSignature(config.method?.toUpperCase() || 'GET', config.url || '', timestamp);
        
        config.headers = {
          ...config.headers,
          'X-Client-Id': this.config.clientId,
          'X-Timestamp': timestamp,
          'X-Signature': signature,
        };

        return config;
      },
      (error) => {
        console.error('❌ AA API request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ AA API ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
        return response;
      },
      (error) => {
        console.error('❌ AA API response error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Generate signature for AA API authentication
  private generateSignature(method: string, url: string, timestamp: string): string {
    try {
      const payload = `${method}|${url}|${timestamp}`;
      const signature = crypto
        .createHmac('sha256', this.config.clientSecret)
        .update(payload)
        .digest('base64');
      
      return signature;
    } catch (error) {
      console.error('❌ Failed to generate AA signature:', error);
      throw new Error('Signature generation failed');
    }
  }

  // Step 1: Create consent request
  async createConsentRequest(consentData: ConsentRequest): Promise<ConsentResponse> {
    try {
      const payload = {
        ver: '1.0',
        timestamp: new Date().toISOString(),
        txnid: crypto.randomUUID(),
        ConsentDetail: {
          consentStart: new Date().toISOString(),
          consentExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
          consentMode: 'STORE',
          fetchType: 'PERIODIC',
          consentTypes: ['TRANSACTIONS', 'PROFILE', 'SUMMARY'],
          fiTypes: consentData.accountTypes,
          DataConsumer: {
            id: this.config.clientId,
            type: 'FIU'
          },
          Customer: {
            id: consentData.userId
          },
          Purpose: {
            code: 'CREDIT_SCORING',
            refUri: 'https://api.rebit.org.in/aa/purpose/CREDIT_SCORING.xml',
            text: consentData.purpose,
            Category: {
              type: 'PERSONAL_FINANCE'
            }
          },
          FIDataRange: {
            from: consentData.dataRange.from.toISOString(),
            to: consentData.dataRange.to.toISOString()
          },
          DataLife: {
            unit: 'YEAR',
            value: 1
          },
          Frequency: {
            unit: 'MONTH',
            value: 1
          }
        }
      };

      const response: any = await this.client.post('/Consent', payload);
      
      const consentResponse: ConsentResponse = {
        consentId: response.data.ConsentHandle,
        consentHandle: response.data.ConsentHandle,
        status: 'PENDING',
        expiryDate: new Date(payload.ConsentDetail.consentExpiry),
        redirectUrl: `${this.config.baseUrl}/consent/webview/${response.data.ConsentHandle}`
      };

      // Log consent creation
      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, details) 
         VALUES ($1, 'CONSENT_CREATED', 'AA_CONSENT', $2)`,
        [
          consentData.userId,
          JSON.stringify({
            consentId: consentResponse.consentId,
            institutionId: consentData.institutionId,
            accountTypes: consentData.accountTypes
          })
        ]
      );

      console.log('✅ AA consent request created:', consentResponse.consentId);
      return consentResponse;

    } catch (error) {
      console.error('❌ Failed to create AA consent request:', error);
      throw new Error('Consent request creation failed');
    }
  }

  // Step 2: Check consent status
  async getConsentStatus(consentId: string): Promise<{
    status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
    accounts?: AccountInfo[];
  }> {
    try {
      const response: any = await this.client.get(`/Consent/${consentId}`);
      
      const status = response.data.ConsentStatus?.status || 'PENDING';
      const accounts = response.data.ConsentStatus?.accounts?.map((acc: any) => ({
        accountId: acc.accRefNumber,
        accountType: acc.accType.toLowerCase(),
        accountNumber: acc.maskedAccNumber,
        institutionId: acc.fipId,
        institutionName: acc.fipName,
        currency: acc.currency || 'INR'
      })) || [];

      console.log(`✅ AA consent status checked: ${consentId} - ${status}`);
      return { status, accounts };

    } catch (error) {
      console.error('❌ Failed to get AA consent status:', error);
      throw new Error('Consent status check failed');
    }
  }

  // Step 3: Fetch financial data
  async fetchFinancialData(fetchRequest: DataFetchRequest): Promise<DataFetchResponse> {
    try {
      const payload = {
        ver: '1.0',
        timestamp: new Date().toISOString(),
        txnid: crypto.randomUUID(),
        FIDataRange: {
          from: fetchRequest.dateRange.from.toISOString(),
          to: fetchRequest.dateRange.to.toISOString()
        },
        Consent: {
          id: fetchRequest.consentId
        },
        KeyMaterial: {
          cryptoAlg: 'ECDH',
          curve: 'Curve25519',
          params: '',
          DHPublicKey: {
            expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            Parameters: '',
            KeyValue: crypto.randomBytes(32).toString('base64')
          }
        }
      };

      const response: any = await this.client.post('/FI/fetch', payload);
      
      // Process the encrypted response (in real implementation, you'd decrypt the data)
      const accounts: AccountInfo[] = [];
      const transactions: TransactionData[] = [];

      // Mock data processing for development
      if (process.env.NODE_ENV === 'development') {
        // Generate mock data for development
        accounts.push({
          accountId: 'ACC001',
          accountType: 'savings',
          accountNumber: '****1234',
          institutionId: 'HDFC0000001',
          institutionName: 'HDFC Bank',
          balance: 50000,
          currency: 'INR'
        });

        // Generate mock transactions
        for (let i = 0; i < 10; i++) {
          transactions.push({
            transactionId: `TXN${String(i).padStart(3, '0')}`,
            accountId: 'ACC001',
            amount: Math.floor(Math.random() * 10000) + 100,
            type: Math.random() > 0.5 ? 'credit' : 'debit',
            description: `Transaction ${i + 1}`,
            transactionDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            category: ['food', 'transport', 'shopping', 'salary', 'investment'][Math.floor(Math.random() * 5)]
          });
        }
      }

      const fetchResponse: DataFetchResponse = {
        accounts,
        transactions,
        fetchedAt: new Date()
      };

      console.log(`✅ AA financial data fetched: ${accounts.length} accounts, ${transactions.length} transactions`);
      return fetchResponse;

    } catch (error) {
      console.error('❌ Failed to fetch AA financial data:', error);
      throw new Error('Financial data fetch failed');
    }
  }

  // Step 4: Store account connections
  async storeAccountConnections(userId: string, accounts: AccountInfo[], consentId: string): Promise<string[]> {
    try {
      const connectionIds: string[] = [];

      for (const account of accounts) {
        // Encrypt sensitive data
        const encryptedAccountNumber = EncryptionService.encryptAccountNumber(account.accountNumber);
        const encryptedTokens = EncryptionService.encryptAATokens({
          consentId,
          accountId: account.accountId,
          fetchedAt: new Date().toISOString()
        });

        // Create account connection
        const connection = await AccountConnectionModel.create({
          userId,
          institutionId: account.institutionId,
          institutionName: account.institutionName,
          accountType: account.accountType,
          accountNumber: JSON.stringify(encryptedAccountNumber),
          consentExpiryAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          encryptedTokens: JSON.stringify(encryptedTokens)
        });

        connectionIds.push(connection.id);
      }

      // Log account connections
      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, details) 
         VALUES ($1, 'ACCOUNTS_CONNECTED', 'AA_ACCOUNTS', $2)`,
        [
          userId,
          JSON.stringify({
            consentId,
            accountCount: accounts.length,
            connectionIds
          })
        ]
      );

      console.log(`✅ Stored ${accounts.length} account connections for user ${userId}`);
      return connectionIds;

    } catch (error) {
      console.error('❌ Failed to store account connections:', error);
      throw new Error('Account connection storage failed');
    }
  }

  // Step 5: Store transactions
  async storeTransactions(accountConnections: string[], transactions: TransactionData[]): Promise<number> {
    try {
      const transactionData = transactions.map(txn => {
        // Find the corresponding account connection
        const accountConnection = accountConnections[0]; // Simplified for now
        
        return {
          accountId: accountConnection,
          amount: txn.amount,
          type: txn.type,
          category: txn.category,
          description: txn.description,
          transactionDate: txn.transactionDate,
          balance: txn.balance,
          merchantInfo: txn.merchantInfo,
          isRecurring: false // Will be determined by analysis
        };
      });

      const storedTransactions = await TransactionModel.createBulk(transactionData);

      console.log(`✅ Stored ${storedTransactions.length} transactions`);
      return storedTransactions.length;

    } catch (error) {
      console.error('❌ Failed to store transactions:', error);
      throw new Error('Transaction storage failed');
    }
  }

  // Revoke consent
  async revokeConsent(consentId: string, userId: string): Promise<boolean> {
    try {
      const payload = {
        ver: '1.0',
        timestamp: new Date().toISOString(),
        txnid: crypto.randomUUID(),
        ConsentHandle: consentId
      };

      await this.client.delete(`/Consent/${consentId}`, { data: payload });

      // Update account connections status
      await query(
        `UPDATE account_connections 
         SET connection_status = 'inactive', updated_at = NOW() 
         WHERE user_id = $1 AND encrypted_tokens LIKE $2`,
        [userId, `%${consentId}%`]
      );

      // Log consent revocation
      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, details) 
         VALUES ($1, 'CONSENT_REVOKED', 'AA_CONSENT', $2)`,
        [userId, JSON.stringify({ consentId })]
      );

      console.log(`✅ AA consent revoked: ${consentId}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to revoke AA consent:', error);
      throw new Error('Consent revocation failed');
    }
  }

  // Get user's active consents
  async getUserConsents(userId: string): Promise<{
    consentId: string;
    institutionName: string;
    accountType: string;
    status: string;
    expiryDate: Date;
  }[]> {
    try {
      const result = await query(
        `SELECT id, institution_name, account_type, connection_status, consent_expiry_at, encrypted_tokens
         FROM account_connections 
         WHERE user_id = $1 AND connection_status = 'active'
         ORDER BY created_at DESC`,
        [userId]
      );

      const consents = result.rows.map(row => {
        let consentId = 'unknown';
        try {
          const tokens = JSON.parse(row.encrypted_tokens);
          const decryptedTokens = EncryptionService.decryptAATokens(tokens);
          consentId = (decryptedTokens as any).consentId || 'unknown';
        } catch (error) {
          console.warn('Failed to decrypt consent tokens:', error);
        }

        return {
          consentId,
          institutionName: row.institution_name,
          accountType: row.account_type,
          status: row.connection_status,
          expiryDate: row.consent_expiry_at
        };
      });

      return consents;

    } catch (error) {
      console.error('❌ Failed to get user consents:', error);
      throw new Error('User consents lookup failed');
    }
  }

  // Sync data for existing connections
  async syncAccountData(userId: string): Promise<{
    accountsUpdated: number;
    transactionsAdded: number;
  }> {
    try {
      const connections = await AccountConnectionModel.findByUserId(userId, 'active');
      let accountsUpdated = 0;
      let transactionsAdded = 0;

      for (const connection of connections) {
        try {
          // Decrypt tokens to get consent info
          const encryptedTokens = JSON.parse(connection.encryptedTokens || '{}');
          const tokens = EncryptionService.decryptAATokens(encryptedTokens);
          const consentId = (tokens as any).consentId;

          if (consentId) {
            // Fetch latest data
            const dataResponse = await this.fetchFinancialData({
              consentId,
              accountIds: [connection.id],
              dateRange: {
                from: connection.lastSyncAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                to: new Date()
              }
            });

            // Store new transactions
            if (dataResponse.transactions.length > 0) {
              const stored = await this.storeTransactions([connection.id], dataResponse.transactions);
              transactionsAdded += stored;
            }

            // Update sync time
            await AccountConnectionModel.updateSyncTime(connection.id);
            accountsUpdated++;
          }
        } catch (error) {
          console.warn(`Failed to sync account ${connection.id}:`, error);
        }
      }

      console.log(`✅ Data sync completed: ${accountsUpdated} accounts, ${transactionsAdded} new transactions`);
      return { accountsUpdated, transactionsAdded };

    } catch (error) {
      console.error('❌ Failed to sync account data:', error);
      throw new Error('Account data sync failed');
    }
  }

  // Health check for AA service
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('❌ AA service health check failed:', error);
      return false;
    }
  }
}

export default AccountAggregatorService;