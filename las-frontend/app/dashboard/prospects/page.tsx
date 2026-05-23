'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'restaurant',  label: 'Restaurant'  },
  { value: 'clinic',      label: 'Clinic'      },
  { value: 'dentist',     label: 'Dentist'     },
  { value: 'gym',         label: 'Gym'         },
  { value: 'school',      label: 'School'      },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'salon',       label: 'Salon'       },
  { value: 'other',       label: 'Other'       },
]

const STATUSES = [
  { value: 'not_contacted',    label: 'Not Contacted',     color: 'bg-gray-100 text-gray-700'   },
  { value: 'contacted',        label: 'Contacted',         color: 'bg-blue-100 text-blue-700'   },
  { value: 'interested',       label: 'Interested',        color: 'bg-amber-100 text-amber-700' },
  { value: 'meeting_scheduled',label: 'Meeting Scheduled', color: 'bg-purple-100 text-purple-700'},
  { value: 'proposal_sent',    label: 'Proposal Sent',     color: 'bg-orange-100 text-orange-700'},
  { value: 'client_won',       label: 'Client Won',        color: 'bg-green-100 text-green-700' },
]

const STATUS_MAP  = Object.fromEntries(STATUSES.map((s) => [s.value, s]))
const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]))

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prospect {
  _id: string
  businessName: string
  category: string
  city: string
  address?: string
  phone?: string
  whatsapp?: string
  website?: string
  opportunityScore: number
  status: string
  noWebsite: boolean
}

interface Stats {
  total: number
  highOpportunity: number
  inPipeline: number
  clientsWon: number
}

interface ApiResponse {
  prospects: Prospect[]
  total: number
  page: number
  totalPages: number
  stats: Stats
  cities: string[]
}

type FormValues = {
  businessName: string
  category: string
  city: string
  address?: string
  phone?: string
  whatsapp?: string
  website?: string
  googleMapsUrl?: string
  notes?: string
}

// ─── Small components ─────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const [bg, tier] =
    score >= 70 ? ['bg-red-100 text-red-700',    'High']   :
    score >= 40 ? ['bg-amber-100 text-amber-700', 'Medium'] :
                  ['bg-gray-100 text-gray-600',   'Low']
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg}`}>
      <span className="font-mono">{score}</span>
      <span>· {tier}</span>
    </span>
  )
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${s.color}`}>
      {s.label}
    </span>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PhoneIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 16.352V17.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clipRule="evenodd" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M16.555 5.412a8.028 8.028 0 0 0-3.503-2.81 14.899 14.899 0 0 1 1.663 4.472 8.547 8.547 0 0 0 1.84-1.662ZM13.326 7.825a13.43 13.43 0 0 0-2.413-5.773 8.087 8.087 0 0 0-1.826 0 13.43 13.43 0 0 0-2.413 5.773A13.488 13.488 0 0 0 10 8c1.14 0 2.248-.109 3.326-.175ZM6.947 8.885c-2.793.445-5.009.868-5.948 1.494a8.028 8.028 0 0 0 .87 5.322 13.425 13.425 0 0 0 4.913-6.502c.062-.177.118-.357.165-.314ZM13.053 8.885c.047-.043.103.137.165.314a13.425 13.425 0 0 0 4.912 6.502 8.028 8.028 0 0 0 .87-5.322c-.938-.626-3.155-1.05-5.947-1.494ZM10 18a8 8 0 0 1-5.932-2.647 13.43 13.43 0 0 0 4.16-5.744 13.43 13.43 0 0 0 3.544 5.69A8.017 8.017 0 0 1 10 18Z" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
    </svg>
  )
}

// ─── Add Prospect Modal ───────────────────────────────────────────────────────

function AddProspectModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>()
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(values: FormValues) {
    setError(null)
    try {
      await api.post('/api/prospects', values)
      onSuccess()
      onClose()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to save. Please try again.')
    }
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-900 placeholder:text-gray-400'
  const lbl = 'block text-xs font-medium text-gray-600 mb-1'
  const err = 'text-xs text-red-600 mt-0.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h3 className="text-base font-semibold text-gray-800">Add Prospect</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">

            <div className="col-span-2">
              <label className={lbl}>Business Name *</label>
              <input {...register('businessName', { required: 'Required' })} className={inp} placeholder="Al Nour Restaurant" />
              {errors.businessName && <p className={err}>{errors.businessName.message}</p>}
            </div>

            <div>
              <label className={lbl}>Category *</label>
              <select {...register('category', { required: 'Required' })} className={inp} defaultValue="">
                <option value="" disabled>Select…</option>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {errors.category && <p className={err}>{errors.category.message}</p>}
            </div>

            <div>
              <label className={lbl}>City *</label>
              <input {...register('city', { required: 'Required' })} className={inp} placeholder="Casablanca" />
              {errors.city && <p className={err}>{errors.city.message}</p>}
            </div>

            <div className="col-span-2">
              <label className={lbl}>Address</label>
              <input {...register('address')} className={inp} placeholder="123 Rue Mohammed V" />
            </div>

            <div>
              <label className={lbl}>Phone</label>
              <input {...register('phone')} className={inp} placeholder="+212 6 00 00 00 00" />
            </div>

            <div>
              <label className={lbl}>WhatsApp</label>
              <input {...register('whatsapp')} className={inp} placeholder="+212 6 00 00 00 00" />
            </div>

            <div className="col-span-2">
              <label className={lbl}>Website</label>
              <input
                {...register('website', {
                  validate: (v) => !v || v.startsWith('http') || 'Must start with http:// or https://',
                })}
                className={inp}
                placeholder="https://example.com"
              />
              {errors.website && <p className={err}>{errors.website.message}</p>}
            </div>

            <div className="col-span-2">
              <label className={lbl}>Google Maps URL</label>
              <input {...register('googleMapsUrl')} className={inp} placeholder="https://maps.google.com/..." />
            </div>

            <div className="col-span-2">
              <label className={lbl}>Notes</label>
              <textarea
                {...register('notes')}
                rows={3}
                className={`${inp} resize-none`}
                placeholder="Any relevant context about this business…"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              {isSubmitting ? 'Adding…' : 'Add Prospect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Prospect Table Row ───────────────────────────────────────────────────────

function ProspectRow({
  prospect,
  onStatusChange,
}: {
  prospect: Prospect
  onStatusChange: (id: string, status: string) => void
}) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/40 transition-colors">
      {/* Business */}
      <td className="px-4 py-3 min-w-[160px]">
        <p className="text-sm font-medium text-gray-800">{prospect.businessName}</p>
        <span className="text-xs text-gray-400">{CATEGORY_MAP[prospect.category] ?? prospect.category}</span>
      </td>

      {/* Location */}
      <td className="px-4 py-3 min-w-[140px]">
        <p className="text-sm text-gray-700">{prospect.city}</p>
        {prospect.address && (
          <p className="text-xs text-gray-400 max-w-[180px] truncate">{prospect.address}</p>
        )}
      </td>

      {/* Score */}
      <td className="px-4 py-3">
        <ScoreBadge score={prospect.opportunityScore} />
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusPill status={prospect.status} />
      </td>

      {/* Contact */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          {prospect.phone && (
            <a href={`tel:${prospect.phone}`} title={prospect.phone}
              className="text-gray-400 hover:text-brand-600 transition-colors">
              <PhoneIcon />
            </a>
          )}
          {prospect.website && (
            <a href={prospect.website} target="_blank" rel="noopener noreferrer" title="Website"
              className="text-gray-400 hover:text-brand-600 transition-colors">
              <GlobeIcon />
            </a>
          )}
          {prospect.whatsapp && (
            <a
              href={`https://wa.me/${prospect.whatsapp.replace(/\D/g, '')}`}
              target="_blank" rel="noopener noreferrer" title="WhatsApp"
              className="text-gray-400 hover:text-green-600 transition-colors"
            >
              <WhatsAppIcon />
            </a>
          )}
          {!prospect.phone && !prospect.website && !prospect.whatsapp && (
            <span className="text-xs text-gray-300">—</span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/prospects/${prospect._id}`}
            className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap"
          >
            View
          </Link>
          <select
            value={prospect.status}
            onChange={(e) => onStatusChange(prospect._id, e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white cursor-pointer"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </td>
    </tr>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="py-20 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-4">
        <BuildingIcon />
      </div>
      <h3 className="text-base font-semibold text-gray-800 mb-1">No prospects yet</h3>
      <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">
        Add businesses manually or use Discovery to find businesses in your target cities.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onAdd}
          className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
        >
          Add Prospect
        </button>
        <Link
          href="/dashboard/discovery"
          className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Go to Discovery
        </Link>
      </div>
    </div>
  )
}

// ─── Page content (needs Suspense because of useSearchParams) ─────────────────

function ProspectsContent() {
  const router      = useRouter()
  const searchParams = useSearchParams()

  // Current filter values from URL
  const search    = searchParams.get('search')    ?? ''
  const city      = searchParams.get('city')      ?? ''
  const category  = searchParams.get('category')  ?? ''
  const status    = searchParams.get('status')    ?? ''
  const score     = searchParams.get('score')     ?? ''
  const noWebsite = searchParams.get('noWebsite') === 'true'
  const page      = Math.max(1, Number(searchParams.get('page') ?? '1'))

  const [searchInput, setSearchInput] = useState(search)
  const [data, setData]               = useState<ApiResponse | null>(null)
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [toast, setToast]             = useState<string | null>(null)
  const debounceRef                   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Build score → API params
  function scoreToParams() {
    if (score === 'high')   return { minScore: '70' }
    if (score === 'medium') return { minScore: '40', maxScore: '69' }
    if (score === 'low')    return { maxScore: '39' }
    return {}
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' }
      if (search)    params.search    = search
      if (city)      params.city      = city
      if (category)  params.category  = category
      if (status)    params.status    = status
      if (noWebsite) params.noWebsite = 'true'
      if (score === 'high')   { params.minScore = '70' }
      if (score === 'medium') { params.minScore = '40'; params.maxScore = '69' }
      if (score === 'low')    { params.maxScore = '39' }

      const { data: res } = await api.get<ApiResponse>('/api/prospects', { params })
      setData(res)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [search, city, category, status, score, noWebsite, page])

  useEffect(() => { fetchData() }, [fetchData])

  // Debounce search input → URL
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (searchInput !== search) pushFilter('search', searchInput)
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  function pushFilter(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    if (key !== 'page') p.delete('page')
    router.push(`/dashboard/prospects?${p.toString()}`)
  }

  function setPage(n: number) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('page', String(n))
    router.push(`/dashboard/prospects?${p.toString()}`)
  }

  async function handleStatusChange(id: string, newStatus: string) {
    // Optimistic update
    setData((prev) => prev ? {
      ...prev,
      prospects: prev.prospects.map((p) => p._id === id ? { ...p, status: newStatus } : p),
    } : prev)
    try {
      await api.patch(`/api/prospects/${id}/status`, { status: newStatus })
    } catch {
      fetchData() // revert on error
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const stats      = data?.stats ?? { total: 0, highOpportunity: 0, inPipeline: 0, clientsWon: 0 }
  const prospects  = data?.prospects ?? []
  const cities     = data?.cities ?? []
  const totalPages = data?.totalPages ?? 1

  const sel = 'px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500'

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg animate-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Prospects</h2>
          <p className="text-sm text-gray-500 mt-0.5">Businesses you are tracking for outreach</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="shrink-0 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
        >
          + Add Prospect
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Prospects"  value={stats.total} />
        <StatCard label="High Opportunity" value={stats.highOpportunity} />
        <StatCard label="In Pipeline"      value={stats.inPipeline} />
        <StatCard label="Clients Won"      value={stats.clientsWon} />
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by business name or city…"
            className={`flex-1 min-w-[200px] ${sel}`}
          />

          <select value={city} onChange={(e) => pushFilter('city', e.target.value)} className={sel}>
            <option value="">All Cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={category} onChange={(e) => pushFilter('category', e.target.value)} className={sel}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          <select value={status} onChange={(e) => pushFilter('status', e.target.value)} className={sel}>
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <select value={score} onChange={(e) => pushFilter('score', e.target.value)} className={sel}>
            <option value="">All Scores</option>
            <option value="high">High (70+)</option>
            <option value="medium">Medium (40–69)</option>
            <option value="low">Low (0–39)</option>
          </select>

          <button
            onClick={() => pushFilter('noWebsite', noWebsite ? '' : 'true')}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              noWebsite
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            No Website
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-sm text-gray-400">Loading…</div>
        ) : prospects.length === 0 ? (
          <EmptyState onAdd={() => setShowModal(true)} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {['Business', 'Location', 'Score', 'Status', 'Contact', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prospects.map((p) => (
                    <ProspectRow key={p._id} prospect={p} onStatusChange={handleStatusChange} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Page {page} of {totalPages} · {data?.total} results
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <AddProspectModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { fetchData(); showToast('Prospect added successfully!') }}
        />
      )}
    </div>
  )
}

// ─── Page (wraps content in Suspense for useSearchParams) ─────────────────────

export default function ProspectsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-gray-400">Loading…</div>}>
      <ProspectsContent />
    </Suspense>
  )
}
