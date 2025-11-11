/**
 * Up Bank Webhook Setup
 *
 * Creates and manages webhooks with Up Bank
 * Call this once during initial setup to register the webhook
 */

const UP_API_BASE = 'https://api.up.com.au/api/v1';

export default async function handler(req, res) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Handle different methods
    if (req.method === 'GET') {
      // List existing webhooks
      const response = await fetch(`${UP_API_BASE}/webhooks`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        return res.status(response.status).json({
          error: 'Up Bank API error',
          details: errorData
        });
      }

      const data = await response.json();
      return res.status(200).json(data);

    } else if (req.method === 'POST') {
      // Create new webhook
      const { webhookUrl } = req.body;

      if (!webhookUrl) {
        return res.status(400).json({ error: 'webhookUrl is required' });
      }

      // Create webhook for TRANSACTION_CREATED events
      const response = await fetch(`${UP_API_BASE}/webhooks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            attributes: {
              url: webhookUrl,
              description: 'Anchor Financial Accountability System - Transaction Monitor'
            }
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return res.status(response.status).json({
          error: 'Failed to create webhook',
          details: errorData
        });
      }

      const data = await response.json();

      // Return webhook details including the secret key
      return res.status(201).json({
        message: 'Webhook created successfully',
        webhook: {
          id: data.data.id,
          url: data.data.attributes.url,
          secretKey: data.data.attributes.secretKey, // IMPORTANT: Save this!
          description: data.data.attributes.description,
          createdAt: data.data.attributes.createdAt
        },
        instructions: 'Save the secretKey in your VERCEL environment variables as UP_WEBHOOK_SECRET'
      });

    } else if (req.method === 'DELETE') {
      // Delete webhook
      const { webhookId } = req.body;

      if (!webhookId) {
        return res.status(400).json({ error: 'webhookId is required' });
      }

      const response = await fetch(`${UP_API_BASE}/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        return res.status(response.status).json({
          error: 'Failed to delete webhook',
          details: errorData
        });
      }

      return res.status(200).json({ message: 'Webhook deleted successfully' });

    } else if (req.method === 'POST' && req.query.ping) {
      // Ping webhook (test it)
      const { webhookId } = req.body;

      if (!webhookId) {
        return res.status(400).json({ error: 'webhookId is required' });
      }

      const response = await fetch(`${UP_API_BASE}/webhooks/${webhookId}/ping`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        return res.status(response.status).json({
          error: 'Failed to ping webhook',
          details: errorData
        });
      }

      const data = await response.json();
      return res.status(200).json({
        message: 'Webhook ping sent successfully',
        deliveryStatus: data.data.attributes.deliveryStatus
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Error managing webhook:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
