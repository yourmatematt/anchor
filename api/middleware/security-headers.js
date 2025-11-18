/**
 * Security Headers Middleware
 *
 * Implements security best practices headers:
 * - CSP (Content Security Policy)
 * - HSTS (Strict Transport Security)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - X-XSS-Protection
 * - Referrer-Policy
 */

const helmet = require('helmet');

/**
 * Apply security headers
 */
function securityHeaders() {
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://api.anchor.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },

    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },

    // Frame options
    frameguard: {
      action: 'deny' // Prevent clickjacking
    },

    // Content type sniffing
    noSniff: true,

    // XSS protection
    xssFilter: true,

    // Referrer policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    },

    // Hide powered by header
    hidePoweredBy: true,

    // DNS prefetch control
    dnsPrefetchControl: {
      allow: false
    },

    // IE No Open
    ieNoOpen: true,

    // Permissions Policy (Feature Policy)
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none'
    }
  });
}

/**
 * Custom security headers
 */
function customSecurityHeaders(req, res, next) {
  // Permissions Policy (replaces Feature-Policy)
  res.setHeader('Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()');

  // Expect-CT (Certificate Transparency)
  res.setHeader('Expect-CT',
    'max-age=86400, enforce');

  // X-Permitted-Cross-Domain-Policies
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // Clear-Site-Data (for logout)
  if (req.path === '/api/auth/logout') {
    res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
  }

  next();
}

/**
 * CORS configuration
 */
function corsConfig() {
  return {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://anchor.com'],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 600 // 10 minutes
  };
}

module.exports = {
  securityHeaders,
  customSecurityHeaders,
  corsConfig
};
