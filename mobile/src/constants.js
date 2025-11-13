/**
 * Anchor Constants
 *
 * Centralized constants for the app
 */

// =====================================================
// HARDCODED USER ID FOR SINGLE-USER MVP
// =====================================================
// This UUID is created in the database schema and used
// throughout the app instead of Supabase Auth.
//
// TODO: Replace with proper Supabase Auth for multi-user support
// =====================================================

export const USER_ID = '00000000-0000-0000-0000-000000000001';

// =====================================================
// APP CONFIGURATION
// =====================================================

export const APP_CONFIG = {
  DAILY_ALLOWANCE_AMOUNT: 30.00,
  DAILY_ALLOWANCE_TIME: '00:00', // Midnight
  VAULT_EMERGENCY_BUFFER: 500.00, // Minimum to keep in vault
  HIGH_RISK_THRESHOLD: 50, // Risk score 0-100
};

// =====================================================
// CONVERSATION TYPES
// =====================================================

export const CONVERSATION_TYPES = {
  ONBOARDING: 'onboarding',
  PAYMENT_REQUEST: 'payment_request',
  INTERVENTION: 'intervention',
  CHECK_IN: 'check_in',
  DEPOSIT_INTERROGATION: 'deposit_interrogation',
  DEBT_ACCELERATION: 'debt_acceleration',
  BUDGET_SURPLUS: 'budget_surplus',
};

// =====================================================
// DEPOSIT SOURCE TYPES
// =====================================================

export const DEPOSIT_TYPES = {
  CLIENT_PAYMENT: 'client_payment',
  PAYDAY_LOAN: 'payday_loan',
  MATE: 'mate',
  REFUND: 'refund',
  SCALLYS_INCOME: 'scallys_income',
  UNKNOWN: 'unknown',
};

// =====================================================
// PAYEE CATEGORIES
// =====================================================

export const PAYEE_CATEGORIES = {
  RENT: 'rent',
  UTILITIES: 'utilities',
  DEBT: 'debt',
  GROCERIES: 'groceries',
  PET: 'pet',
  TRANSPORT: 'transport',
  MEDICAL: 'medical',
  INSURANCE: 'insurance',
};

// =====================================================
// REMINDER TYPES
// =====================================================

export const REMINDER_TYPES = {
  DAILY_ALLOWANCE: 'daily_allowance',
  BILL_DUE: 'bill_due',
  DEBT_PAYMENT: 'debt_payment',
  LOCK_DEPOSIT: 'lock_deposit',
  BUDGET_CHECK: 'budget_check',
};

// =====================================================
// PAYMENT METHODS
// =====================================================

export const PAYMENT_METHODS = {
  BANK_TRANSFER: 'bank_transfer',
  BPAY: 'bpay',
  CARD: 'card',
  OSKO: 'osko',
};
