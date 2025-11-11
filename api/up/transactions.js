/**
 * Up Bank Transactions API
 *
 * Fetches recent transactions from Up Bank
 * Used by mobile app to display transaction history
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

    // Get query parameters
    const { accountId, limit = '20', since, until } = req.query;

    // Build URL with query parameters
    let url = `${UP_API_BASE}/transactions`;
    const params = new URLSearchParams();

    if (accountId) params.append('filter[account]', accountId);
    if (limit) params.append('page[size]', limit);
    if (since) params.append('filter[since]', since);
    if (until) params.append('filter[until]', until);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    // Fetch transactions from Up Bank API
    const response = await fetch(url, {
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
    const transactions = data.data.map(tx => ({
      id: tx.id,
      status: tx.attributes.status,
      description: tx.attributes.description,
      message: tx.attributes.message,
      amount: {
        value: tx.attributes.amount.value,
        currency: tx.attributes.amount.currencyCode
      },
      settledAt: tx.attributes.settledAt,
      createdAt: tx.attributes.createdAt,
      category: tx.relationships?.category?.data?.id || null
    }));

    return res.status(200).json({
      transactions,
      count: transactions.length
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
