import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // For now, return mock data to test the endpoint works
    return NextResponse.json({
      total_ad_sets: 10,
      active_ad_sets: 7,
      ad_sets: [
        { id: '1', name: 'Test Ad Set 1', status: 'ACTIVE' },
        { id: '2', name: 'Test Ad Set 2', status: 'ACTIVE' }
      ]
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
