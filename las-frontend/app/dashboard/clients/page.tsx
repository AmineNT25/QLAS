'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ClientsTable, { type Client } from '@/components/clients/ClientsTable'
import AddClientModal, { type ClientFormData } from '@/components/clients/AddClientModal'
import { setActiveClientId } from '@/lib/activeClient'
import api from '@/lib/api'

const PAGE_SIZE = 20

interface ApiResponse {
  data: Client[]
  total: number
}

const RELATION_ROUTES: Record<string, string> = {
  leads: '/dashboard/leads',
  forms: '/dashboard/forms',
  scoring: '/dashboard/settings?tab=Lead+Settings',
  email: '/dashboard/settings?tab=Email',
}

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
  const [saveError, setSaveError]   = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const search = params.get('search') ?? ''
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
  const handlePage   = useCallback((p: number) => pushParam({ page: String(p) }), [pushParam])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    api
      .get<ApiResponse>('/api/clients', {
        params: { search: search || undefined, page, limit: PAGE_SIZE },
      })
      .then(({ data }) => {
        setClients(data.data)
        setTotal(data.total)
      })
      .catch((e) => setError(e?.response?.data?.message ?? e.message))
      .finally(() => setLoading(false))
  }, [search, page])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditing(null)
    setSaveError(null)
    setModalOpen(true)
  }

  function openEdit(client: Client) {
    setEditing(client)
    setSaveError(null)
    setModalOpen(true)
  }

  function openRelation(clientId: string, relation: 'leads' | 'forms' | 'scoring' | 'email') {
    // Switch the active tenant first so the destination page is scoped to it.
    setActiveClientId(clientId)
    router.push(RELATION_ROUTES[relation])
  }

  async function handleSave(data: ClientFormData) {
    setSaving(true)
    setSaveError(null)
    const payload = {
      name: data.name,
      industry: data.industry || undefined,
      website: data.website || undefined,
    }
    try {
      if (editing) {
        await api.put(`/api/clients/${editing._id}`, payload)
      } else {
        await api.post('/api/clients', payload)
      }
      setModalOpen(false)
      load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      setSaveError(err.response?.data?.message ?? err.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteConfirm(id: string) {
    try {
      await api.delete(`/api/clients/${id}`)
      setClients((prev) => prev.filter((c) => c._id !== id))
      setTotal((t) => Math.max(0, t - 1))
    } catch {
      // keep row intact on failure
    } finally {
      setDeletingId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4">
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

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search clients…"
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load clients: {error}
        </div>
      )}

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
          onOpenRelation={openRelation}
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

      <AddClientModal
        open={modalOpen}
        initial={editing}
        saving={saving}
        error={saveError}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-gray-400">Loading…</div>}>
      <ClientsContent />
    </Suspense>
  )
}
