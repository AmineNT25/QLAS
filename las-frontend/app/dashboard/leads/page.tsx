'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import LeadsTable, { type Lead } from '@/components/leads/LeadsTable'
import LeadsFilters from '@/components/leads/LeadsFilters'
import api from '@/lib/api'

const PAGE_SIZE = 20

type SortKey = 'email' | 'status' | 'score' | 'createdAt'

interface ApiResponse {
  data: Lead[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-gray-400">Loading…</div>}>
      <LeadsContent />
    </Suspense>
  )
}

function LeadsContent() {
  const router = useRouter()
  const params = useSearchParams()

  const [leads, setLeads]     = useState<Lead[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const search  = params.get('search')  ?? ''
  const status  = params.get('status')  ?? ''
  const sortKey = (params.get('sort')   ?? 'createdAt') as SortKey
  const sortDir = (params.get('dir')    ?? 'desc') as 'asc' | 'desc'
  const page    = Number(params.get('page') ?? '1')

  const pushParam = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(params.toString())
      Object.entries(updates).forEach(([k, v]) => {
        if (v) next.set(k, v)
        else next.delete(k)
      })
      router.push(`/dashboard/leads?${next.toString()}`)
    },
    [params, router],
  )

  const handleSearch = useCallback((v: string) => pushParam({ search: v, page: '1' }), [pushParam])
  const handleStatus = useCallback((v: string) => pushParam({ status: v, page: '1' }), [pushParam])

  const handleSort = useCallback(
    (key: SortKey) => {
      const dir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc'
      pushParam({ sort: key, dir, page: '1' })
    },
    [sortKey, sortDir, pushParam],
  )

  const handlePage = useCallback((p: number) => pushParam({ page: String(p) }), [pushParam])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const qs: Record<string, string> = { page: String(page), limit: String(PAGE_SIZE) }
    if (search) qs.search = search
    if (status) qs.status = status

    api.get('/api/leads', { params: qs })
      .then(({ data }: { data: ApiResponse }) => {
        if (!cancelled) {
          setLeads(data.data)
          setTotal(data.meta.total)
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [search, status, sortKey, sortDir, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Leads</h2>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      <LeadsFilters
        search={search}
        status={status}
        onSearch={handleSearch}
        onStatus={handleStatus}
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load leads: {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <LeadsTable
          leads={leads}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            disabled={page <= 1}
            onClick={() => handlePage(page - 1)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => handlePage(page + 1)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
