import { NextRequest, NextResponse } from 'next/server'

function headers(serviceKey: string) {
  return {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()

  const res = await fetch(
    `${supabaseUrl}/rest/v1/global_settings?select=key,value,updated_at`,
    { headers: headers(serviceKey), cache: 'no-store' }
  )

  if (!res.ok) {
    return NextResponse.json({ error: `Supabase error: ${res.status}` }, { status: 500 })
  }

  const rows = await res.json()

  // Mask sensitive values
  const masked = rows.map((r: any) => ({
    ...r,
    value: r.key.toLowerCase().includes('token') || r.key.toLowerCase().includes('secret')
      ? `...${r.value.slice(-8)}`
      : r.value,
  }))

  return NextResponse.json(masked)
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()

  const { key, value } = await request.json()

  if (!key || !value) {
    return NextResponse.json({ error: 'key and value are required' }, { status: 400 })
  }

  const res = await fetch(
    `${supabaseUrl}/rest/v1/global_settings`,
    {
      method: 'POST',
      headers: { ...headers(serviceKey), 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  return NextResponse.json({ saved: key })
}
