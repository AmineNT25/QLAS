'use client'

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const

interface Props {
  search: string
  status: string
  onSearch: (v: string) => void
  onStatus: (v: string) => void
}

export default function LeadsFilters({ search, status, onSearch, onStatus }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search leads…"
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 w-64"
      />

      <select
        value={status}
        onChange={(e) => onStatus(e.target.value)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </option>
        ))}
      </select>
    </div>
  )
}
