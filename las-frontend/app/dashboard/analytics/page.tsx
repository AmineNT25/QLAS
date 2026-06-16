'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import api from '@/lib/api'

interface AnalyticsData {
  byCategory: { category: string; count: number }[]
  byCity: { city: string; count: number }[]
  byOpportunityScore: { range: string; count: number }[]
  topProspects: {
    _id: string
    businessName: string
    category: string
    city: string
    opportunityScore: number
    status: string
  }[]
  conversionFunnel: Record<string, number>
}

const CATEGORY_LABELS: Record<string, string> = {
  restaurant:  'Restaurant',
  clinic:      'Clinic',
  dentist:     'Dentist',
  gym:         'Gym',
  school:      'School',
  real_estate: 'Real Estate',
  salon:       'Salon',
  other:       'Other',
}

const STATUS_LABELS: Record<string, string> = {
  not_contacted:     'Not Contacted',
  contacted:         'Contacted',
  interested:        'Interested',
  meeting_scheduled: 'Meeting Scheduled',
  proposal_sent:     'Proposal Sent',
  client_won:        'Client Won',
}

const SCORE_COLORS: Record<string, string> = {
  'High (70–100)':   '#ef4444',
  'Medium (40–69)':  '#f59e0b',
  'Low (0–39)':      '#6b7280',
}

const FUNNEL_STAGES = [
  { key: 'not_contacted',     label: 'Not Contacted',     color: '#6b7280' },
  { key: 'contacted',         label: 'Contacted',         color: '#3b82f6' },
  { key: 'interested',        label: 'Interested',        color: '#f59e0b' },
  { key: 'meeting_scheduled', label: 'Meeting Scheduled', color: '#8b5cf6' },
  { key: 'proposal_sent',     label: 'Proposal Sent',     color: '#f97316' },
  { key: 'client_won',        label: 'Client Won',        color: '#10b981' },
]

function scoreColor(score: number) {
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-red-500'
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm font-semibold text-gray-700 mb-4">{title}</p>
      {children}
    </div>
  )
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [data, setData]   = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get('/api/prospects/analytics')
      .then(({ data }) => setData(data))
      .catch(() => setError('Failed to load analytics'))
  }, [])

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (!data) {
    return <div className="py-20 text-center text-sm text-gray-400">Loading…</div>
  }

  const isEmpty = data.byCategory.length === 0 && data.byCity.length === 0

  if (isEmpty) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Analytics</h2>
          <p className="mt-1 text-sm text-gray-500">Insights across all your prospects</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-8 py-20 text-center space-y-4">
          <p className="text-sm text-gray-500">No analytics yet. Add prospects to see insights.</p>
          <Link
            href="/dashboard/discovery"
            className="inline-block px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Go to Discovery
          </Link>
        </div>
      </div>
    )
  }

  const byCategoryLabeled = data.byCategory.map((d) => ({
    ...d,
    categoryLabel: CATEGORY_LABELS[d.category] ?? d.category,
  }))

  const maxFunnel = Math.max(...FUNNEL_STAGES.map((s) => data.conversionFunnel[s.key] ?? 0), 1)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Analytics</h2>
        <p className="mt-1 text-sm text-gray-500">Insights across all your prospects</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Prospects by Category */}
        <ChartCard title="Prospects by Category">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={byCategoryLabeled}
              margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="categoryLabel" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="count" name="Prospects" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Prospects by City */}
        <ChartCard title="Prospects by City">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data.byCity}
              margin={{ top: 4, right: 8, left: -20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="city"
                tick={{ fontSize: 10 }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="count" name="Prospects" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Opportunity Score Distribution */}
        <ChartCard title="Opportunity Score Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.byOpportunityScore}
                dataKey="count"
                nameKey="range"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={3}
              >
                {data.byOpportunityScore.map((entry) => (
                  <Cell
                    key={entry.range}
                    fill={SCORE_COLORS[entry.range] ?? '#6b7280'}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Conversion Funnel */}
        <ChartCard title="Outreach Conversion Funnel">
          <div className="space-y-3 pt-2">
            {FUNNEL_STAGES.map((stage) => {
              const count = data.conversionFunnel[stage.key] ?? 0
              const pct = Math.round((count / maxFunnel) * 100)
              return (
                <div key={stage.key} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-32 shrink-0 text-right">
                    {stage.label}
                  </span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: stage.color }}
                    >
                      <span className="text-white text-xs font-medium">{count}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ChartCard>
      </div>

      {/* Top Prospects Table */}
      {data.topProspects.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">Top 5 Prospects by Opportunity Score</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Business Name</th>
                <th className="px-5 py-3 text-left">Category</th>
                <th className="px-5 py-3 text-left">City</th>
                <th className="px-5 py-3 text-center">Score</th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.topProspects.map((p) => (
                <tr
                  key={p._id}
                  onClick={() => router.push(`/dashboard/prospects/${p._id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3 font-medium text-gray-800">{p.businessName}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {CATEGORY_LABELS[p.category] ?? p.category}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{p.city}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`font-bold tabular-nums ${scoreColor(p.opportunityScore)}`}>
                      {p.opportunityScore}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {STATUS_LABELS[p.status] ?? p.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
