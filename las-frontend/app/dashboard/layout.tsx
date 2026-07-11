'use client'

import Link from 'next/link'
import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import UserMenu from '@/components/dashboard/UserMenu'

const NAV_LINKS = [
  { href: '/dashboard',             label: 'Dashboard'  },
  { href: '/dashboard/prospects',   label: 'Prospects'  },
  { href: '/dashboard/discovery',   label: 'Discovery'  },
  { href: '/dashboard/pipeline',    label: 'Pipeline'   },
  { href: '/dashboard/analytics',   label: 'Analytics'  },
  { href: '/dashboard/settings',    label: 'Settings'   },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/login')
    } else {
      setReady(true)
    }
  }, [router])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-white border-r border-gray-200">
        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header */}
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
          <h1 className="text-base font-semibold text-gray-800">Dashboard</h1>
          <UserMenu />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
