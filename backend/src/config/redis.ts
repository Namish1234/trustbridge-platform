import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Redis configuration
const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD || undefined,
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    reconnectStrategy: (retries: number) => Math.min(retries * 50, 500),
  },
};

// Create Redis client
export const redisClient: RedisClientType = createClient(redisConfig);

// Redis event handlers
redisClient.on('connect', () => {
  console.log('🔄 Connecting to Redis...');
});

redisClient.on('ready', () => {
  console.log('✅ Redis client ready');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis client error:', err);
});

redisClient.on('end', () => {
  console.log('🔚 Redis connection closed');
});

// Initialize Redis connection
export async function initializeRedis(): Promise<void> {
  try {
    await redisClient.connect();
    console.log('✅ Connected to Redis successfully');
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Running in development mode - Redis features may be limited');
    }
  }
}

// Helper functions for common Redis operations

// Session management
export async function setSession(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
  try {
    await redisClient.setEx(`session:${sessionId}`, ttl, JSON.stringify(data));
  } catch (error) {
    console.error('❌ Failed to set session:', error);
    throw error;
  }
}

export async function getSession(sessionId: string): Promise<any | null> {
  try {
    const data = await redisClient.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('❌ Failed to get session:', error);
    return null;
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await redisClient.del(`session:${sessionId}`);
  } catch (error) {
    console.error('❌ Failed to delete session:', error);
    throw error;
  }
}

// Cache management
export async function setCache(key: string, value: any, ttl: number = 300): Promise<void> {
  try {
    await redisClient.setEx(`cache:${key}`, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('❌ Failed to set cache:', error);
    throw error;
  }
}

export async function getCache(key: string): Promise<any | null> {
  try {
    const data = await redisClient.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('❌ Failed to get cache:', error);
    return null;
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    await redisClient.del(`cache:${key}`);
  } catch (error) {
    console.error('❌ Failed to delete cache:', error);
    throw error;
  }
}

// Rate limiting
export async function incrementRateLimit(key: string, window: number = 900): Promise<number> {
  try {
    const current = await redisClient.incr(`rate:${key}`);
    if (current === 1) {
      await redisClient.expire(`rate:${key}`, window);
    }
    return current;
  } catch (error) {
    console.error('❌ Failed to increment rate limit:', error);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Closing Redis connection...');
  await redisClient.quit();
  console.log('✅ Redis connection closed');
});

export default redisClient;