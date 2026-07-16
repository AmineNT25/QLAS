import Link from 'next/link'
import { ReactNode } from 'react'

const NAV_LINKS = [
  { href: '/dashboard',           label: 'Dashboard'  },
  { href: '/dashboard/prospects', label: 'Prospects'  },
  { href: '/dashboard/discovery', label: 'Discovery'  },
  { href: '/dashboard/pipeline',  label: 'Pipeline'   },
  { href: '/dashboard/analytics', label: 'Analytics'  },
  { href: '/dashboard/settings',  label: 'Settings'   },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-white border-r border-gray-200">
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
        <header className="flex items-center px-6 py-3 bg-white border-b border-gray-200 shrink-0">
          <h1 className="text-base font-semibold text-gray-800">Dashboard</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
