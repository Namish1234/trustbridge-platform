import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import configurations
import { testConnection } from './config/database';
import { initializeRedis } from './config/redis';
import './config/firebase'; // Initialize Firebase

// Import security middleware
import { 
  securityHeaders, 
  corsOptions, 
  generalRateLimit, 
  sanitizeInput, 
  requestLogger, 
  detectSuspiciousActivity 
} from './middleware/security';

// Import routes
import authRoutes from './routes/auth';
import accountRoutes from './routes/accounts';
import scoreRoutes from './routes/scores';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (for accurate IP addresses behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(generalRateLimit);

// Request logging
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization and suspicious activity detection
app.use(sanitizeInput);
app.use(detectSuspiciousActivity);

// Health check endpoint
app.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'OK',
    message: 'TrustBridge API Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: false,
      redis: false,
      firebase: false,
    }
  };

  try {
    // Test database connection
    healthCheck.services.database = await testConnection();
    
    // Test Redis connection (basic check)
    try {
      const { redisClient } = await import('./config/redis');
      healthCheck.services.redis = redisClient.isReady;
    } catch (error) {
      healthCheck.services.redis = false;
    }

    // Firebase is initialized at startup, assume it's working if no errors
    healthCheck.services.firebase = true;

    const allServicesHealthy = Object.values(healthCheck.services).every(service => service);
    
    res.status(allServicesHealthy ? 200 : 503).json(healthCheck);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      ...healthCheck,
      status: 'ERROR',
      message: 'Health check failed'
    });
  }
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/scores', scoreRoutes);

// API status endpoint
app.get('/api/v1/status', (req, res) => {
  res.json({ 
    message: 'TrustBridge API v1.0',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled error:', err.stack);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({ 
    error: 'Something went wrong!',
    code: err.code || 'INTERNAL_ERROR',
    message: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

// Initialize services and start server
async function startServer() {
  try {
    console.log('🚀 Starting TrustBridge API Server...');
    
    // Initialize Redis
    await initializeRedis();
    
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.warn('⚠️  Database connection failed - some features may not work');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`✅ TrustBridge API Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API status: http://localhost:${PORT}/api/v1/status`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/v1/auth/*`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

export default app;