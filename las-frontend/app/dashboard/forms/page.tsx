'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

interface FormField {
  id:          string
  type:        string
  label:       string
  placeholder: string
  required:    boolean
  options?:    string[]
}

interface Form {
  id:                string
  name:              string
  description:       string | null
  client_id:         string | null
  is_active:         boolean
  fields:            FormField[]
  submissions_count: number
  created_at:        string
}

const STATUS_CLASSES = {
  true:  'bg-green-100 text-green-700',
  false: 'bg-gray-100 text-gray-500',
}

type SubmissionsMap = Record<string, { loading: boolean; data: Record<string, string>[]; open: boolean }>

export default function FormsPage() {
  const [forms, setForms]         = useState<Form[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [copied, setCopied]       = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionsMap>({})

  useEffect(() => {
    api.get<{ data: Form[] }>('/api/forms')
      .then(({ data: body }) => setForms(body.data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function getEmbedCode(formId: string) {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
    return `<script src="${base}/embed.js" data-form-id="${formId}" async></script>`
  }

  async function copyEmbed(formId: string) {
    await navigator.clipboard.writeText(getEmbedCode(formId))
    setCopied(formId)
    setTimeout(() => setCopied(null), 2000)
  }

  async function toggleSubmissions(formId: string) {
    // Snapshot state NOW — before any setState, so the values are trustworthy
    const entry      = submissions[formId]
    const isOpen     = entry?.open ?? false
    const cachedData = entry?.data ?? []

    // Toggle the panel open/closed
    setSubmissions((prev) => {
      const cur = prev[formId]
      if (cur?.open) return { ...prev, [formId]: { ...cur, open: false } }
      return { ...prev, [formId]: { loading: cachedData.length === 0, data: cachedData, open: true } }
    })

    // If we just closed it, or data is already loaded — nothing more to do
    if (isOpen || cachedData.length > 0) return

    try {
      const { data: json } = await api.get<{ data: Record<string, string>[] }>(`/api/forms/${formId}/submissions`)
      setSubmissions((prev) => ({
        ...prev,
        [formId]: { loading: false, data: json.data, open: prev[formId]?.open ?? true },
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
      await api.patch(`/api/forms/${form.id}`, { is_active: !form.is_active })
      setForms((prev) =>
        prev.map((f) => (f.id === form.id ? { ...f, is_active: !f.is_active } : f)),
      )
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
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

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load forms: {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      )}

      {/* Empty */}
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

      {/* Form cards */}
      {!loading && forms.length > 0 && (
        <div className="space-y-3">
          {forms.map((form) => {
            const sub = submissions[form.id]
            return (
              <div
                key={form.id}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden"
              >
                {/* Card header */}
                <div className="flex items-start justify-between px-5 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold text-gray-800">{form.name || 'Untitled Form'}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_CLASSES[String(form.is_active) as 'true' | 'false']
                        }`}
                      >
                        {form.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {form.description && (
                      <p className="text-xs text-gray-500">{form.description}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {form.fields.length} field{form.fields.length !== 1 ? 's' : ''} ·{' '}
                      {form.submissions_count ?? 0} submission{(form.submissions_count ?? 0) !== 1 ? 's' : ''} ·{' '}
                      Created{' '}
                      {new Date(form.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => toggleActive(form)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      {form.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => toggleSubmissions(form.id)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      {sub?.open ? 'Hide' : 'Submissions'}
                    </button>
                    <button
                      onClick={() => copyEmbed(form.id)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-colors font-medium ${
                        copied === form.id
                          ? 'border-green-400 bg-green-50 text-green-700'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {copied === form.id ? 'Copied!' : 'Copy Embed'}
                    </button>
                    <Link
                      href="/dashboard/forms/new"
                      className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                </div>

                {/* Embed code strip */}
                <div className="px-5 pb-3">
                  <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                    <code className="text-xs text-gray-500 truncate flex-1 font-mono">
                      {getEmbedCode(form.id)}
                    </code>
                  </div>
                </div>

                {/* Submissions panel */}
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
    </div>
  )
}
