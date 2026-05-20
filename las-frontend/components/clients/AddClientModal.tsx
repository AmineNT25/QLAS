'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { Client } from './ClientsTable'

export interface ClientFormData {
  name: string
  industry: string
  website: string
}

const EMPTY: ClientFormData = { name: '', industry: '', website: '' }

interface Props {
  open: boolean
  initial: Client | null
  saving: boolean
  error: string | null
  onClose: () => void
  onSave: (data: ClientFormData) => void
}

export default function AddClientModal({
  open,
  initial,
  saving,
  error,
  onClose,
  onSave,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormData>({ defaultValues: EMPTY })

  useEffect(() => {
    if (!open) return
    reset(
      initial
        ? {
            name: initial.name ?? '',
            industry: initial.industry ?? '',
            website: initial.website ?? '',
          }
        : EMPTY,
    )
  }, [open, initial, reset])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-xl overflow-hidden">
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

        <form
          onSubmit={handleSubmit(onSave)}
          className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
        >
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-xs font-medium text-gray-600 mb-1">
              Name<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              id="name"
              {...register('name', {
                required: 'Name is required',
                setValueAs: (v: string) => v.trim(),
              })}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                errors.name ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="Acme Corp"
            />
            {errors.name && (
              <p className="mt-0.5 text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="industry" className="block text-xs font-medium text-gray-600 mb-1">
              Industry
            </label>
            <input
              id="industry"
              {...register('industry')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Technology"
            />
          </div>

          <div>
            <label htmlFor="website" className="block text-xs font-medium text-gray-600 mb-1">
              Website
            </label>
            <input
              id="website"
              {...register('website', {
                pattern: {
                  value: /^https?:\/\/[^\s]+$/i,
                  message: 'Must be a valid URL (https://…)',
                },
              })}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                errors.website ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="https://acme.com"
            />
            {errors.website && (
              <p className="mt-0.5 text-xs text-red-500">{errors.website.message}</p>
            )}
          </div>

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
