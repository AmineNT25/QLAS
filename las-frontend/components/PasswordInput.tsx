'use client'

import { useState } from 'react'

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>

/**
 * Password field with an inline Show/Hide toggle. Pass the same `className` you
 * would give a plain <input> — the toggle reserves its own space on the right.
 */
export default function PasswordInput({ className = '', ...props }: Props) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className={`${className} pr-16`} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-gray-500 hover:text-brand-600 transition-colors"
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
