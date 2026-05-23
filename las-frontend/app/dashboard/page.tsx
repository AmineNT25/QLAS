'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import api from '@/lib/api'

interface Stats {
  total: number
  conversionRate: number
  avgScore: number
  byStatus: { status: string; count: number }[]
  dailyLeads: { date: string; count: number }[]
}

const STATUS_LABELS: Record<string, string> = {
  new:       'Not Contacted',
  contacted: 'Contacted',
  qualified: 'Interested',
  converted: 'Client Won',
  lost:      'Lost',
}

const STATUS_COLORS: Record<string, string> = {
  new:       '#3b82f6',
  contacted: '#f59e0b',
  qualified: '#8b5cf6',
  converted: '#10b981',
  lost:      '#ef4444',
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

// Fill missing dates in the last 30 days so the area chart has no gaps
function fillDailyLeads(raw: { date: string; count: number }[]) {
  const map = Object.fromEntries(raw.map((d) => [d.date, d.count]))
  const result = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    result.push({ date: key.slice(5), count: map[key] ?? 0 }) // show MM-DD
  }
  return result
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get('/api/stats')
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

  const dailyData = fillDailyLeads(stats.dailyLeads)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Overview</h2>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Prospects"        value={stats.total} />
        <StatCard label="Win Rate"               value={`${stats.conversionRate}%`} sub="prospects → clients won" />
        <StatCard label="Avg Opportunity Score"  value={stats.avgScore} sub="out of 100" />
        <StatCard
          label="Discovered This Month"
          value={stats.dailyLeads.reduce((s, d) => s + d.count, 0)}
          sub="last 30 days"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area chart — leads over time */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Prospects Discovered — last 30 days</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#leadGrad)"
                name="Prospects"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart — by status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Prospects by Status</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats.byStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {stats.byStatus.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#6b7280'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(value, name) => [value, STATUS_LABELS[String(name)] ?? String(name)]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => STATUS_LABELS[value] ?? value}
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar chart — status breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Outreach Pipeline</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stats.byStatus} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="status"
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => STATUS_LABELS[v] ?? v}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(value, name) => [value, STATUS_LABELS[String(name)] ?? String(name)]}
            />
            <Bar dataKey="count" name="Prospects" radius={[4, 4, 0, 0]}>
              {stats.byStatus.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#6b7280'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
