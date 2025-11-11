/**
 * Up Bank Accounts API
 *
 * Fetches account balances from Up Bank
 * Used by mobile app to display current balance
 */

const UP_API_BASE = 'https://api.up.com.au/api/v1';

export default async function handler(req, res) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Fetch accounts from Up Bank API
    const response = await fetch(`${UP_API_BASE}/accounts`, {
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

    // Transform response to include only relevant data
    const accounts = data.data.map(account => ({
      id: account.id,
      displayName: account.attributes.displayName,
      accountType: account.attributes.accountType,
      balance: {
        value: account.attributes.balance.value,
        currency: account.attributes.balance.currencyCode
      },
      createdAt: account.attributes.createdAt
    }));

    return res.status(200).json({
      accounts,
      totalBalance: accounts.reduce((sum, acc) => sum + parseFloat(acc.balance.value), 0)
    });

  } catch (error) {
    console.error('Error fetching accounts:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
