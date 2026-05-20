'use client'

import type { FieldType } from './types'

const FIELD_TYPES: { type: FieldType; label: string; icon: string }[] = [
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'email', label: 'Email', icon: '@' },
  { type: 'phone', label: 'Phone', icon: '#' },
  { type: 'textarea', label: 'Textarea', icon: '¶' },
  { type: 'select', label: 'Select', icon: '▾' },
  { type: 'checkbox', label: 'Checkbox', icon: '✓' },
]

interface Props {
  onAdd: (type: FieldType) => void
}

export default function FieldPalette({ onAdd }: Props) {
  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Field Types
      </h2>
      <div className="flex flex-col gap-2">
        {FIELD_TYPES.map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => onAdd(type)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 hover:border-brand-400 hover:bg-brand-50 text-left transition-colors group"
          >
            <span className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 group-hover:bg-brand-100 text-gray-500 group-hover:text-brand-600 text-sm font-mono font-bold">
              {icon}
            </span>
            <span className="text-sm font-medium text-gray-700 group-hover:text-brand-700">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
