import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Firebase Admin SDK configuration
const firebaseConfig = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
  token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: `https://www.googleapis.com/oauth2/v1/certs`,
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
};

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App | undefined;

try {
  if (!admin.apps.length) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig as admin.ServiceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  } else {
    firebaseApp = admin.app();
  }
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization failed:', error);
  // In development, we'll create a mock app
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Running in development mode - Firebase features may be limited');
  }
}

// Export Firebase services
export const auth = firebaseApp ? admin.auth() : null;
export const firestore = firebaseApp ? admin.firestore() : null;
export default firebaseApp;

// Helper function to verify Firebase ID token
export async function verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  try {
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid token');
  }
}

// Helper function to create custom token
export async function createCustomToken(uid: string, additionalClaims?: object): Promise<string> {
  try {
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }
    const customToken = await auth.createCustomToken(uid, additionalClaims);
    return customToken;
  } catch (error) {
    console.error('Custom token creation failed:', error);
    throw new Error('Token creation failed');
  }
}