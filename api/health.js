/**
 * Health Check Endpoint
 * Used by Vercel and monitoring systems
 */

export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    version: process.env.npm_package_version || '1.0.0',
    services: {
      supabase: !!process.env.SUPABASE_URL,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      upBank: !!process.env.UP_WEBHOOK_SECRET
    }
  });
}
