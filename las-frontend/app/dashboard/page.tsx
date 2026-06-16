'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import api from '@/lib/api'

interface DashboardStats {
  totalProspects: number
  highOpportunity: number
  inPipeline: number
  clientsWon: number
  discoveredThisMonth: number
  winRate: number
  avgOpportunityScore: number
  prospectsByStatus: { status: string; count: number }[]
  prospectsOverTime: { date: string; count: number }[]
}

const STAGES = [
  { value: 'not_contacted',     label: 'Not Contacted',     color: '#6b7280' },
  { value: 'contacted',         label: 'Contacted',         color: '#3b82f6' },
  { value: 'interested',        label: 'Interested',        color: '#f59e0b' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled', color: '#8b5cf6' },
  { value: 'proposal_sent',     label: 'Proposal Sent',     color: '#f97316' },
  { value: 'client_won',        label: 'Client Won',        color: '#10b981' },
]
const COLOR_MAP = Object.fromEntries(STAGES.map((s) => [s.value, s.color]))
const LABEL_MAP = Object.fromEntries(STAGES.map((s) => [s.value, s.label]))

function fillOverTime(raw: { date: string; count: number }[]) {
  const map = Object.fromEntries(raw.map((d) => [d.date, d.count]))
  const result = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    result.push({ date: key.slice(5), count: map[key] ?? 0 })
  }
  return result
}

function StatCard({
  label, value, sub, accent,
}: {
  label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accent ?? 'text-gray-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get('/api/prospects/stats')
      .then(({ data }) => setStats(data))
      .catch(() => setError('Failed to load stats'))
  }, [])

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (!stats) {
    return <div className="py-20 text-center text-sm text-gray-400">Loading…</div>
  }

  if (stats.totalProspects === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-800">Overview</h2>
        <div className="bg-white rounded-xl border border-gray-200 px-8 py-20 text-center space-y-4">
          <p className="text-lg font-medium text-gray-700">No prospects yet</p>
          <p className="text-sm text-gray-500">Start by discovering businesses in your target cities.</p>
          <Link
            href="/dashboard/discovery"
            className="inline-block mt-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Go to Discovery
          </Link>
        </div>
      </div>
    )
  }

  const overTimeData = fillOverTime(stats.prospectsOverTime)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Overview</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Prospects"       value={stats.totalProspects}       sub="businesses tracked" />
        <StatCard label="High Opportunity"      value={stats.highOpportunity}       sub="score above 70" accent="text-red-600" />
        <StatCard label="Win Rate"              value={`${stats.winRate}%`}         sub="prospects → clients won" />
        <StatCard label="Discovered This Month" value={stats.discoveredThisMonth}   sub="last 30 days" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Prospects Discovered — last 30 days</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={overTimeData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="prospectGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#prospectGrad)"
                name="Prospects"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Prospects by Status</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats.prospectsByStatus.filter((s) => s.count > 0)}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
              >
                {stats.prospectsByStatus.filter((s) => s.count > 0).map((entry) => (
                  <Cell key={entry.status} fill={COLOR_MAP[entry.status] ?? '#6b7280'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(value, name) => [value, LABEL_MAP[String(name)] ?? String(name)]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => LABEL_MAP[value] ?? value}
                wrapperStyle={{ fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pipeline summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Outreach Pipeline</p>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((stage, i) => {
            const count = stats.prospectsByStatus.find((s) => s.status === stage.value)?.count ?? 0
            return (
              <button
                key={stage.value}
                onClick={() => router.push(`/dashboard/pipeline?status=${stage.value}`)}
                className="flex-1 min-w-[100px] flex flex-col items-center gap-1 px-3 py-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group"
              >
                <span
                  className="text-2xl font-bold tabular-nums group-hover:scale-110 transition-transform"
                  style={{ color: stage.color }}
                >
                  {count}
                </span>
                <span className="text-xs text-gray-500 text-center leading-tight">{stage.label}</span>
                {i < STAGES.length - 1 && (
                  <span className="text-gray-300 text-xs mt-0.5">→</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
