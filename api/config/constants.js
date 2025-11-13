/**
 * Backend API Constants
 *
 * Centralized constants for the API
 */

// =====================================================
// HARDCODED USER ID FOR SINGLE-USER MVP
// =====================================================
// This UUID must match the database schema and mobile app
//
// TODO: Replace with proper Supabase Auth for multi-user support
// =====================================================

const USER_ID = '00000000-0000-0000-0000-000000000001';

// =====================================================
// APP CONFIGURATION
// =====================================================

const APP_CONFIG = {
  DAILY_ALLOWANCE_AMOUNT: 30.00,
  VAULT_EMERGENCY_BUFFER: 500.00,
  HIGH_RISK_THRESHOLD: 50,
  MAX_CONVERSATION_LENGTH: 12, // Max messages in a conversation
};

// =====================================================
// CLAUDE API CONFIGURATION
// =====================================================

const CLAUDE_CONFIG = {
  MODEL: 'claude-sonnet-4-20250514',
  MAX_TOKENS: 1024,
  TEMPERATURE: 1.0,
};

module.exports = {
  USER_ID,
  APP_CONFIG,
  CLAUDE_CONFIG,
};
