/**
 * Supabase Client Utility
 * Centralized Supabase client with error logging
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service key (full access)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Log error to Supabase error_logs table
 */
async function logError(error, context = {}) {
  try {
    await supabase
      .from('error_logs')
      .insert({
        error_message: error.message || String(error),
        error_stack: error.stack || null,
        context: context,
        timestamp: new Date().toISOString(),
      });
  } catch (logError) {
    // Don't throw if logging fails, just console.error
    console.error('Failed to log error to Supabase:', logError);
  }
}

/**
 * Execute query with error logging
 */
async function query(operation, errorContext = {}) {
  try {
    const result = await operation();
    if (result.error) {
      await logError(result.error, errorContext);
      throw result.error;
    }
    return result;
  } catch (error) {
    await logError(error, errorContext);
    throw error;
  }
}

module.exports = {
  supabase,
  logError,
  query,
};
