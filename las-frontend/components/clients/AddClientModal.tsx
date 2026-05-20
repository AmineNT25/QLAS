'use client'

import { useEffect, useState } from 'react'
import type { Client, ClientInput } from './ClientsTable'

const EMPTY: ClientInput = {
  name:     '',
  industry: '',
  website:  '',
}

interface Props {
  open:     boolean
  initial:  Client | null
  saving:   boolean
  error?:   string | null
  onClose:  () => void
  onSave:   (data: ClientInput) => void
}

export default function AddClientModal({ open, initial, saving, error, onClose, onSave }: Props) {
  const [form, setForm]     = useState<ClientInput>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof ClientInput, string>>>({})

  useEffect(() => {
    if (!open) return
    if (initial) {
      setForm({
        name:     initial.name,
        industry: initial.industry ?? '',
        website:  initial.website ?? '',
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [open, initial])

  if (!open) return null

  function validate() {
    const e: typeof errors = {}
    if (!form.name.trim()) e.name = 'Required'
    if (form.website.trim() && !/^https?:\/\/.+/i.test(form.website.trim())) {
      e.website = 'Must be a full URL (https://…)'
    }
    return e
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave({
      name:     form.name.trim(),
      industry: form.industry.trim(),
      website:  form.website.trim(),
    })
  }

  function set(key: keyof ClientInput, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((prev) => { const next = { ...prev }; delete next[key]; return next })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">
            {initial ? 'Edit Client' : 'Add Client'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <Field
            id="name"
            label="Client Name"
            required
            value={form.name}
            error={errors.name}
            placeholder="Acme Corp"
            onChange={(v) => set('name', v)}
          />

          <Field
            id="industry"
            label="Industry"
            value={form.industry}
            placeholder="Technology"
            onChange={(v) => set('industry', v)}
          />

          <Field
            id="website"
            label="Website"
            type="url"
            value={form.website}
            error={errors.website}
            placeholder="https://acme.com"
            onChange={(v) => set('website', v)}
          />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : initial ? 'Update Client' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface FieldProps {
  id:           string
  label:        string
  type?:        string
  required?:    boolean
  value:        string
  error?:       string
  placeholder?: string
  onChange:     (v: string) => void
}

function Field({ id, label, type = 'text', required, value, error, placeholder, onChange }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
          error ? 'border-red-400' : 'border-gray-300'
        }`}
      />
      {error && <p className="mt-0.5 text-xs text-red-500">{error}</p>}
    </div>
  )
}
