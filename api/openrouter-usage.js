/**
 * Serverless function to fetch OpenRouter usage data
 * 
 * OpenRouter API: https://openrouter.ai/docs#limits
 * GET https://openrouter.ai/api/v1/auth/key with Authorization header
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenRouter API key not configured' });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    
    // OpenRouter returns: { data: { limit, usage, rate_limit } }
    // usage is in USD cents
    const usageCents = data.data?.usage || 0;
    const limitCents = data.data?.limit || 0;
    
    const usageDollars = usageCents / 100;
    const limitDollars = limitCents / 100;

    return res.status(200).json({
      usage: usageDollars,
      limit: limitDollars,
      percentage: limitDollars > 0 ? (usageDollars / limitDollars) * 100 : 0,
      updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching OpenRouter usage:', error);
    return res.status(500).json({ error: error.message });
  }
}
