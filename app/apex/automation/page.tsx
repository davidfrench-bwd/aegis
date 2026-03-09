'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface Rule {
  id: string
  clinic_id: string
  name: string
  is_active: boolean
  trigger_type: string
  threshold: number
  time_window_hours: number
  scope: string
  action_type: string
  percentage_change: number
  max_daily_budget: number
  frequency_limit: string
  campaign_id?: string
  campaign_name_filter?: string
  ad_set_status_filter: string
}

interface Execution {
  id: string
  status: string
  reason: string
  created_at: string
  ad_set_name?: string
  old_budget?: number
  new_budget?: number
}

interface MonitoredAdSet {
  id: string
  name: string
  campaign_name: string
  status: string
  current_budget_usd: number
  lead_count_today?: number
  lead_count_lifetime?: number
  date_range_start?: string
  date_range_end?: string
}

interface MonitoringData {
  ad_sets: MonitoredAdSet[]
  summary: {
    total_monitored: number
    total_budget_usd: number
  }
}

export default function ApexAutomationPage() {
  const [user, setUser] = useState<any>(null)
  const [rule, setRule] = useState<Rule | null>(null)
  const [executions, setExecutions] = useState<Execution[]>([])
  const [monitoring, setMonitoring] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMonitoring, setLoadingMonitoring] = useState(false)
  const [runningRule, setRunningRule] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)
  const [supabase, setSupabase] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const client = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      setSupabase(client)
    }
  }, [])

  useEffect(() => {
    if (supabase) {
      checkUser()
    }
  }, [supabase])

  async function checkUser() {
    if (!supabase) return
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      window.location.href = '/login'
      return
    }
    
    setUser(user)
    loadRule()
    loadExecutions()
    loadMonitoredAdSets()
    loadLastRun()
  }

  async function loadRule() {
    try {
      const response = await fetch('/api/apex/rules/quiz-lead-boost')
      if (response.ok) {
        const data = await response.json()
        setRule(data)
      }
    } catch (error) {
      console.error('Failed to load rule:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadExecutions() {
    try {
      const response = await fetch('/api/apex/rules/quiz-lead-boost/executions?limit=20')
      if (response.ok) {
        const data = await response.json()
        setExecutions(data)
        
        // Set last run time from the most recent execution
        if (data && data.length > 0) {
          setLastRun(data[0].created_at)
        }
      }
    } catch (error) {
      console.error('Failed to load executions:', error)
    }
  }

  async function loadLastRun() {
    try {
      // Fetch the most recent execution (any status)
      const response = await fetch('/api/apex/rules/quiz-lead-boost/executions?limit=1&any_status=true')
      if (response.ok) {
        const data = await response.json()
        if (data && data.length > 0) {
          setLastRun(data[0].created_at)
        }
      }
    } catch (error) {
      console.error('Failed to load last run:', error)
    }
  }

  async function loadMonitoredAdSets() {
    setLoadingMonitoring(true)
    try {
      const response = await fetch('/api/apex/rules/quiz-lead-boost/monitored-adsets')
      const data = await response.json()
      
      console.log('Monitored ad sets response:', response.status, data)
      
      if (response.ok) {
        setMonitoring(data.monitoring)
      } else {
        console.error('Failed to load monitored ad sets:', data)
        alert(`Error: ${data.error || 'Failed to load ad sets'}`)
      }
    } catch (error) {
      console.error('Error loading monitored ad sets:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoadingMonitoring(false)
    }
  }

  async function saveRule() {
    if (!rule) return
    
    try {
      const response = await fetch('/api/apex/rules/quiz-lead-boost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule)
      })
      
      if (response.ok) {
        alert('Rule saved successfully')
        loadRule()
      } else {
        alert('Failed to save rule')
      }
    } catch (error) {
      console.error('Failed to save rule:', error)
      alert('Error saving rule')
    }
  }

  async function runRuleNow() {
    setRunningRule(true)
    try {
      const response = await fetch('/api/cron/evaluate-rules?force=true')
      const data = await response.json()
      
      if (response.ok) {
        const summary = data.results?.[0]
        if (summary) {
          alert(
            `Rule Evaluation Complete!\n\n` +
            `Ad Sets Checked: ${summary.ad_sets_checked}\n` +
            `Budgets Increased: ${summary.budgets_increased}\n` +
            `Total Budget Change: $${summary.total_budget_change.toFixed(2)}\n` +
            `Errors: ${summary.errors}`
          )
        } else {
          alert('Rule evaluation completed (no active rules)')
        }
        // Reload executions and last run time to show new results
        loadExecutions()
        loadLastRun()
      } else {
        alert(`Error: ${data.error || 'Failed to run rule'}`)
      }
    } catch (error) {
      console.error('Error running rule:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setRunningRule(false)
    }
  }

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut()
      window.location.href = '/login'
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Apex Pain Solutions — Automation Rules</h1>
        <button onClick={signOut} style={{
          padding: '8px 16px',
          background: '#666',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Sign Out
        </button>
      </div>

      {rule && (
        <div style={{ marginBottom: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
          <div style={{ marginBottom: '15px', padding: '10px', background: '#e3f2fd', borderRadius: '4px', fontSize: '14px' }}>
            <div style={{ marginBottom: '8px' }}>
              ℹ️ <strong>Automatic Evaluation:</strong> This rule runs every hour via Vercel Cron. It checks all monitored ad sets and increases budgets based on recent lead count.
            </div>
            {lastRun && (
              <div style={{ fontSize: '13px', color: '#1565c0' }}>
                🕐 <strong>Last Run:</strong> {new Date(lastRun).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </div>
            )}
          </div>
          <h2>{rule.name}</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Active</label>
              <input
                type="checkbox"
                checked={rule.is_active}
                onChange={(e) => setRule({ ...rule, is_active: e.target.checked })}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Percentage Change</label>
              <input
                type="number"
                value={rule.percentage_change}
                onChange={(e) => setRule({ ...rule, percentage_change: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Max Daily Budget ($)</label>
              <input
                type="number"
                value={rule.max_daily_budget / 100}
                onChange={(e) => setRule({ ...rule, max_daily_budget: Math.round(parseFloat(e.target.value) * 100) })}
                step="0.01"
                style={{ width: '100%', padding: '8px' }}
              />
              <small style={{ color: '#666' }}>Maximum daily budget per ad set in dollars</small>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Time Window</label>
              <select
                value={rule.time_window_hours}
                onChange={(e) => setRule({ ...rule, time_window_hours: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '8px' }}
              >
                <option value={24}>Today (last 24 hours)</option>
                <option value={168}>Last 7 Days</option>
                <option value={336}>Last 14 Days</option>
                <option value={720}>Last 30 Days</option>
              </select>
              <small style={{ color: '#666' }}>Meta date range for lead tracking</small>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Lead Threshold</label>
              <input
                type="number"
                value={rule.threshold}
                onChange={(e) => setRule({ ...rule, threshold: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '8px' }}
              />
              <small style={{ color: '#666' }}>Increase budget if ≥ this many leads</small>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Run Frequency</label>
              <select
                value={rule.frequency_limit}
                onChange={(e) => setRule({ ...rule, frequency_limit: e.target.value })}
                style={{ width: '100%', padding: '8px' }}
              >
                <option value="every_hour">Every Hour</option>
                <option value="every_2_hours">Every 2 Hours</option>
                <option value="every_4_hours">Every 4 Hours</option>
                <option value="every_6_hours">Every 6 Hours</option>
                <option value="every_12_hours">Every 12 Hours</option>
                <option value="once_daily">Once Daily (24 hours)</option>
              </select>
              <small style={{ color: '#666' }}>How often the automation runs (Vercel cron checks hourly)</small>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Campaign ID</label>
              <input
                type="text"
                value={rule.campaign_id || ''}
                onChange={(e) => setRule({ ...rule, campaign_id: e.target.value })}
                placeholder="e.g., 120212345678901234"
                style={{ width: '100%', padding: '8px' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button
              onClick={saveRule}
              style={{
                padding: '10px 20px',
                background: '#000',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Save Rule
            </button>

            <button
              onClick={runRuleNow}
              disabled={runningRule}
              style={{
                padding: '10px 20px',
                background: runningRule ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: runningRule ? 'not-allowed' : 'pointer'
              }}
            >
              {runningRule ? 'Running...' : '▶ Run Now'}
            </button>
          </div>
        </div>
      )}

      {/* Monitored Ad Sets Section */}
      <div style={{ marginBottom: '30px', padding: '20px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Monitored Ad Sets</h2>
          <button
            onClick={loadMonitoredAdSets}
            disabled={loadingMonitoring}
            style={{
              padding: '8px 16px',
              background: loadingMonitoring ? '#ccc' : '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loadingMonitoring ? 'not-allowed' : 'pointer'
            }}
          >
            {loadingMonitoring ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {monitoring ? (
          <>
            <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f8ff', borderRadius: '4px' }}>
              <strong>Total Ad Sets Monitored:</strong> {monitoring.summary.total_monitored}<br />
              <strong>Total Daily Budget:</strong> ${monitoring.summary.total_budget_usd.toFixed(2)}
            </div>

            {monitoring.ad_sets.length > 0 ? (
              <>
                {monitoring.ad_sets[0]?.date_range_start && (
                  <div style={{ marginBottom: '10px', fontSize: '13px', color: '#666' }}>
                    📅 Date Range: {monitoring.ad_sets[0].date_range_start} to {monitoring.ad_sets[0].date_range_end}
                  </div>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Ad Set Name</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Campaign</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Leads Today</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Leads (90d)</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Daily Budget</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monitoring.ad_sets.map((adSet) => (
                      <tr key={adSet.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>{adSet.name}</td>
                        <td style={{ padding: '10px' }}>{adSet.campaign_name}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '3px',
                            background: adSet.status === 'ACTIVE' ? '#d4edda' : '#f8d7da',
                            color: adSet.status === 'ACTIVE' ? '#155724' : '#721c24',
                            fontSize: '12px'
                          }}>
                            {adSet.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          <strong style={{ color: (adSet.lead_count_today || 0) > 0 ? '#28a745' : '#666' }}>
                            {adSet.lead_count_today || 0}
                          </strong>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', color: '#666' }}>
                          {adSet.lead_count_lifetime || 0}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          ${adSet.current_budget_usd.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No ad sets found matching the rule criteria.</p>
            )}
          </>
        ) : (
          <p style={{ color: '#666', fontStyle: 'italic' }}>Click "Refresh" to load monitored ad sets from Meta.</p>
        )}
      </div>

      {/* Recent Executions */}
      <div style={{ padding: '20px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Recent Budget Increases</h2>
        <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
          Ad sets where the rule triggered and budgets were increased
        </p>
        
        {executions.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Time</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Ad Set</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Reason</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Budget Change</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((exec) => (
                <tr key={exec.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>
                    {new Date(exec.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '10px', fontSize: '13px' }}>{exec.ad_set_name || '—'}</td>
                  <td style={{ padding: '10px' }}>{exec.status}</td>
                  <td style={{ padding: '10px' }}>{exec.reason}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    {exec.old_budget && exec.new_budget
                      ? `$${exec.old_budget} → $${exec.new_budget}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ marginTop: '15px', color: '#666', fontStyle: 'italic' }}>
            No budget increases yet. The rule will trigger when an ad set gets {rule?.threshold || 1}+ leads.
          </p>
        )}
      </div>
    </div>
  )
}
