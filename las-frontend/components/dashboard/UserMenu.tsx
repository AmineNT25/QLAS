'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import api from '@/lib/api'

interface CurrentUser {
  id:        string
  email:     string
  full_name: string
  role:      string
}

function initials(name?: string, email?: string) {
  const source = name?.trim() || email?.split('@')[0] || 'U'
  return source
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function UserMenu() {
  const router = useRouter()
  const [user, setUser]               = useState<CurrentUser | null>(null)
  const [menuOpen, setMenuOpen]       = useState(false)
  const [modalOpen, setModalOpen]     = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Fetch the current user once on mount
  useEffect(() => {
    api.get<{ data: CurrentUser }>('/api/auth/me')
      .then(({ data }) => setUser(data.data))
      .catch(() => setUser(null))
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  function handleLogout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    Cookies.remove('access_token')
    router.push('/login')
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white text-sm font-semibold select-none transition-colors"
        aria-label="Open user menu"
      >
        {initials(user?.full_name, user?.email)}
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
          {/* Read-only header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-800 truncate">
              {user?.full_name || 'Loading…'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
          </div>

          {/* Menu items */}
          <button
            type="button"
            onClick={() => { setMenuOpen(false); setModalOpen(true) }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Change password
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
          >
            Logout
          </button>
        </div>
      )}

      {modalOpen && <ChangePasswordModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}

// ─── Change Password Modal ────────────────────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent]   = useState('')
  const [next, setNext]         = useState('')
  const [confirm, setConfirm]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (next.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }
    if (next !== confirm) {
      setError('Passwords do not match')
      return
    }

    setSaving(true)
    try {
      await api.patch('/api/auth/password', { currentPassword: current, newPassword: next })
      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? 'Could not update password'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Change password</h3>
        <p className="text-xs text-gray-500 mb-5">Enter your current password and a new one.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Current password</label>
            <input
              type="password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">New password</label>
            <input
              type="password"
              required
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirm new password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error   && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Password updated!</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || success}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60 transition-colors"
            >
              {saving ? 'Saving…' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
