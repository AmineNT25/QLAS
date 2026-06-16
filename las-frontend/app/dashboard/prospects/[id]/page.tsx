'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

const STATUSES = [
  { value: 'not_contacted',     label: 'Not Contacted',     color: 'bg-gray-100 text-gray-700'    },
  { value: 'contacted',         label: 'Contacted',         color: 'bg-blue-100 text-blue-700'    },
  { value: 'interested',        label: 'Interested',        color: 'bg-amber-100 text-amber-700'  },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled', color: 'bg-purple-100 text-purple-700'},
  { value: 'proposal_sent',     label: 'Proposal Sent',     color: 'bg-orange-100 text-orange-700'},
  { value: 'client_won',        label: 'Client Won',        color: 'bg-green-100 text-green-700'  },
]

const CATEGORY_LABELS: Record<string, string> = {
  restaurant:  'Restaurant',
  clinic:      'Clinic',
  dentist:     'Dentist',
  gym:         'Gym',
  school:      'School',
  real_estate: 'Real Estate',
  salon:       'Salon',
  other:       'Other',
}

const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.value, s]))

function scoreColor(score: number) {
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-red-500'
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-gray-800 break-words">{value ?? <span className="text-gray-400">—</span>}</dd>
    </div>
  )
}

interface Prospect {
  _id: string
  businessName: string
  category: string
  city: string
  address?: string
  phone?: string
  whatsapp?: string
  website?: string
  googleMapsUrl?: string
  rating?: number
  reviewCount?: number
  opportunityScore: number
  status: string
  noWebsite: boolean
  notes?: string
  source: string
  createdAt: string
}

export default function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [prospect, setProspect] = useState<Prospect | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.get(`/api/prospects/${id}`)
      .then(({ data }) => { if (!cancelled) setProspect(data.data) })
      .catch(() => { if (!cancelled) setError('Failed to load prospect') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  async function handleStatusChange(newStatus: string) {
    if (!prospect) return
    setSaving(true)
    try {
      const { data } = await api.patch(`/api/prospects/${id}/status`, { status: newStatus })
      setProspect(data.data)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="py-16 text-center text-sm text-gray-400">Loading…</div>

  if (error || !prospect) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        {error ?? 'Prospect not found'}
      </div>
    )
  }

  const statusMeta = STATUS_MAP[prospect.status]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link href="/dashboard/prospects" className="text-xs text-gray-500 hover:text-gray-700">
            ← Back to prospects
          </Link>
          <h2 className="text-xl font-semibold text-gray-800">{prospect.businessName}</h2>
          <p className="text-sm text-gray-500">
            {CATEGORY_LABELS[prospect.category] ?? prospect.category} · {prospect.city}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusMeta?.color ?? 'bg-gray-100 text-gray-600'}`}>
            {statusMeta?.label ?? prospect.status}
          </span>
          <select
            value={prospect.status}
            disabled={saving}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Opportunity Score */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 flex items-center gap-6">
        <div className="text-center">
          <div className={`text-4xl font-bold tabular-nums ${scoreColor(prospect.opportunityScore)}`}>
            {prospect.opportunityScore}
          </div>
          <div className="text-xs text-gray-500 mt-1">Opportunity Score</div>
        </div>
        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              prospect.opportunityScore >= 70 ? 'bg-green-500' :
              prospect.opportunityScore >= 40 ? 'bg-amber-400' : 'bg-red-400'
            }`}
            style={{ width: `${prospect.opportunityScore}%` }}
          />
        </div>
        <div className="text-xs text-gray-500">/ 100</div>
      </div>

      {/* Details */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
          <Field label="Business Name" value={prospect.businessName} />
          <Field label="Category"      value={CATEGORY_LABELS[prospect.category] ?? prospect.category} />
          <Field label="City"          value={prospect.city} />
          <Field label="Address"       value={prospect.address} />
          <Field label="Phone"         value={prospect.phone
            ? <a href={`tel:${prospect.phone}`} className="text-brand-600 hover:underline">{prospect.phone}</a>
            : null}
          />
          <Field label="WhatsApp"      value={prospect.whatsapp
            ? <a href={`https://wa.me/${prospect.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">{prospect.whatsapp}</a>
            : null}
          />
          <Field label="Website"       value={prospect.website
            ? <a href={prospect.website} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline truncate block max-w-xs">{prospect.website}</a>
            : <span className="text-gray-400">No website</span>}
          />
          <Field label="Google Maps"   value={prospect.googleMapsUrl
            ? <a href={prospect.googleMapsUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">Open in Maps</a>
            : null}
          />
          <Field label="Rating"        value={prospect.rating != null ? `${prospect.rating} ★` : null} />
          <Field label="Reviews"       value={prospect.reviewCount != null ? prospect.reviewCount.toLocaleString() : null} />
          <Field label="Source"        value={<span className="capitalize">{prospect.source}</span>} />
          <Field label="Added"         value={new Date(prospect.createdAt).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })} />
        </dl>

        {prospect.notes && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Notes</dt>
            <dd className="text-sm text-gray-800 whitespace-pre-wrap">{prospect.notes}</dd>
          </div>
        )}
      </div>
    </div>
  )
}
