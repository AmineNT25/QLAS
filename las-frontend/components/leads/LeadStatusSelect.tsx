'use client'

import { useState } from 'react'
import api from '@/lib/api'

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const
export type LeadStatus = (typeof STATUSES)[number]

interface Props {
  leadId: string
  initialStatus: LeadStatus
  onChange?: (status: LeadStatus) => void
}

export default function LeadStatusSelect({ leadId, initialStatus, onChange }: Props) {
  const [status, setStatus] = useState<LeadStatus>(initialStatus)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function update(next: LeadStatus) {
    const prev = status
    setStatus(next)
    setSaving(true)
    setError(null)
    try {
      await api.patch(`/api/leads/${leadId}`, { status: next })
      onChange?.(next)
    } catch {
      setStatus(prev)
      setError('Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        disabled={saving}
        onChange={(e) => update(e.target.value as LeadStatus)}
        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </option>
        ))}
      </select>
      {saving && <span className="text-xs text-gray-400">Saving…</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
