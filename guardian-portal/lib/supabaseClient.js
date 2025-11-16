/**
 * Supabase Client for Guardian Portal
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Send magic link for passwordless auth
 */
export async function sendMagicLink(phone) {
  const { error } = await supabase.auth.signInWithOtp({
    phone: phone,
  });

  if (error) {
    console.error('Magic link error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Verify OTP code
 */
export async function verifyOTP(phone, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: phone,
    token: token,
    type: 'sms',
  });

  if (error) {
    console.error('OTP verification error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, session: data.session };
}

/**
 * Get current guardian
 */
export async function getCurrentGuardian() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('guardians')
    .select('*, users!guardians_user_id_fkey(id, name, last_relapse_date, commitment_start_date)')
    .eq('phone', user.phone)
    .eq('status', 'active')
    .single();

  if (error) {
    console.error('Error fetching guardian:', error);
    return null;
  }

  return data;
}

/**
 * Get user's clean streak
 */
export function calculateCleanStreak(lastRelapseDate, commitmentStartDate) {
  const startDate = lastRelapseDate || commitmentStartDate;
  if (!startDate) return 0;

  const daysSince = Math.floor(
    (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.max(0, daysSince);
}

/**
 * Sign out
 */
export async function signOut() {
  await supabase.auth.signOut();
}
