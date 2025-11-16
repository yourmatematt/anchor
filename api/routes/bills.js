/**
 * Bills Routes
 * Handles bill/payee whitelist management
 * Pre-approved bills bypass AI evaluation
 */

const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { validateBody, schemas } = require('../middleware/validation');
const { supabase, logError } = require('../utils/supabase');

/**
 * GET /api/bills/upcoming
 * Get bills due in next 7 days
 */
router.get('/upcoming', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;

    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: bills, error } = await supabase
      .from('bills_whitelist')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lte('due_date', sevenDaysFromNow)
      .order('due_date', { ascending: true });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      bills: bills || [],
    });

  } catch (error) {
    await logError(error, { context: 'bills_upcoming', userId: req.userId });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to get upcoming bills',
    });
  }
});

/**
 * POST /api/bills/add
 * Add bill to whitelist
 */
router.post('/add', authenticateUser, validateBody(schemas.billAdd), async (req, res) => {
  try {
    const userId = req.userId;
    const { payee_name, amount, frequency, priority, due_date, notes } = req.body;

    const billData = {
      user_id: userId,
      payee_name,
      amount,
      frequency,
      priority: priority || 'normal',
      due_date,
      notes: notes || null,
      status: 'pending',
    };

    const { data: bill, error } = await supabase
      .from('bills_whitelist')
      .insert(billData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json({
      success: true,
      bill_id: bill.id,
    });

  } catch (error) {
    await logError(error, { context: 'bills_add', userId: req.userId });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to add bill',
    });
  }
});

/**
 * PUT /api/bills/update/:id
 * Update bill details
 */
router.put('/update/:id', authenticateUser, validateBody(schemas.billUpdate), async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Verify bill belongs to user
    const { data: existingBill } = await supabase
      .from('bills_whitelist')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingBill || existingBill.user_id !== userId) {
      return res.status(404).json({
        error: true,
        code: 'NOT_FOUND',
        message: 'Bill not found',
      });
    }

    // Update bill
    const updateData = {};
    if (req.body.amount !== undefined) updateData.amount = req.body.amount;
    if (req.body.payee_name !== undefined) updateData.payee_name = req.body.payee_name;
    if (req.body.frequency !== undefined) updateData.frequency = req.body.frequency;
    if (req.body.priority !== undefined) updateData.priority = req.body.priority;
    if (req.body.due_date !== undefined) updateData.due_date = req.body.due_date;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;

    const { error } = await supabase
      .from('bills_whitelist')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Bill updated',
    });

  } catch (error) {
    await logError(error, { context: 'bills_update', userId: req.userId, billId: req.params.id });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to update bill',
    });
  }
});

/**
 * DELETE /api/bills/remove/:id
 * Remove bill from whitelist
 */
router.delete('/remove/:id', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Verify bill belongs to user
    const { data: existingBill } = await supabase
      .from('bills_whitelist')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingBill || existingBill.user_id !== userId) {
      return res.status(404).json({
        error: true,
        code: 'NOT_FOUND',
        message: 'Bill not found',
      });
    }

    const { error } = await supabase
      .from('bills_whitelist')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Bill removed',
    });

  } catch (error) {
    await logError(error, { context: 'bills_remove', userId: req.userId, billId: req.params.id });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to remove bill',
    });
  }
});

module.exports = router;
