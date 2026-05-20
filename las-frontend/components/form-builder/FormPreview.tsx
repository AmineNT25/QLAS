'use client'

import { useForm } from 'react-hook-form'
import type { FormField } from './types'

interface Props {
  formName: string
  fields: FormField[]
}

export default function FormPreview({ formName, fields }: Props) {
  const { register, handleSubmit } = useForm()

  function onSubmit(data: unknown) {
    console.log('Preview submit (non-functional):', data)
  }

  if (fields.length === 0) {
    return (
      <div className="text-center text-gray-400 text-sm py-10">
        Add fields to see a preview
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {formName || 'Untitled Form'}
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {fields.map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label || 'Untitled'}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>

            {field.type === 'text' && (
              <input
                type="text"
                placeholder={field.placeholder}
                {...register(field.id, { required: field.required })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            )}

            {field.type === 'email' && (
              <input
                type="email"
                placeholder={field.placeholder}
                {...register(field.id, { required: field.required })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            )}

            {field.type === 'phone' && (
              <input
                type="tel"
                placeholder={field.placeholder}
                {...register(field.id, { required: field.required })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            )}

            {field.type === 'textarea' && (
              <textarea
                rows={3}
                placeholder={field.placeholder}
                {...register(field.id, { required: field.required })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            )}

            {field.type === 'select' && (
              <select
                {...register(field.id, { required: field.required })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="">Select an option</option>
                {field.options.map((opt, i) => (
                  <option key={i} value={opt}>
                    {opt || `Option ${i + 1}`}
                  </option>
                ))}
              </select>
            )}

            {field.type === 'checkbox' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register(field.id, { required: field.required })}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-600">
                  {field.placeholder || field.label}
                </span>
              </label>
            )}
          </div>
        ))}

        <button
          type="submit"
          className="w-full mt-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          Submit
        </button>
      </form>
    </div>
  )
}
