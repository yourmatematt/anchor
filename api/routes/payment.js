/**
 * Payment Request API Routes
 * Handle payment requests, AI evaluation, manual payment confirmation
 */

const express = require('express');
const router = express.Router();
const { supabase, logError } = require('../utils/supabase');
const { authenticateUser } = require('../middleware/auth');
const { validateBody, validateQuery, validateParams, schemas } = require('../middleware/validation');
const { startConversation } = require('../services/ai-conversation');
const Joi = require('joi');

/**
 * POST /api/payment/request
 * Create payment request, trigger AI evaluation
 */
router.post('/request',
  authenticateUser,
  validateBody(schemas.paymentRequest),
  async (req, res) => {
    try {
      const { amount, reason, is_voice } = req.body;
      const userId = req.userId;

      // Create payment request record
      const { data: paymentRequest, error } = await supabase
        .from('payment_requests')
        .insert({
          user_id: userId,
          amount: amount,
          reason: reason,
          status: 'evaluating',
          requested_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        await logError(error, { userId, amount, reason });
        return res.status(500).json({
          error: true,
          code: 'DATABASE_ERROR',
          message: 'Failed to create payment request',
        });
      }

      // Trigger AI evaluation (this starts a conversation)
      const conversationResult = await startConversation(
        userId,
        'PAYMENT_REQUEST',
        paymentRequest.id,
        {
          amount: amount,
          reason: reason,
          time: new Date().toISOString(),
          is_voice: is_voice,
        }
      );

      if (!conversationResult.success) {
        await logError(new Error('AI conversation failed to start'), {
          userId,
          paymentRequestId: paymentRequest.id,
        });
      }

      return res.status(201).json({
        success: true,
        payment_request_id: paymentRequest.id,
        conversation_id: conversationResult.conversationId,
        status: 'evaluating',
        message: 'Payment request created, AI evaluation started',
      });

    } catch (error) {
      await logError(error, { userId: req.userId, body: req.body });
      return res.status(500).json({
        error: true,
        code: 'SERVER_ERROR',
        message: 'Failed to process payment request',
      });
    }
  }
);

/**
 * GET /api/payment/history
 * Get payment request history with pagination
 */
router.get('/history',
  authenticateUser,
  validateQuery(schemas.pagination),
  async (req, res) => {
    try {
      const { page, limit } = req.query;
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('payment_requests')
        .select('*', { count: 'exact' })
        .eq('user_id', req.userId)
        .order('requested_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        await logError(error, { userId: req.userId });
        return res.status(500).json({
          error: true,
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch payment history',
        });
      }

      return res.json({
        success: true,
        data: data,
        pagination: {
          page: page,
          limit: limit,
          total: count,
          pages: Math.ceil(count / limit),
        },
      });

    } catch (error) {
      await logError(error, { userId: req.userId });
      return res.status(500).json({
        error: true,
        code: 'SERVER_ERROR',
        message: 'Failed to fetch payment history',
      });
    }
  }
);

/**
 * POST /api/payment/confirm/:id
 * Confirm manual payment completion
 */
router.post('/confirm/:id',
  authenticateUser,
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    try {
      const paymentId = req.params.id;

      // Get payment request
      const { data: payment, error: fetchError } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('id', paymentId)
        .eq('user_id', req.userId)
        .single();

      if (fetchError || !payment) {
        return res.status(404).json({
          error: true,
          code: 'NOT_FOUND',
          message: 'Payment request not found',
        });
      }

      if (payment.status !== 'approved') {
        return res.status(400).json({
          error: true,
          code: 'INVALID_STATUS',
          message: 'Only approved payments can be confirmed',
        });
      }

      if (payment.completed) {
        return res.status(400).json({
          error: true,
          code: 'ALREADY_COMPLETED',
          message: 'Payment already confirmed',
        });
      }

      // Mark as completed
      const { error: updateError } = await supabase
        .from('payment_requests')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (updateError) {
        await logError(updateError, { paymentId });
        return res.status(500).json({
          error: true,
          code: 'DATABASE_ERROR',
          message: 'Failed to confirm payment',
        });
      }

      return res.json({
        success: true,
        message: 'Payment confirmed',
      });

    } catch (error) {
      await logError(error, { userId: req.userId, paymentId: req.params.id });
      return res.status(500).json({
        error: true,
        code: 'SERVER_ERROR',
        message: 'Failed to confirm payment',
      });
    }
  }
);

/**
 * GET /api/payment/pending
 * Get pending payment requests
 */
router.get('/pending',
  authenticateUser,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('user_id', req.userId)
        .in('status', ['evaluating', 'approved'])
        .eq('completed', false)
        .order('requested_at', { ascending: false });

      if (error) {
        await logError(error, { userId: req.userId });
        return res.status(500).json({
          error: true,
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch pending payments',
        });
      }

      return res.json({
        success: true,
        data: data,
      });

    } catch (error) {
      await logError(error, { userId: req.userId });
      return res.status(500).json({
        error: true,
        code: 'SERVER_ERROR',
        message: 'Failed to fetch pending payments',
      });
    }
  }
);

/**
 * GET /api/payment/stats
 * Payment statistics (approved/denied ratio)
 */
router.get('/stats',
  authenticateUser,
  async (req, res) => {
    try {
      // Get all payment requests
      const { data, error } = await supabase
        .from('payment_requests')
        .select('status, amount')
        .eq('user_id', req.userId);

      if (error) {
        await logError(error, { userId: req.userId });
        return res.status(500).json({
          error: true,
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch payment stats',
        });
      }

      // Calculate stats
      const stats = {
        total: data.length,
        approved: data.filter(p => p.status === 'approved').length,
        denied: data.filter(p => p.status === 'denied').length,
        evaluating: data.filter(p => p.status === 'evaluating').length,
        total_requested: data.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        total_approved: data
          .filter(p => p.status === 'approved')
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        approval_rate: data.length > 0
          ? ((data.filter(p => p.status === 'approved').length / data.length) * 100).toFixed(1)
          : 0,
      };

      return res.json({
        success: true,
        stats: stats,
      });

    } catch (error) {
      await logError(error, { userId: req.userId });
      return res.status(500).json({
        error: true,
        code: 'SERVER_ERROR',
        message: 'Failed to fetch payment stats',
      });
    }
  }
);

module.exports = router;
