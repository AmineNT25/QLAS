'use client'

import { useEffect, useMemo, useState } from 'react'
import ClientsTable, { type Client, type ClientInput } from '@/components/clients/ClientsTable'
import AddClientModal from '@/components/clients/AddClientModal'
import api from '@/lib/api'

interface ApiResponse {
  data: Client[]
}

export default function ClientsPage() {
  const [clients, setClients]       = useState<Client[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState<Client | null>(null)
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    // api attaches the Bearer token and transparently refreshes it on 401.
    api.get<ApiResponse>('/api/clients')
      .then((res) => { if (!cancelled) setClients(res.data.data) })
      .catch((e: unknown) => {
        if (cancelled) return
        const stat = (e as { response?: { status?: number } }).response?.status
        setError(stat ? `Server error ${stat}` : 'Network error')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  // The backend returns every client unpaginated, so search is client-side.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) =>
      [c.name, c.industry, c.website].some((v) => v?.toLowerCase().includes(q)),
    )
  }, [clients, search])

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

  async function handleSave(data: ClientInput) {
    setSaving(true)
    setSaveError(null)
    try {
      if (editing) {
        const res = await api.patch<{ data: Client }>(`/api/clients/${editing._id}`, data)
        const updated = res.data.data
        setClients((prev) => prev.map((c) => (c._id === updated._id ? updated : c)))
      } else {
        const res = await api.post<{ data: Client }>('/api/clients', data)
        setClients((prev) => [res.data.data, ...prev])
      }
      setModalOpen(false)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message
      setSaveError(msg ?? 'Could not save client')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteConfirm(id: string) {
    try {
      await api.delete(`/api/clients/${id}`)
      setClients((prev) => prev.filter((c) => c._id !== id))
    } catch {
      // silent — keep the row intact so the user can retry
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Clients</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{clients.length} total</span>
          <button
            onClick={openAdd}
            className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
          >
            + Add Client
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, industry, or website…"
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 w-72"
      />

      {/* Table / states */}
      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load clients: {error}
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <ClientsTable
          clients={filtered}
          deletingId={deletingId}
          onEdit={openEdit}
          onDelete={(id) => setDeletingId(id)}
          onDeleteConfirm={handleDeleteConfirm}
          onDeleteCancel={() => setDeletingId(null)}
        />
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
