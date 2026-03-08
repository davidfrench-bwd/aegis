'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

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
  campaign_name_filter: string
  ad_set_status_filter: string
}

interface Execution {
  id: string
  status: string
  reason: string
  created_at: string
  old_budget?: number
  new_budget?: number
}

export default function ApexAutomationPage() {
  const [user, setUser] = useState<any>(null)
  const [rule, setRule] = useState<Rule | null>(null)
  const [executions, setExecutions] = useState<Execution[]>([])
  const [loading, setLoading] = useState(true)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      window.location.href = '/login'
      return
    }
    
    setUser(user)
    loadRule()
    loadExecutions()
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
      }
    } catch (error) {
      console.error('Failed to load executions:', error)
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
        alert('Rule saved successfully!')
      } else {
        const error = await response.json()
        alert(`Save failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save rule')
    }
  }

  async function runDryRun() {
    try {
      const response = await fetch('/api/apex/rules/quiz-lead-boost/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adSetId: 'test-ad-set',
          currentBudget: 100
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Dry Run Result: ${result.reason}`)
        loadExecutions()
      } else {
        const error = await response.json()
        alert(`Dry run failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Dry run error:', error)
      alert('Failed to run dry run')
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Apex Pain Solutions — Automation Rules</h1>
        <button onClick={signOut}>Sign Out</button>
      </div>

      {rule && (
        <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h2>{rule.name}</h2>
          
          <div style={{ marginBottom: '10px' }}>
            <label>
              <input
                type="checkbox"
                checked={rule.is_active}
                onChange={(e) => setRule({ ...rule, is_active: e.target.checked })}
              />
              {' '}Active
            </label>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>
              Threshold: 
              <input
                type="number"
                value={rule.threshold}
                onChange={(e) => setRule({ ...rule, threshold: parseInt(e.target.value) })}
                style={{ marginLeft: '10px', width: '100px' }}
              />
            </label>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>
              Budget Increase %: 
              <input
                type="number"
                value={rule.percentage_change}
                onChange={(e) => setRule({ ...rule, percentage_change: parseFloat(e.target.value) })}
                style={{ marginLeft: '10px', width: '100px' }}
              />
            </label>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>
              Max Daily Budget: 
              <input
                type="number"
                value={rule.max_daily_budget}
                onChange={(e) => setRule({ ...rule, max_daily_budget: parseFloat(e.target.value) })}
                style={{ marginLeft: '10px', width: '100px' }}
              />
            </label>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button onClick={saveRule} style={{ marginRight: '10px' }}>Save Changes</button>
            <button onClick={runDryRun} style={{ marginRight: '10px' }}>Test Rule (Dry Run)</button>
            <button onClick={loadExecutions}>Refresh Logs</button>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px' }}>
        <h3>Recent Executions</h3>
        {executions.length === 0 ? (
          <p>No executions yet</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Time</th>
                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((exec) => (
                <tr key={exec.id}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                    {new Date(exec.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: exec.status === 'success' ? '#d4edda' : exec.status === 'error' ? '#f8d7da' : '#fff3cd'
                    }}>
                      {exec.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{exec.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}