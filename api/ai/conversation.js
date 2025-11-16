/**
 * AI Conversation Endpoint
 * Vercel Serverless Function
 *
 * POST /api/ai/conversation
 * Handles conversation requests from mobile app
 */

import { getAIResponse, getStreamingResponse } from '../services/ai-conversation.js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, trigger, userData, streaming = false } = req.body;

    // Validate required fields
    if (!trigger) {
      return res.status(400).json({ error: 'Trigger type is required' });
    }

    // Handle streaming responses
    if (streaming) {
      // Set headers for SSE (Server-Sent Events)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      await getStreamingResponse(
        { messages, trigger, userData },
        // onChunk
        (chunk) => {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        },
        // onComplete
        (fullText) => {
          res.write(`data: ${JSON.stringify({ done: true, fullText })}\n\n`);
          res.end();
        },
        // onError
        (error) => {
          res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
          res.end();
        }
      );

      return;
    }

    // Handle standard non-streaming response
    const response = await getAIResponse({
      messages,
      trigger,
      userData,
      streaming: false
    });

    return res.status(200).json({
      success: true,
      text: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Conversation endpoint error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to get AI response',
      message: error.message
    });
  }
}
