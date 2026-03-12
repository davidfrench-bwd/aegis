import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/supabase/service'

// GET: list all clinic settings (masks API keys)
export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('clinic_settings')
    .select('*')
    .order('clinic_name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Mask sensitive fields for the UI
  const masked = data.map((clinic: any) => ({
    ...clinic,
    ghl_api_key: clinic.ghl_api_key ? `...${clinic.ghl_api_key.slice(-8)}` : null,
    meta_access_token: clinic.meta_access_token ? `...${clinic.meta_access_token.slice(-8)}` : null,
  }))

  return NextResponse.json(masked)
}

// POST: create or update a clinic
export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()

  const { clinic_id, clinic_name, ghl_api_key, ghl_location_id, meta_ad_account_id, meta_access_token, tag_mapping, is_active } = body

  if (!clinic_id || !clinic_name) {
    return NextResponse.json({ error: 'clinic_id and clinic_name are required' }, { status: 400 })
  }

  const record: any = {
    clinic_id,
    clinic_name,
    ghl_location_id: ghl_location_id || null,
    meta_ad_account_id: meta_ad_account_id || null,
    is_active: is_active ?? true,
  }

  // Only update secrets if provided (non-empty)
  if (ghl_api_key) record.ghl_api_key = ghl_api_key
  if (meta_access_token) record.meta_access_token = meta_access_token
  if (tag_mapping) record.tag_mapping = tag_mapping

  const { data, error } = await supabase
    .from('clinic_settings')
    .upsert(record, { onConflict: 'clinic_id' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE: remove a clinic
export async function DELETE(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const clinicId = searchParams.get('clinic_id')

  if (!clinicId) {
    return NextResponse.json({ error: 'clinic_id is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('clinic_settings')
    .delete()
    .eq('clinic_id', clinicId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: clinicId })
}
