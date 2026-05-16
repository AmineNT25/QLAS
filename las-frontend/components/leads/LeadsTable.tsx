'use client'

import { useRouter } from 'next/navigation'

export interface Lead {
  _id: string
  email: string
  fullName: string | null
  status: string
  score: number
  source: string | null
  createdAt: string
}

type SortKey = 'email' | 'status' | 'score' | 'createdAt'

interface Props {
  leads: Lead[]
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSort: (key: SortKey) => void
}

const STATUS_CLASSES: Record<string, string> = {
  new:       'bg-blue-100   text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-purple-100 text-purple-700',
  converted: 'bg-green-100  text-green-700',
  lost:      'bg-red-100    text-red-700',
}

function SortIndicator({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

export default function LeadsTable({ leads, sortKey, sortDir, onSort }: Props) {
  const router = useRouter()

  const cols: { key: SortKey; label: string }[] = [
    { key: 'email',     label: 'Email'      },
    { key: 'status',    label: 'Status'     },
    { key: 'score',     label: 'Score'      },
    { key: 'createdAt', label: 'Created At' },
  ]

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">
              Full Name
            </th>
            {cols.map(({ key, label }) => (
              <th
                key={key}
                className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap cursor-pointer select-none hover:text-gray-800 transition-colors"
                onClick={() => onSort(key)}
              >
                {label}
                <SortIndicator active={sortKey === key} dir={sortDir} />
              </th>
            ))}
            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">
              Source
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {leads.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                No leads found.
              </td>
            </tr>
          ) : (
            leads.map((lead) => (
              <tr
                key={lead._id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => router.push(`/dashboard/leads/${lead._id}`)}
              >
                <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                  {lead.fullName ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {lead.email}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      STATUS_CLASSES[lead.status] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap tabular-nums">
                  {lead.score}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {lead.source ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap tabular-nums text-xs">
                  {new Date(lead.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
