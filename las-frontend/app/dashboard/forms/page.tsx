'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface FormField {
  label:       string
  type:        string
  placeholder?: string
  required?:   boolean
  options?:    string[]
}

interface Form {
  _id:               string
  name:              string
  isActive:          boolean
  fields:            FormField[]
  submissions_count: number
  createdAt:         string
}

type SubmissionsMap = Record<string, { loading: boolean; data: Record<string, unknown>[]; open: boolean }>

function embedSnippet(formId: string) {
  return `<script src="${API_URL}/api/embed/${formId}" async></script>`
}

// ─── Embed code modal ─────────────────────────────────────────────────────────

function EmbedModal({ form, onClose }: { form: Form; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const snippet = embedSnippet(form._id)

  async function copy() {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">
            Embed “{form.name || 'Untitled Form'}”
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Paste this snippet into any website where the page should appear. It
            has no dependencies — it renders the form and posts submissions back
            to QLAS automatically.
          </p>

          <div className="rounded-lg bg-gray-900 px-4 py-3">
            <code className="block text-xs text-gray-100 font-mono break-all whitespace-pre-wrap">
              {snippet}
            </code>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={copy}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {copied ? 'Copied!' : 'Copy snippet'}
            </button>
            <a
              href={`${API_URL}/api/embed/${form._id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              View raw script
            </a>
          </div>

          {!form.isActive && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              This form is inactive — the embed will not render until you
              activate it.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FormsPage() {
  const [forms, setForms]             = useState<Form[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [embedFor, setEmbedFor]       = useState<Form | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionsMap>({})

  useEffect(() => {
    api
      .get<{ data: Form[] }>('/api/forms')
      .then(({ data }) => setForms(data.data))
      .catch((e) => setError(e?.response?.data?.message ?? e.message))
      .finally(() => setLoading(false))
  }, [])

  async function toggleSubmissions(formId: string) {
    const entry      = submissions[formId]
    const isOpen     = entry?.open ?? false
    const cachedData = entry?.data ?? []

    setSubmissions((prev) => {
      const cur = prev[formId]
      if (cur?.open) return { ...prev, [formId]: { ...cur, open: false } }
      return { ...prev, [formId]: { loading: cachedData.length === 0, data: cachedData, open: true } }
    })

    if (isOpen || cachedData.length > 0) return

    try {
      const { data } = await api.get<{ data: Record<string, unknown>[] }>(
        `/api/forms/${formId}/submissions`,
      )
      setSubmissions((prev) => ({
        ...prev,
        [formId]: { loading: false, data: data.data, open: prev[formId]?.open ?? true },
      }))
    } catch {
      setSubmissions((prev) => ({
        ...prev,
        [formId]: { loading: false, data: [], open: prev[formId]?.open ?? true },
      }))
    }
  }

  async function toggleActive(form: Form) {
    try {
      await api.patch(`/api/forms/${form._id}`, { isActive: !form.isActive })
      setForms((prev) =>
        prev.map((f) => (f._id === form._id ? { ...f, isActive: !f.isActive } : f)),
      )
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Forms</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{forms.length} total</span>
          <Link
            href="/dashboard/forms/new"
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            + Create Form
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load forms: {error}
        </div>
      )}

      {loading && (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      )}

      {!loading && !error && forms.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-20 text-center">
          <p className="text-gray-400 text-sm">No forms yet. Create your first lead capture form.</p>
          <Link
            href="/dashboard/forms/new"
            className="inline-block mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            Create Form
          </Link>
        </div>
      )}

      {!loading && forms.length > 0 && (
        <div className="space-y-3">
          {forms.map((form) => {
            const sub = submissions[form._id]
            return (
              <div key={form._id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-start justify-between px-5 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold text-gray-800">{form.name || 'Untitled Form'}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          form.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {form.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {form.fields.length} field{form.fields.length !== 1 ? 's' : ''} ·{' '}
                      {form.submissions_count ?? 0} submission{(form.submissions_count ?? 0) !== 1 ? 's' : ''} ·{' '}
                      Created{' '}
                      {new Date(form.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => toggleActive(form)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      {form.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => toggleSubmissions(form._id)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      {sub?.open ? 'Hide' : 'Submissions'}
                    </button>
                    <button
                      onClick={() => setEmbedFor(form)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors font-medium"
                    >
                      Get Embed Code
                    </button>
                    <Link
                      href="/dashboard/forms/new"
                      className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                </div>

                {sub?.open && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <p className="text-xs font-medium text-gray-500 mb-3">Submissions</p>
                    {sub.loading ? (
                      <p className="text-xs text-gray-400">Loading…</p>
                    ) : sub.data.length === 0 ? (
                      <p className="text-xs text-gray-400">No submissions yet.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              {Object.keys(sub.data[0]).map((col) => (
                                <th key={col} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap capitalize">
                                  {col.replace(/_/g, ' ')}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {sub.data.map((row, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                {Object.values(row).map((val, j) => (
                                  <td key={j} className="px-3 py-2 text-gray-600 whitespace-nowrap">
                                    {String(val ?? '—')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {embedFor && <EmbedModal form={embedFor} onClose={() => setEmbedFor(null)} />}
    </div>
  )
}
