/**
 * Voice Analysis Endpoint
 * Vercel Serverless Function
 *
 * POST /api/voice/analyze
 * Analyzes voice memo transcripts using Claude
 */

import { analyzeTranscript } from '../services/ai-conversation.js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transcript, context } = req.body;

    // Validate required fields
    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    if (!context || !context.amount || !context.payee) {
      return res.status(400).json({ error: 'Transaction context is required' });
    }

    // Analyze the transcript
    const analysis = await analyzeTranscript(transcript, context);

    return res.status(200).json({
      success: true,
      analysis: analysis.suggestion,
      concernLevel: analysis.concernLevel,
      flags: analysis.flags,
      supportNeeded: analysis.supportNeeded,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Voice analysis endpoint error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to analyze voice memo',
      message: error.message
    });
  }
}
