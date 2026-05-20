'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import LeadStatusSelect, { type LeadStatus } from '@/components/leads/LeadStatusSelect'
import ActivityTimeline from '@/components/leads/ActivityTimeline'

interface Lead {
  _id: string
  email: string
  fullName?: string | null
  phone?: string | null
  score: number
  status: LeadStatus
  source?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmTerm?: string | null
  utmContent?: string | null
  createdAt: string
}

const STATUS_CLASSES: Record<string, string> = {
  new:       'bg-brand-100   text-brand-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-purple-100 text-purple-700',
  converted: 'bg-green-100  text-green-700',
  lost:      'bg-red-100    text-red-700',
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-gray-800 break-words">{value ?? <span className="text-gray-400">—</span>}</dd>
    </div>
  )
}

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [lead, setLead]       = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.get(`/api/leads/${id}`)
      .then(({ data }) => {
        if (!cancelled) setLead(data.data)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load lead')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
  }

  if (error || !lead) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        {error ?? 'Lead not found'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            href="/dashboard/leads"
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            ← Back to leads
          </Link>
          <h2 className="text-xl font-semibold text-gray-800">
            {lead.fullName ?? lead.email}
          </h2>
          <p className="text-sm text-gray-500">{lead.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
              STATUS_CLASSES[lead.status] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {lead.status}
          </span>
          <LeadStatusSelect
            leadId={lead._id}
            initialStatus={lead.status}
            onChange={(status) => setLead((l) => (l ? { ...l, status } : l))}
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
          <Field label="Email" value={lead.email} />
          <Field label="Full Name" value={lead.fullName} />
          <Field label="Phone" value={lead.phone} />
          <Field
            label="Score"
            value={<span className="tabular-nums">{lead.score} / 100</span>}
          />
          <Field
            label="Status"
            value={<span className="capitalize">{lead.status}</span>}
          />
          <Field label="Source" value={lead.source} />
          <Field label="UTM Source"   value={lead.utmSource} />
          <Field label="UTM Medium"   value={lead.utmMedium} />
          <Field label="UTM Campaign" value={lead.utmCampaign} />
          <Field label="UTM Term"     value={lead.utmTerm} />
          <Field label="UTM Content"  value={lead.utmContent} />
          <Field
            label="Created"
            value={new Date(lead.createdAt).toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          />
        </dl>
      </div>

      <ActivityTimeline leadId={lead._id} />
    </div>
  )
}
