'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import api from '@/lib/api'

interface Prospect {
  _id: string
  businessName: string
  category: string
  city: string
  phone?: string
  opportunityScore: number
  status: string
}

const STAGES = [
  { value: 'not_contacted',     label: 'Not Contacted',     color: 'bg-gray-100',   badge: 'bg-gray-100 text-gray-700',    border: 'border-gray-200' },
  { value: 'contacted',         label: 'Contacted',         color: 'bg-blue-50',    badge: 'bg-blue-100 text-blue-700',    border: 'border-blue-200' },
  { value: 'interested',        label: 'Interested',        color: 'bg-amber-50',   badge: 'bg-amber-100 text-amber-700',  border: 'border-amber-200' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled', color: 'bg-purple-50',  badge: 'bg-purple-100 text-purple-700',border: 'border-purple-200' },
  { value: 'proposal_sent',     label: 'Proposal Sent',     color: 'bg-orange-50',  badge: 'bg-orange-100 text-orange-700',border: 'border-orange-200' },
  { value: 'client_won',        label: 'Client Won',        color: 'bg-green-50',   badge: 'bg-green-100 text-green-700',  border: 'border-green-200' },
]

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant', clinic: 'Clinic', dentist: 'Dentist',
  gym: 'Gym', school: 'School', real_estate: 'Real Estate',
  salon: 'Salon', other: 'Other',
}

function scoreClass(score: number) {
  if (score >= 70) return 'bg-green-100 text-green-700'
  if (score >= 40) return 'bg-amber-100 text-amber-700'
  return 'bg-gray-100 text-gray-600'
}

function ProspectCard({
  prospect,
  onStatusChange,
}: {
  prospect: Prospect
  onStatusChange: (id: string, status: string) => void
}) {
  const [saving, setSaving] = useState(false)

  async function handleMove(newStatus: string) {
    setSaving(true)
    try {
      await api.patch(`/api/prospects/${prospect._id}/status`, { status: newStatus })
      onStatusChange(prospect._id, newStatus)
    } finally {
      setSaving(false)
    }
  }

  const nextStages = STAGES.filter((s) => s.value !== prospect.status)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-semibold text-gray-800 leading-tight">{prospect.businessName}</span>
        <span className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full ${scoreClass(prospect.opportunityScore)}`}>
          {prospect.opportunityScore}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
          {CATEGORY_LABELS[prospect.category] ?? prospect.category}
        </span>
        <span className="text-xs text-gray-400">{prospect.city}</span>
      </div>

      {prospect.phone && (
        <a
          href={`tel:${prospect.phone}`}
          className="block text-xs text-brand-600 hover:underline"
        >
          {prospect.phone}
        </a>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Link
          href={`/dashboard/prospects/${prospect._id}`}
          className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50 transition-colors"
        >
          View
        </Link>
        <select
          disabled={saving}
          value=""
          onChange={(e) => { if (e.target.value) handleMove(e.target.value) }}
          className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60 flex-1 cursor-pointer"
        >
          <option value="" disabled>Move to →</option>
          {nextStages.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function PipelineBoard() {
  const searchParams = useSearchParams()
  const highlightStatus = searchParams.get('status')
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const [grouped, setGrouped] = useState<Record<string, Prospect[]>>({})
  const [allProspects, setAllProspects] = useState<Prospect[]>([])
  const [search, setSearch]   = useState('')
  const [cityFilter, setCityFilter]     = useState('')
  const [catFilter, setCatFilter]       = useState('')
  const [scoreFilter, setScoreFilter]   = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api.get('/api/prospects?groupBy=status&limit=500')
      .then(({ data }) => {
        setGrouped(data.grouped)
        const all: Prospect[] = Object.values(data.grouped).flat() as Prospect[]
        setAllProspects(all)
      })
      .catch(() => setError('Failed to load pipeline'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (highlightStatus && columnRefs.current[highlightStatus]) {
      columnRefs.current[highlightStatus]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [highlightStatus, loading])

  function handleStatusChange(id: string, newStatus: string) {
    setGrouped((prev) => {
      const next = { ...prev }
      let moved: Prospect | undefined
      for (const key of Object.keys(next)) {
        const idx = next[key].findIndex((p) => p._id === id)
        if (idx !== -1) {
          moved = next[key][idx]
          next[key] = next[key].filter((_, i) => i !== idx)
          break
        }
      }
      if (moved) {
        next[newStatus] = [{ ...moved, status: newStatus }, ...(next[newStatus] ?? [])]
      }
      return next
    })
  }

  const cities = [...new Set(allProspects.map((p) => p.city))].sort()
  const categories = [...new Set(allProspects.map((p) => p.category))].sort()

  function filterProspects(list: Prospect[]) {
    return list.filter((p) => {
      if (search && !p.businessName.toLowerCase().includes(search.toLowerCase())) return false
      if (cityFilter && p.city !== cityFilter) return false
      if (catFilter && p.category !== catFilter) return false
      if (scoreFilter === 'high'   && p.opportunityScore < 70)   return false
      if (scoreFilter === 'medium' && (p.opportunityScore < 40 || p.opportunityScore >= 70)) return false
      if (scoreFilter === 'low'    && p.opportunityScore >= 40)   return false
      return true
    })
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (loading) {
    return <div className="py-20 text-center text-sm text-gray-400">Loading…</div>
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search business…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 w-48"
        />
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Cities</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
          ))}
        </select>
        <select
          value={scoreFilter}
          onChange={(e) => setScoreFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Scores</option>
          <option value="high">High (70+)</option>
          <option value="medium">Medium (40–69)</option>
          <option value="low">Low (0–39)</option>
        </select>
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {STAGES.map((stage) => {
            const cards = filterProspects(grouped[stage.value] ?? [])
            const isHighlighted = highlightStatus === stage.value
            return (
              <div
                key={stage.value}
                ref={(el) => { columnRefs.current[stage.value] = el }}
                className={`w-64 flex flex-col rounded-xl border-2 transition-all ${
                  isHighlighted ? stage.border + ' ring-2 ring-offset-1 ring-brand-400' : 'border-gray-200'
                }`}
              >
                {/* Column header */}
                <div className={`px-3 py-2.5 rounded-t-xl ${stage.color} flex items-center justify-between`}>
                  <span className="text-xs font-semibold text-gray-700">{stage.label}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stage.badge}`}>
                    {cards.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)] p-2 space-y-2 bg-gray-50 rounded-b-xl">
                  {cards.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No prospects here yet</p>
                  ) : (
                    cards.map((p) => (
                      <ProspectCard
                        key={p._id}
                        prospect={p}
                        onStatusChange={handleStatusChange}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default function PipelinePage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Outreach Pipeline</h2>
        <p className="mt-1 text-sm text-gray-500">Track your outreach across all prospects</p>
      </div>
      <Suspense fallback={<div className="py-20 text-center text-sm text-gray-400">Loading…</div>}>
        <PipelineBoard />
      </Suspense>
    </div>
  )
}
