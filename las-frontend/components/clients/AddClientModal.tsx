'use client'

import { useEffect, useState } from 'react'
import type { Client } from './ClientsTable'

type ClientFormData = Omit<Client, 'id' | 'created_at'>

const EMPTY: ClientFormData = {
  first_name: '',
  last_name:  '',
  email:      '',
  phone:      null,
  company:    null,
  address:    null,
  notes:      null,
  status:     'active',
}

interface Props {
  open:     boolean
  initial:  Client | null
  saving:   boolean
  onClose:  () => void
  onSave:   (data: ClientFormData) => void
}

export default function AddClientModal({ open, initial, saving, onClose, onSave }: Props) {
  const [form, setForm]     = useState<ClientFormData>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({})

  useEffect(() => {
    if (!open) return
    if (initial) {
      const { id: _id, created_at: _ca, ...rest } = initial
      setForm(rest)
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [open, initial])

  if (!open) return null

  function validate() {
    const e: typeof errors = {}
    if (!form.first_name.trim()) e.first_name = 'Required'
    if (!form.last_name.trim())  e.last_name  = 'Required'
    if (!form.email.trim())      e.email      = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    return e
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave(form)
  }

  function set(key: keyof ClientFormData, value: string) {
    setForm((f) => ({ ...f, [key]: value || null }))
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
          <div className="grid grid-cols-2 gap-4">
            <Field
              id="first_name"
              label="First Name"
              required
              value={form.first_name}
              error={errors.first_name}
              onChange={(v) => set('first_name', v)}
            />
            <Field
              id="last_name"
              label="Last Name"
              required
              value={form.last_name}
              error={errors.last_name}
              onChange={(v) => set('last_name', v)}
            />
          </div>

          <Field
            id="email"
            label="Email"
            type="email"
            required
            value={form.email}
            error={errors.email}
            onChange={(v) => set('email', v)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Field
              id="phone"
              label="Phone"
              type="tel"
              value={form.phone ?? ''}
              onChange={(v) => set('phone', v)}
            />
            <Field
              id="company"
              label="Company"
              value={form.company ?? ''}
              onChange={(v) => set('company', v)}
            />
          </div>

          <Field
            id="address"
            label="Address"
            value={form.address ?? ''}
            onChange={(v) => set('address', v)}
          />

          <div>
            <label htmlFor="notes" className="block text-xs font-medium text-gray-600 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Any additional notes…"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-xs font-medium text-gray-600 mb-1">
              Status
            </label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Client['status'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

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
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-60"
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
  id:       string
  label:    string
  type?:    string
  required?: boolean
  value:    string
  error?:   string
  onChange: (v: string) => void
}

function Field({ id, label, type = 'text', required, value, error, onChange }: FieldProps) {
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
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-400' : 'border-gray-300'
        }`}
      />
      {error && <p className="mt-0.5 text-xs text-red-500">{error}</p>}
    </div>
  )
}
