/**
 * Anchor API Server
 * Used for Railway and Docker deployments
 * (Vercel uses serverless functions instead)
 */

import http from 'http';
import crypto from 'crypto';

// Import API handlers
import upBankWebhookHandler from './webhooks/up-bank.js';
import conversationHandler from './ai/conversation.js';
import voiceAnalyzeHandler from './voice/analyze.js';
import accountsHandler from './up/accounts.js';
import transactionsHandler from './up/transactions.js';
import webhookSetupHandler from './up/webhook-setup.js';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Simple router for API endpoints
 */
async function router(req, res) {
  const { method, url } = req;
  const parsedUrl = new URL(url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (pathname === '/health' || pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    }));
    return;
  }

  // Route to appropriate handler
  try {
    // Webhooks
    if (pathname === '/api/webhooks/up-bank') {
      await handleRequest(req, res, upBankWebhookHandler);
      return;
    }

    // AI endpoints
    if (pathname === '/api/ai/conversation') {
      await handleRequest(req, res, conversationHandler);
      return;
    }

    if (pathname === '/api/voice/analyze') {
      await handleRequest(req, res, voiceAnalyzeHandler);
      return;
    }

    // Up Bank API endpoints
    if (pathname === '/api/up/accounts') {
      await handleRequest(req, res, accountsHandler);
      return;
    }

    if (pathname === '/api/up/transactions') {
      await handleRequest(req, res, transactionsHandler);
      return;
    }

    if (pathname === '/api/up/webhook-setup') {
      await handleRequest(req, res, webhookSetupHandler);
      return;
    }

    // 404 - Not found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not found',
      path: pathname
    }));
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }));
  }
}

/**
 * Handle request by calling Vercel-style handler
 */
async function handleRequest(req, res, handler) {
  // Parse body if present
  if (req.method === 'POST' || req.method === 'PUT') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    await new Promise((resolve) => {
      req.on('end', () => {
        try {
          req.body = body ? JSON.parse(body) : {};
        } catch (e) {
          req.body = {};
        }
        resolve();
      });
    });
  }

  // Parse query parameters
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  req.query = Object.fromEntries(parsedUrl.searchParams);

  // Call handler
  await handler(req, res);
}

/**
 * Create and start server
 */
const server = http.createServer(router);

server.listen(PORT, HOST, () => {
  console.log(`🚀 Anchor API Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default server;
