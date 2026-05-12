'use client'

import type { FormField } from './types'

interface Props {
  field: FormField | null
  onChange: (updated: FormField) => void
}

export default function FieldConfigPanel({ field, onChange }: Props) {
  if (!field) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Select a field to configure it
      </div>
    )
  }

  function update(partial: Partial<FormField>) {
    onChange({ ...field!, ...partial })
  }

  function addOption() {
    update({ options: [...field!.options, ''] })
  }

  function updateOption(index: number, value: string) {
    const opts = [...field!.options]
    opts[index] = value
    update({ options: opts })
  }

  function removeOption(index: number) {
    update({ options: field!.options.filter((_, i) => i !== index) })
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Field Config
      </h2>

      {/* Label */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
        <input
          type="text"
          value={field.label}
          onChange={(e) => update({ label: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Field label"
        />
      </div>

      {/* Placeholder */}
      {field.type !== 'checkbox' && field.type !== 'select' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Placeholder</label>
          <input
            type="text"
            value={field.placeholder}
            onChange={(e) => update({ placeholder: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Placeholder text"
          />
        </div>
      )}

      {/* Required toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">Required</span>
        <button
          type="button"
          role="switch"
          aria-checked={field.required}
          onClick={() => update({ required: !field.required })}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
            field.required ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              field.required ? 'translate-x-4.5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Select options */}
      {field.type === 'select' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Options</label>
          <div className="flex flex-col gap-2">
            {field.options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Option ${i + 1}`}
                />
                <button
                  onClick={() => removeOption(i)}
                  className="text-gray-300 hover:text-red-500 transition-colors text-xl leading-none"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={addOption}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium text-left"
            >
              + Add option
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
