import { NextRequest, NextResponse } from 'next/server'
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

interface ClinicConfig {
  clinicId: string
  clinicName: string
  locationId: string
  apiKeyEnv: string
  cacheFile: string
  tags: string[]
  tagMapping: Record<string, string>
}

const CLINICS: ClinicConfig[] = [
  {
    clinicId: 'apex-pain-solutions',
    clinicName: 'Apex Pain Solutions',
    locationId: 'o9ApBFHMmBmZQYAeTByK',
    apiKeyEnv: 'GHL_APEX_API_KEY',
    cacheFile: 'apex-analytics-cache.json',
    tags: [
      'quiz-lead', 'consult-booked', 'consult-confirmed', 'consult-self-scheduled',
      'consult-no-show', 'consult-completed', 'exam-booked', 'pre-paid',
      'new-patient', 'neuropathy'
    ],
    tagMapping: {
      leads: 'quiz-lead',
      phoneConsults: 'consult-booked',
      phoneConsultShows: 'consult-completed',
      phoneConsultNoShows: 'consult-no-show',
      exams: 'exam-booked',
      commits: 'pre-paid',
      selfScheduled: 'consult-self-scheduled',
    }
  }
  // Add more clinics here when API keys are available
]

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

async function refreshClinic(clinic: ClinicConfig): Promise<{ clinic: string; status: string; error?: string }> {
  const apiKey = process.env[clinic.apiKeyEnv]
  if (!apiKey) {
    return { clinic: clinic.clinicId, status: 'skipped', error: `${clinic.apiKeyEnv} not set` }
  }

  try {
    const contacts = await fetchAllContacts(apiKey, clinic.locationId)
    const tagCounts = countByTagAndMonth(contacts, clinic.tags)

    // Read existing cache
    const cachePath = path.join(process.cwd(), 'public', 'data', clinic.cacheFile)
    let cacheData: any = { lastUpdated: 0, locationId: clinic.locationId, clinicName: clinic.clinicName, metrics: [] }

    if (fs.existsSync(cachePath)) {
      cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
    }

    // Update metrics for each month that has data from GHL
    for (const [month, counts] of Object.entries(tagCounts)) {
      const monthMetrics = {
        month,
        leads: counts[clinic.tagMapping.leads] || 0,
        phoneConsults: counts[clinic.tagMapping.phoneConsults] || 0,
        phoneConsultShows: counts[clinic.tagMapping.phoneConsultShows] || 0,
        phoneConsultNoShows: counts[clinic.tagMapping.phoneConsultNoShows] || 0,
        exams: counts[clinic.tagMapping.exams] || 0,
        commits: counts[clinic.tagMapping.commits] || 0,
        selfScheduled: counts[clinic.tagMapping.selfScheduled] || 0,
        adSpend: 0
      }

      const existingIndex = cacheData.metrics.findIndex((m: any) => m.month === month)
      if (existingIndex >= 0) {
        // Preserve existing adSpend
        monthMetrics.adSpend = cacheData.metrics[existingIndex].adSpend || 0
        cacheData.metrics[existingIndex] = monthMetrics
      } else {
        cacheData.metrics.push(monthMetrics)
      }
    }

    // Sort metrics by month
    cacheData.metrics.sort((a: any, b: any) => a.month.localeCompare(b.month))
    cacheData.lastUpdated = Date.now()

    fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2))

    return { clinic: clinic.clinicId, status: 'updated' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[CRON] Error refreshing ${clinic.clinicId}:`, message)
    return { clinic: clinic.clinicId, status: 'error', error: message }
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret if configured
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = []

  for (const clinic of CLINICS) {
    const result = await refreshClinic(clinic)
    results.push(result)
    console.log(`[CRON] ${clinic.clinicId}: ${result.status}${result.error ? ` (${result.error})` : ''}`)
  }

  return NextResponse.json({
    refreshed_at: new Date().toISOString(),
    results
  })
}
