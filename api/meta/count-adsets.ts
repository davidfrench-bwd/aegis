import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Allow CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end()
    }
    
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed. Use POST.' })
    }

    // For now, just return mock data to test the endpoint works
    return res.status(200).json({
      total_ad_sets: 5,
      active_ad_sets: 3,
      ad_sets: [
        { id: '1', name: 'Test Ad Set 1', status: 'ACTIVE' },
        { id: '2', name: 'Test Ad Set 2', status: 'ACTIVE' },
        { id: '3', name: 'Test Ad Set 3', status: 'ACTIVE' }
      ],
      debug: {
        message: 'Mock data - API is working!',
        body: req.body,
        method: req.method
      }
    })
    
  } catch (error) {
    console.error('Error in count-adsets:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}
