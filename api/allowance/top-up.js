/**
 * Daily Allowance Top-up
 *
 * Automated job (runs at midnight via cron/Vercel cron)
 * Checks allowance account balance
 * If < $30, transfers difference from vault
 * NO ROLLOVER - caps at $30
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Get account balance from Up Bank
 */
async function getAccountBalance(accountId, upToken) {
  try {
    const response = await fetch(`https://api.up.com.au/api/v1/accounts/${accountId}`, {
      headers: {
        'Authorization': `Bearer ${upToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Up Bank API error: ${response.statusText}`);
    }

    const data = await response.json();
    return parseFloat(data.data.attributes.balance.value);

  } catch (error) {
    console.error('Error fetching account balance:', error);
    throw error;
  }
}

/**
 * Transfer money between Up Bank accounts
 */
async function transferBetweenAccounts(fromAccountId, toAccountId, amount, description, upToken) {
  try {
    const response = await fetch('https://api.up.com.au/api/v1/transactions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${upToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: {
              currencyCode: 'AUD',
              value: amount.toFixed(2)
            },
            description: description
          },
          relationships: {
            sourceAccount: {
              data: {
                type: 'accounts',
                id: fromAccountId
              }
            },
            destinationAccount: {
              data: {
                type: 'accounts',
                id: toAccountId
              }
            }
          }
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Transfer failed: ${JSON.stringify(errorData)}`);
    }

    return await response.json();

  } catch (error) {
    console.error('Error transferring funds:', error);
    throw error;
  }
}

/**
 * Main handler for allowance top-up
 */
export default async function handler(req, res) {
  // This endpoint should be called by Vercel Cron or similar
  // Verify cron secret to prevent unauthorized access
  const cronSecret = req.headers['x-vercel-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get all user profiles with allowance accounts configured
    const { data: userProfiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .not('allowance_account_id', 'is', null)
      .not('vault_account_id', 'is', null);

    if (profileError) {
      console.error('Error fetching user profiles:', profileError);
      return res.status(500).json({ error: 'Failed to fetch user profiles' });
    }

    if (!userProfiles || userProfiles.length === 0) {
      return res.status(200).json({
        message: 'No users with allowance accounts configured',
        processed: 0
      });
    }

    const results = [];
    const DAILY_ALLOWANCE_CAP = 30.00;

    // Process each user
    for (const profile of userProfiles) {
      try {
        // For MVP, we need to get the Up Bank token
        // In production, this would be stored securely per user
        // For now, assuming single user, token in env var
        const upToken = process.env.UP_PERSONAL_ACCESS_TOKEN;

        if (!upToken) {
          console.error('No Up Bank token available for user:', profile.user_id);
          results.push({
            user_id: profile.user_id,
            success: false,
            error: 'No Up Bank token configured'
          });
          continue;
        }

        // Get current balance of allowance account
        const currentBalance = await getAccountBalance(
          profile.allowance_account_id,
          upToken
        );

        console.log(`User ${profile.user_id} allowance balance: $${currentBalance}`);

        // Calculate top-up amount
        let topUpAmount = 0;
        if (currentBalance < DAILY_ALLOWANCE_CAP) {
          topUpAmount = DAILY_ALLOWANCE_CAP - currentBalance;
        }

        // Log daily allowance record
        const today = new Date().toISOString().split('T')[0];
        const { data: allowanceRecord, error: allowanceError } = await supabase
          .from('daily_allowances')
          .upsert({
            user_id: profile.user_id,
            date: today,
            opening_balance: currentBalance,
            top_up_amount: topUpAmount,
            closing_balance: currentBalance + topUpAmount,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,date'
          })
          .select()
          .single();

        if (allowanceError) {
          console.error('Error logging allowance:', allowanceError);
        }

        // If top-up needed, transfer from vault
        if (topUpAmount > 0) {
          console.log(`Topping up $${topUpAmount} for user ${profile.user_id}`);

          await transferBetweenAccounts(
            profile.vault_account_id,
            profile.allowance_account_id,
            topUpAmount,
            `Anchor daily allowance top-up`,
            upToken
          );

          results.push({
            user_id: profile.user_id,
            success: true,
            opening_balance: currentBalance,
            top_up_amount: topUpAmount,
            closing_balance: DAILY_ALLOWANCE_CAP
          });

        } else {
          results.push({
            user_id: profile.user_id,
            success: true,
            opening_balance: currentBalance,
            top_up_amount: 0,
            closing_balance: currentBalance,
            message: 'No top-up needed'
          });
        }

      } catch (error) {
        console.error(`Error processing user ${profile.user_id}:`, error);
        results.push({
          user_id: profile.user_id,
          success: false,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      message: 'Allowance top-up completed',
      processed: results.length,
      results
    });

  } catch (error) {
    console.error('Allowance top-up error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
