'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

export interface Activity {
  _id: string
  type: string
  description?: string | null
  createdAt: string
}

const ACTIVITY_TYPES = ['note', 'call', 'email', 'meeting', 'status_change'] as const

function formatTimestamp(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TimelineItem({ activity }: { activity: Activity }) {
  return (
    <li className="relative pl-6 pb-4 border-l border-gray-200 last:border-l-transparent">
      <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-gray-800 capitalize">
          {activity.type.replace(/_/g, ' ')}
        </span>
        <time className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
          {formatTimestamp(activity.createdAt)}
        </time>
      </div>
      {activity.description && (
        <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
          {activity.description}
        </p>
      )}
    </li>
  )
}

export default function ActivityTimeline({ leadId }: { leadId: string }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const [type, setType]             = useState<string>('note')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.get(`/api/leads/${leadId}/activities`)
      .then(({ data }) => {
        if (!cancelled) setActivities(data.data)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load activity')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [leadId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!type.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const { data } = await api.post(`/api/leads/${leadId}/activities`, {
        type: type.trim(),
        description: description.trim() || undefined,
      })
      setActivities((prev) => [data.data, ...prev])
      setDescription('')
    } catch {
      setSubmitError('Could not log activity')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white p-4 space-y-3"
      >
        <p className="text-sm font-semibold text-gray-700">Log activity</p>
        <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center justify-between">
          {submitError ? (
            <span className="text-xs text-red-600">{submitError}</span>
          ) : <span />}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Add activity'}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Timeline</p>
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : activities.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No activity yet.</p>
        ) : (
          <ul className="space-y-0">
            {activities.map((a) => (
              <TimelineItem key={a._id} activity={a} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
