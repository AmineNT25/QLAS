'use client'

import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import FieldPalette from '@/components/form-builder/FieldPalette'
import FieldCanvas from '@/components/form-builder/FieldCanvas'
import FieldConfigPanel from '@/components/form-builder/FieldConfigPanel'
import FormPreview from '@/components/form-builder/FormPreview'
import type { FieldType, FormField } from '@/components/form-builder/types'

const PLACEHOLDER_CLIENTS = [
  { id: 'client-1', name: 'Acme Corp' },
  { id: 'client-2', name: 'Globex Industries' },
]

export default function NewFormPage() {
  const [formName, setFormName] = useState('')
  const [clientId, setClientId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [fields, setFields] = useState<FormField[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)

  const selectedField = fields.find((f) => f.id === selectedId) ?? null

  function addField(type: FieldType) {
    const newField: FormField = {
      id: uuid(),
      type,
      label: '',
      placeholder: '',
      required: false,
      options: type === 'select' ? [''] : [],
    }
    setFields((prev) => [...prev, newField])
    setSelectedId(newField.id)
  }

  function deleteField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  function updateField(updated: FormField) {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
  }

  function handleSave() {
    const payload = {
      name: formName,
      client_id: clientId,
      is_active: isActive,
      fields: fields.map(({ id, type, label, placeholder, required, options }) => ({
        id,
        type,
        label,
        placeholder,
        required,
        ...(type === 'select' ? { options } : {}),
      })),
    }
    console.log('Form payload:', JSON.stringify(payload, null, 2))
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <input
          type="text"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="Form name…"
          className="flex-1 max-w-xs px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Select client…</option>
          {PLACEHOLDER_CLIENTS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-sm text-gray-600">Active</span>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive((v) => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              isActive ? 'bg-brand-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                isActive ? 'translate-x-4.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>

        <div className="flex-1" />

        <button
          onClick={() => setPreviewMode((v) => !v)}
          className="px-4 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {previewMode ? 'Edit' : 'Preview'}
        </button>

        <button
          onClick={handleSave}
          className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
        >
          Save
        </button>
      </header>

      {/* Body */}
      {previewMode ? (
        <div className="flex-1 overflow-y-auto p-8">
          <FormPreview formName={formName} fields={fields} />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — palette */}
          <aside className="w-52 shrink-0 border-r border-gray-200 bg-white p-4 overflow-y-auto">
            <FieldPalette onAdd={addField} />
          </aside>

          {/* Center panel — canvas */}
          <main className="flex-1 overflow-y-auto p-6">
            <FieldCanvas
              fields={fields}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDelete={deleteField}
              onReorder={setFields}
            />
          </main>

          {/* Right panel — config */}
          <aside className="w-64 shrink-0 border-l border-gray-200 bg-white p-4 overflow-y-auto">
            <FieldConfigPanel field={selectedField} onChange={updateField} />
          </aside>
        </div>
      )}
    </div>
  )
}
