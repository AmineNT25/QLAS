'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiscoveredProspect {
  _id: string
  businessName: string
  category: string
  city: string
  address?: string
  phone?: string
  website?: string
  googleMapsUrl?: string
  rating?: number
  reviewCount?: number
  opportunityScore: number
  noWebsite: boolean
  status: string
}

interface JobStatus {
  _id: string
  query: string
  city: string
  status: 'processing' | 'done' | 'failed'
  found: number
  saved: number
  skipped: number
  prospects: DiscoveredProspect[]
  error?: string
  duration?: number
  createdAt: string
}

interface HistoryEntry {
  _id: string
  query: string
  city: string
  status: string
  found: number
  saved: number
  skipped: number
  createdAt: string
  duration?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const [cls, tier] =
    score >= 70 ? ['bg-red-100 text-red-700',    'High']   :
    score >= 40 ? ['bg-amber-100 text-amber-700', 'Medium'] :
                  ['bg-gray-100 text-gray-600',   'Low']
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {score} · {tier}
    </span>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const label = category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return (
    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
      {label}
    </span>
  )
}

function StarRating({ rating, reviewCount }: { rating?: number; reviewCount?: number }) {
  if (rating == null) return <span className="text-xs text-gray-400">No rating</span>
  return (
    <span className="flex items-center gap-1 text-xs text-gray-600">
      <span className="text-amber-400">★</span>
      <span className="font-medium">{rating.toFixed(1)}</span>
      {reviewCount != null && <span className="text-gray-400">({reviewCount.toLocaleString()})</span>}
    </span>
  )
}

function BusinessCard({ prospect }: { prospect: DiscoveredProspect }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-snug truncate">
            {prospect.businessName}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <CategoryBadge category={prospect.category} />
            {prospect.noWebsite && (
              <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-medium">
                No Website
              </span>
            )}
          </div>
        </div>
        <ScoreBadge score={prospect.opportunityScore} />
      </div>

      {/* Rating */}
      <StarRating rating={prospect.rating} reviewCount={prospect.reviewCount} />

      {/* Address */}
      {prospect.address && (
        <p className="text-xs text-gray-500 leading-snug line-clamp-2">{prospect.address}</p>
      )}

      {/* Contact + actions */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 flex-wrap">
        <div className="flex items-center gap-3">
          {prospect.phone && (
            <a
              href={`tel:${prospect.phone}`}
              className="text-xs text-brand-600 hover:underline font-medium"
            >
              {prospect.phone}
            </a>
          )}
          {prospect.website && (
            <a
              href={prospect.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-brand-600 transition-colors"
              title="Website"
            >
              ↗ site
            </a>
          )}
          {prospect.googleMapsUrl && (
            <a
              href={prospect.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-brand-600 transition-colors"
              title="Google Maps"
            >
              📍 maps
            </a>
          )}
        </div>
        <Link
          href={`/dashboard/prospects?search=${encodeURIComponent(prospect.businessName)}`}
          className="px-3 py-1 text-xs rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors font-medium whitespace-nowrap"
        >
          View in Prospects
        </Link>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DiscoveryPage() {
  const [query,    setQuery]    = useState('')
  const [city,     setCity]     = useState('')
  const [jobId,    setJobId]    = useState<string | null>(null)
  const [job,      setJob]      = useState<JobStatus | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [elapsed,  setElapsed]  = useState(0)
  const [history,  setHistory]  = useState<HistoryEntry[]>([])

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAt  = useRef<number>(0)

  // Load history on mount
  useEffect(() => {
    api.get<{ history: HistoryEntry[] }>('/api/discovery/history')
      .then(({ data }) => setHistory(data.history))
      .catch(() => {})
  }, [])

  function stopPolling() {
    if (pollRef.current)  clearInterval(pollRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    pollRef.current  = null
    timerRef.current = null
  }

  function startElapsedTimer() {
    startedAt.current = Date.now()
    setElapsed(0)
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000))
    }, 1000)
  }

  function startPolling(id: string) {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get<JobStatus>(`/api/discovery/status/${id}`)
        setJob(data)
        if (data.status === 'done' || data.status === 'failed') {
          stopPolling()
          setLoading(false)
          // Refresh history
          api.get<{ history: HistoryEntry[] }>('/api/discovery/history')
            .then(({ data: h }) => setHistory(h.history))
            .catch(() => {})
        }
      } catch {
        // keep polling
      }
    }, 3000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim() || !city.trim()) return

    setError(null)
    setJob(null)
    setJobId(null)
    setLoading(true)
    stopPolling()
    startElapsedTimer()

    try {
      const { data } = await api.post<{ jobId: string; status: string }>('/api/discovery/scrape', {
        query: query.trim(),
        city:  city.trim(),
        limit: 20,
      })
      setJobId(data.jobId)
      startPolling(data.jobId)
    } catch (err: unknown) {
      stopPolling()
      setLoading(false)
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Scrape failed. Please try again.')
    }
  }

  const isProcessing = loading || (job?.status === 'processing')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Business Discovery</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Search Google Maps and auto-score businesses for outreach opportunities
        </p>
      </div>

      {/* Search form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="restaurants, clinics, gyms…"
            disabled={isProcessing}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 text-gray-900 placeholder:text-gray-400"
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Agadir, Casablanca, Marrakech…"
            disabled={isProcessing}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 text-gray-900 placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={isProcessing || !query.trim() || !city.trim()}
            className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium transition-colors whitespace-nowrap"
          >
            {isProcessing ? 'Searching…' : 'Discover Businesses'}
          </button>
        </form>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Loading state */}
      {isProcessing && (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-10 text-center space-y-3">
          <div className="flex justify-center">
            <Spinner />
          </div>
          <p className="text-sm font-medium text-gray-700">
            Searching Google Maps for <span className="text-brand-600">{query}</span> in{' '}
            <span className="text-brand-600">{city}</span>…
          </p>
          <p className="text-xs text-gray-400">
            This usually takes 30–90 seconds · {elapsed}s elapsed
          </p>
        </div>
      )}

      {/* Results */}
      {job && job.status === 'done' && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span>
              <span className="font-semibold text-gray-900">{job.found}</span> businesses found
            </span>
            <span className="text-gray-300">·</span>
            <span>
              <span className="font-semibold text-green-700">{job.saved}</span> new prospects saved
            </span>
            <span className="text-gray-300">·</span>
            <span>
              <span className="font-semibold text-gray-500">{job.skipped}</span> already existed
            </span>
            {job.duration != null && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-gray-400">{(job.duration / 1000).toFixed(1)}s</span>
              </>
            )}
          </div>

          {job.prospects.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
              <p className="text-sm text-gray-500">
                No new businesses were found. All results already exist in your Prospects list.
              </p>
              <Link
                href="/dashboard/prospects"
                className="mt-4 inline-block px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                View Prospects
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {job.prospects.map((p) => (
                <BusinessCard key={p._id} prospect={p} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {job && job.status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-6 text-center">
          <p className="text-sm font-medium text-red-700">Scrape failed</p>
          {job.error && <p className="mt-1 text-xs text-red-500">{job.error}</p>}
        </div>
      )}

      {/* History */}
      {history.length > 0 && !isProcessing && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Searches</h3>
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h._id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-700">
                  <span className="font-medium">{h.query}</span>
                  {' in '}
                  <span className="font-medium">{h.city}</span>
                  {' — '}
                  <span className="text-gray-500">{h.found} found · {h.saved} saved</span>
                </span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(h.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
