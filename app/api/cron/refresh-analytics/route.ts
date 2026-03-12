import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/supabase/service'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface Contact {
  id: string
  dateAdded: string
  tags: string[]
}

interface GHLResponse {
  contacts: Contact[]
  meta: {
    total: number
    nextPageUrl?: string
    startAfterId?: string
    startAfter?: number
  }
}

async function fetchAllContacts(apiKey: string, locationId: string): Promise<Contact[]> {
  const contacts: Contact[] = []
  let hasMore = true
  let startAfterId: string | undefined
  let startAfter: number | undefined

  while (hasMore) {
    const url = new URL('https://rest.gohighlevel.com/v1/contacts/')
    url.searchParams.append('locationId', locationId)
    url.searchParams.append('limit', '100')

    if (startAfterId && startAfter) {
      url.searchParams.append('startAfterId', startAfterId)
      url.searchParams.append('startAfter', String(startAfter))
    }

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })

    if (!response.ok) {
      throw new Error(`GHL API error: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as GHLResponse
    contacts.push(...data.contacts)

    if (data.meta.nextPageUrl && data.meta.startAfterId) {
      startAfterId = data.meta.startAfterId
      startAfter = data.meta.startAfter
    } else {
      hasMore = false
    }
  }

  return contacts
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function countByTagAndMonth(contacts: Contact[], tags: string[]): Record<string, Record<string, number>> {
  const counts: Record<string, Record<string, number>> = {}

  for (const contact of contacts) {
    if (!contact.tags || !contact.dateAdded) continue
    const month = getMonthKey(new Date(contact.dateAdded))

    for (const tag of tags) {
      if (contact.tags.includes(tag)) {
        if (!counts[month]) counts[month] = {}
        counts[month][tag] = (counts[month][tag] || 0) + 1
      }
    }
  }

  return counts
}

/**
 * Fetch monthly ad spend from Meta Marketing API
 * Returns a map of month -> total spend
 */
async function fetchMetaAdSpend(
  adAccountId: string,
  accessToken: string
): Promise<Record<string, number>> {
  const spendByMonth: Record<string, number> = {}

  // Fetch the last 15 months of spend data, grouped by month
  const now = new Date()
  const since = new Date(now.getFullYear() - 1, now.getMonth() - 3, 1)
  const sinceStr = since.toISOString().split('T')[0]
  const untilStr = now.toISOString().split('T')[0]

  const url = new URL(`https://graph.facebook.com/v21.0/act_${adAccountId.replace('act_', '')}/insights`)
  url.searchParams.append('fields', 'spend')
  url.searchParams.append('time_range', JSON.stringify({ since: sinceStr, until: untilStr }))
  url.searchParams.append('time_increment', 'monthly')
  url.searchParams.append('access_token', accessToken)
  url.searchParams.append('limit', '100')

  const response = await fetch(url.toString())

  if (!response.ok) {
    const errorBody = await response.text()
    console.error(`[CRON] Meta API error: ${response.status}`, errorBody)
    return spendByMonth
  }

  const data = await response.json()

  for (const row of data.data || []) {
    // date_start is like "2026-03-01"
    const month = row.date_start?.substring(0, 7)
    if (month && row.spend) {
      spendByMonth[month] = parseFloat(row.spend)
    }
  }

  return spendByMonth
}

function getCacheFileName(clinicId: string): string {
  // Map common short names to existing cache file names
  if (clinicId === 'apex-pain-solutions' || clinicId === 'apex') return 'apex-analytics-cache.json'
  return `${clinicId}-analytics-cache.json`
}

async function refreshClinic(clinic: any): Promise<{ clinic: string; status: string; error?: string }> {
  if (!clinic.ghl_api_key || !clinic.ghl_location_id) {
    return { clinic: clinic.clinic_id, status: 'skipped', error: 'Missing GHL API key or location ID' }
  }

  try {
    const tagMapping = clinic.tag_mapping as Record<string, string>
    const tags = Object.values(tagMapping)

    const contacts = await fetchAllContacts(clinic.ghl_api_key, clinic.ghl_location_id)
    const tagCounts = countByTagAndMonth(contacts, tags)

    // Fetch ad spend from Meta if credentials are available
    let adSpendByMonth: Record<string, number> = {}
    if (clinic.meta_ad_account_id && clinic.meta_access_token) {
      try {
        adSpendByMonth = await fetchMetaAdSpend(clinic.meta_ad_account_id, clinic.meta_access_token)
        console.log(`[CRON] ${clinic.clinic_id}: Fetched Meta ad spend for ${Object.keys(adSpendByMonth).length} months`)
      } catch (err) {
        console.error(`[CRON] ${clinic.clinic_id}: Failed to fetch Meta ad spend:`, err)
      }
    }

    // Read existing cache
    const cacheFile = getCacheFileName(clinic.clinic_id)
    const cachePath = path.join(process.cwd(), 'public', 'data', cacheFile)
    let cacheData: any = { lastUpdated: 0, locationId: clinic.ghl_location_id, clinicName: clinic.clinic_name, metrics: [] }

    if (fs.existsSync(cachePath)) {
      cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
    }

    // Update metrics for each month that has data from GHL
    for (const [month, counts] of Object.entries(tagCounts)) {
      // Use Meta ad spend if available, otherwise preserve existing
      const existingIndex = cacheData.metrics.findIndex((m: any) => m.month === month)
      const existingAdSpend = existingIndex >= 0 ? cacheData.metrics[existingIndex].adSpend || 0 : 0
      const adSpend = adSpendByMonth[month] ?? existingAdSpend

      const monthMetrics = {
        month,
        leads: counts[tagMapping.leads] || 0,
        phoneConsults: counts[tagMapping.phoneConsults] || 0,
        phoneConsultShows: counts[tagMapping.phoneConsultShows] || 0,
        phoneConsultNoShows: counts[tagMapping.phoneConsultNoShows] || 0,
        exams: counts[tagMapping.exams] || 0,
        commits: counts[tagMapping.commits] || 0,
        selfScheduled: counts[tagMapping.selfScheduled] || 0,
        adSpend
      }

      if (existingIndex >= 0) {
        cacheData.metrics[existingIndex] = monthMetrics
      } else {
        cacheData.metrics.push(monthMetrics)
      }
    }

    // Sort metrics by month
    cacheData.metrics.sort((a: any, b: any) => a.month.localeCompare(b.month))
    cacheData.lastUpdated = Date.now()

    fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2))

    return { clinic: clinic.clinic_id, status: 'updated' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[CRON] Error refreshing ${clinic.clinic_id}:`, message)
    return { clinic: clinic.clinic_id, status: 'error', error: message }
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret if configured
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Fetch active clinic configs from Supabase
  const { data: clinics, error } = await supabase
    .from('clinic_settings')
    .select('*')
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!clinics || clinics.length === 0) {
    return NextResponse.json({ message: 'No active clinics configured' })
  }

  const results = []

  for (const clinic of clinics) {
    const result = await refreshClinic(clinic)
    results.push(result)
    console.log(`[CRON] ${clinic.clinic_id}: ${result.status}${result.error ? ` (${result.error})` : ''}`)
  }

  return NextResponse.json({
    refreshed_at: new Date().toISOString(),
    results
  })
}
