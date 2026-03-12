'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface ClinicSetting {
  id: string
  clinic_id: string
  clinic_name: string
  ghl_api_key: string | null
  ghl_location_id: string | null
  meta_ad_account_id: string | null
  meta_access_token: string | null
  tag_mapping: Record<string, string>
  is_active: boolean
  updated_at: string
}

const DEFAULT_TAG_MAPPING: Record<string, string> = {
  leads: 'quiz-lead',
  phoneConsults: 'consult-booked',
  phoneConsultShows: 'consult-completed',
  phoneConsultNoShows: 'consult-no-show',
  exams: 'exam-booked',
  commits: 'pre-paid',
  selfScheduled: 'consult-self-scheduled',
}

export default function ClinicSettingsPage() {
  const [clinics, setClinics] = useState<ClinicSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  const [form, setForm] = useState({
    clinic_id: '',
    clinic_name: '',
    ghl_api_key: '',
    ghl_location_id: '',
    meta_ad_account_id: '',
    meta_access_token: '',
    tag_mapping: { ...DEFAULT_TAG_MAPPING },
    is_active: true,
  })

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = '/login'
      } else {
        setAuthenticated(true)
        fetchClinics()
      }
    })
  }, [])

  async function fetchClinics() {
    setLoading(true)
    const res = await fetch('/api/admin/clinics')
    const data = await res.json()
    if (Array.isArray(data)) setClinics(data)
    setLoading(false)
  }

  function startEdit(clinic: ClinicSetting) {
    setEditingId(clinic.id)
    setShowAdd(false)
    setForm({
      clinic_id: clinic.clinic_id,
      clinic_name: clinic.clinic_name,
      ghl_api_key: '',
      ghl_location_id: clinic.ghl_location_id || '',
      meta_ad_account_id: clinic.meta_ad_account_id || '',
      meta_access_token: '',
      tag_mapping: clinic.tag_mapping || { ...DEFAULT_TAG_MAPPING },
      is_active: clinic.is_active,
    })
    setMessage('')
  }

  function startAdd() {
    setEditingId(null)
    setShowAdd(true)
    setForm({
      clinic_id: '',
      clinic_name: '',
      ghl_api_key: '',
      ghl_location_id: '',
      meta_ad_account_id: '',
      meta_access_token: '',
      tag_mapping: { ...DEFAULT_TAG_MAPPING },
      is_active: true,
    })
    setMessage('')
  }

  function cancel() {
    setEditingId(null)
    setShowAdd(false)
    setMessage('')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const res = await fetch('/api/admin/clinics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      setMessage('Saved!')
      setEditingId(null)
      setShowAdd(false)
      await fetchClinics()
    } else {
      const err = await res.json()
      setMessage(`Error: ${err.error}`)
    }
    setSaving(false)
  }

  async function handleDelete(clinicId: string) {
    if (!confirm(`Delete clinic "${clinicId}"?`)) return

    const res = await fetch(`/api/admin/clinics?clinic_id=${clinicId}`, { method: 'DELETE' })
    if (res.ok) {
      await fetchClinics()
      setMessage('Deleted.')
    }
  }

  if (!authenticated) return null

  const styles = {
    page: { maxWidth: 900, margin: '0 auto', padding: '40px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', color: '#e0e6ed' } as const,
    card: { background: '#1a1f3a', borderRadius: 12, border: '1px solid #334155', padding: 24, marginBottom: 16 } as const,
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 } as const,
    btn: { padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 } as const,
    btnOutline: { padding: '8px 16px', background: 'transparent', color: '#e0e6ed', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 13 } as const,
    btnDanger: { padding: '8px 16px', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, cursor: 'pointer', fontSize: 13 } as const,
    input: { width: '100%', padding: 10, border: '1px solid #334155', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' as const, background: '#0a0e27', color: '#e0e6ed' } as const,
    label: { display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600, color: '#94a3b8' } as const,
    field: { marginBottom: 16 } as const,
    badge: (active: boolean) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12, background: active ? 'rgba(16,185,129,0.15)' : '#334155', color: active ? '#10b981' : '#94a3b8' }) as const,
    hint: { fontSize: 12, color: '#64748b', marginTop: 4 } as const,
    row: { display: 'flex', gap: 12 } as const,
  }

  return (
    <div style={styles.page}>
      <div style={{ marginBottom: 16 }}>
        <a href="/clinic-cards.html" style={{ fontSize: 14, color: '#94a3b8', textDecoration: 'none' }}>&larr; Back to Directory</a>
      </div>
      <div style={styles.header}>
        <h1 style={{ margin: 0, fontSize: 24, color: '#fff' }}>Clinic Settings</h1>
        {!showAdd && !editingId && (
          <button style={styles.btn} onClick={startAdd}>Add Clinic</button>
        )}
      </div>

      {message && (
        <div style={{ padding: 12, marginBottom: 16, background: message.startsWith('Error') ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', borderRadius: 6, fontSize: 14, color: message.startsWith('Error') ? '#f87171' : '#10b981', border: `1px solid ${message.startsWith('Error') ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
          {message}
        </div>
      )}

      {(showAdd || editingId) && (
        <div style={styles.card}>
          <h2 style={{ margin: '0 0 20px', fontSize: 18, color: '#fff' }}>{showAdd ? 'Add Clinic' : 'Edit Clinic'}</h2>
          <form onSubmit={handleSave}>
            <div style={styles.row}>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>Clinic ID</label>
                <input
                  style={styles.input}
                  value={form.clinic_id}
                  onChange={e => setForm({ ...form, clinic_id: e.target.value })}
                  placeholder="apex-pain-solutions"
                  required
                  disabled={!!editingId}
                />
                <div style={styles.hint}>URL-safe identifier (cannot change after creation)</div>
              </div>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>Clinic Name</label>
                <input
                  style={styles.input}
                  value={form.clinic_name}
                  onChange={e => setForm({ ...form, clinic_name: e.target.value })}
                  placeholder="Apex Pain Solutions"
                  required
                />
              </div>
            </div>

            <div style={styles.row}>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>GHL API Key</label>
                <input
                  style={styles.input}
                  type="password"
                  value={form.ghl_api_key}
                  onChange={e => setForm({ ...form, ghl_api_key: e.target.value })}
                  placeholder={editingId ? 'Leave blank to keep existing' : 'eyJhbGci...'}
                />
              </div>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>GHL Location ID</label>
                <input
                  style={styles.input}
                  value={form.ghl_location_id}
                  onChange={e => setForm({ ...form, ghl_location_id: e.target.value })}
                  placeholder="o9ApBFHMmBmZQYAeTByK"
                />
              </div>
            </div>

            <div style={styles.row}>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>Meta Ad Account ID</label>
                <input
                  style={styles.input}
                  value={form.meta_ad_account_id}
                  onChange={e => setForm({ ...form, meta_ad_account_id: e.target.value })}
                  placeholder="act_123456789"
                />
              </div>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>Meta Access Token</label>
                <input
                  style={styles.input}
                  type="password"
                  value={form.meta_access_token}
                  onChange={e => setForm({ ...form, meta_access_token: e.target.value })}
                  placeholder={editingId ? 'Leave blank to keep existing' : 'EAABs...'}
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Tag Mapping (GHL tag names)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {Object.entries(form.tag_mapping).map(([metric, tag]) => (
                  <div key={metric} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#94a3b8', width: 140, flexShrink: 0 }}>{metric}</span>
                    <input
                      style={{ ...styles.input, padding: 6, fontSize: 13 }}
                      value={tag}
                      onChange={e => setForm({
                        ...form,
                        tag_mapping: { ...form.tag_mapping, [metric]: e.target.value }
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...styles.field, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm({ ...form, is_active: e.target.checked })}
                id="is_active"
              />
              <label htmlFor="is_active" style={{ fontSize: 14, color: '#e0e6ed' }}>Active (include in daily refresh)</label>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" style={styles.btn} disabled={saving}>
                {saving ? 'Saving...' : 'Save Clinic'}
              </button>
              <button type="button" style={styles.btnOutline} onClick={cancel}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading...</p>
      ) : clinics.length === 0 ? (
        <div style={styles.card}>
          <p style={{ color: '#64748b', textAlign: 'center' }}>No clinics configured yet. Add one to get started.</p>
        </div>
      ) : (
        clinics.map(clinic => (
          <div key={clinic.id} style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 18, color: '#fff' }}>
                  {clinic.clinic_name} <span style={styles.badge(clinic.is_active)}>{clinic.is_active ? 'Active' : 'Inactive'}</span>
                </h3>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>{clinic.clinic_id}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={styles.btnOutline} onClick={() => startEdit(clinic)}>Edit</button>
                <button style={styles.btnDanger} onClick={() => handleDelete(clinic.clinic_id)}>Delete</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 14, color: '#94a3b8' }}>
              <div><strong>GHL Location:</strong> {clinic.ghl_location_id || <span style={{ color: '#475569' }}>Not set</span>}</div>
              <div><strong>GHL API Key:</strong> {clinic.ghl_api_key || <span style={{ color: '#475569' }}>Not set</span>}</div>
              <div><strong>Meta Ad Account:</strong> {clinic.meta_ad_account_id || <span style={{ color: '#475569' }}>Not set</span>}</div>
              <div><strong>Meta Token:</strong> {clinic.meta_access_token || <span style={{ color: '#475569' }}>Not set</span>}</div>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: '#475569' }}>
              Last updated: {new Date(clinic.updated_at).toLocaleString()}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
