import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';

// Rate limiting configurations
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const scoreCalculationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 score calculations per hour
  message: {
    error: 'Too many score calculation requests',
    code: 'SCORE_RATE_LIMIT_EXCEEDED',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.trustbridge.in"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// CORS configuration
export const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://trustbridge.in',
      'https://app.trustbridge.in'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key);
    sanitized[sanitizedKey] = sanitizeObject(value);
  }
  
  return sanitized;
}

function sanitizeString(input: any): any {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove potentially dangerous characters
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(body) {
    const duration = Date.now() - start;
    
    console.log({
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: (req as any).user?.userId || 'anonymous'
    });
    
    return originalSend.call(this, body);
  };
  
  next();
};

// Security event logging
export const logSecurityEvent = (
  event: string,
  details: any,
  req: Request,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) => {
  const securityLog = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.userId || 'anonymous',
    url: req.url,
    method: req.method,
    details
  };
  
  console.warn('SECURITY EVENT:', securityLog);
  
  // In production, send to security monitoring service
  // await sendToSecurityMonitoring(securityLog);
};

// Suspicious activity detection
export const detectSuspiciousActivity = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /\b(union|select|insert|delete|drop|create|alter)\b/i, // SQL injection patterns
    /<script|javascript:|on\w+=/i, // XSS patterns
    /\.\.\//g, // Path traversal
    /\b(eval|exec|system|shell_exec)\b/i // Code injection
  ];
  
  const checkString = (str: string) => {
    return suspiciousPatterns.some(pattern => pattern.test(str));
  };
  
  const checkObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return checkString(obj);
    }
    
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(checkObject);
    }
    
    return false;
  };
  
  let suspicious = false;
  
  // Check URL
  if (checkString(req.url)) {
    suspicious = true;
  }
  
  // Check query parameters
  if (checkObject(req.query)) {
    suspicious = true;
  }
  
  // Check request body
  if (checkObject(req.body)) {
    suspicious = true;
  }
  
  if (suspicious) {
    logSecurityEvent('SUSPICIOUS_REQUEST_DETECTED', {
      url: req.url,
      query: req.query,
      body: req.body
    }, req, 'high');
    
    return res.status(400).json({
      error: 'Invalid request detected',
      code: 'SUSPICIOUS_ACTIVITY'
    });
  }
  
  next();
};

// API key validation (for partner integrations)
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header('X-API-Key');
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      code: 'API_KEY_MISSING'
    });
  }
  
  // In production, validate against database
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    logSecurityEvent('INVALID_API_KEY', { apiKey }, req, 'high');
    
    return res.status(401).json({
      error: 'Invalid API key',
      code: 'API_KEY_INVALID'
    });
  }
  
  next();
};

// IP whitelist middleware (for admin endpoints)
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip;
    
    if (!allowedIPs.includes(clientIP)) {
      logSecurityEvent('IP_NOT_WHITELISTED', { clientIP, allowedIPs }, req, 'high');
      
      return res.status(403).json({
        error: 'Access denied from this IP',
        code: 'IP_NOT_ALLOWED'
      });
    }
    
    next();
  };
};