'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ClientsTable, { type Client } from '@/components/clients/ClientsTable'
import AddClientModal from '@/components/clients/AddClientModal'

const API_URL  = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const PAGE_SIZE = 20

const STATUSES = ['active', 'inactive', 'archived'] as const

interface ApiResponse {
  data:  Client[]
  total: number
}

// ─── Inner component — uses useSearchParams, must live inside <Suspense> ─────

function ClientsContent() {
  const router = useRouter()
  const params = useSearchParams()

  const [clients, setClients]       = useState<Client[]>([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState<Client | null>(null)
  const [saving, setSaving]         = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const search = params.get('search') ?? ''
  const status = params.get('status') ?? ''
  const page   = Number(params.get('page') ?? '1')

  const pushParam = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(params.toString())
      Object.entries(updates).forEach(([k, v]) => {
        if (v) next.set(k, v); else next.delete(k)
      })
      router.push(`/dashboard/clients?${next.toString()}`)
    },
    [params, router],
  )

  const handleSearch = useCallback((v: string) => pushParam({ search: v, page: '1' }), [pushParam])
  const handleStatus = useCallback((v: string) => pushParam({ status: v, page: '1' }), [pushParam])
  const handlePage   = useCallback((p: number) => pushParam({ page: String(p) }), [pushParam])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const qs = new URLSearchParams()
    if (search) qs.set('search', search)
    if (status) qs.set('status', status)
    qs.set('page',  String(page))
    qs.set('limit', String(PAGE_SIZE))

    fetch(`${API_URL}/api/clients?${qs.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error ${r.status}`)
        return r.json() as Promise<ApiResponse>
      })
      .then(({ data, total: t }) => {
        if (!cancelled) { setClients(data); setTotal(t) }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [search, status, page])

  function openAdd() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(client: Client) {
    setEditing(client)
    setModalOpen(true)
  }

  async function handleSave(data: Omit<Client, 'id' | 'created_at'>) {
    setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`${API_URL}/api/clients/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        const updated: Client = await res.json()
        setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      } else {
        const res = await fetch(`${API_URL}/api/clients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        const created: Client = await res.json()
        setClients((prev) => [created, ...prev])
        setTotal((t) => t + 1)
      }
      setModalOpen(false)
    } catch {
      // keep modal open so user can retry
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteConfirm(id: string) {
    try {
      const res = await fetch(`${API_URL}/api/clients/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      setClients((prev) => prev.filter((c) => c.id !== id))
      setTotal((t) => Math.max(0, t - 1))
    } catch {
      // silent — keep row intact
    } finally {
      setDeletingId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Clients</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{total} total</span>
          <button
            onClick={openAdd}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            + Add Client
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search clients…"
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <select
          value={status}
          onChange={(e) => handleStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load clients: {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <ClientsTable
          clients={clients}
          deletingId={deletingId}
          onEdit={openEdit}
          onDelete={(id) => setDeletingId(id)}
          onDeleteConfirm={handleDeleteConfirm}
          onDeleteCancel={() => setDeletingId(null)}
        />
      )}

      {/* Pagination */}
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

      <AddClientModal
        open={modalOpen}
        initial={editing}
        saving={saving}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}

// ─── Page — wraps content in Suspense (required for useSearchParams in Next.js 16) ─

export default function ClientsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-gray-400">Loading…</div>}>
      <ClientsContent />
    </Suspense>
  )
}
