'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import api from '@/lib/api'

interface Analytics {
  bySource:   { source: string; count: number }[]
  dailyLeads: { date: string;   count: number }[]
  byStatus:   { status: string; count: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  new:       '#3b82f6',
  contacted: '#f59e0b',
  qualified: '#8b5cf6',
  converted: '#10b981',
  lost:      '#ef4444',
}

const STATUS_ORDER = ['new', 'contacted', 'qualified', 'converted', 'lost']

function fillDailyLeads(raw: { date: string; count: number }[]) {
  const map = Object.fromEntries(raw.map((d) => [d.date, d.count]))
  const out: { date: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    out.push({ date: key.slice(5), count: map[key] ?? 0 })
  }
  return out
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
  const [data, setData]     = useState<Analytics | null>(null)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    api.get('/api/analytics')
      .then(({ data }) => setData(data.data))
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

  const daily = fillDailyLeads(data.dailyLeads)

  const statusMap = Object.fromEntries(data.byStatus.map((s) => [s.status, s.count]))
  const byStatus = STATUS_ORDER.map((s) => ({ status: s, count: statusMap[s] ?? 0 }))
    .filter((s) => s.count > 0)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Analytics</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Leads by Source">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.bySource} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="source" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="count" name="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Leads by Status">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={byStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={3}
              >
                {byStatus.map((e) => (
                  <Cell key={e.status} fill={STATUS_COLORS[e.status] ?? '#6b7280'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(v, n) => [v, String(n).charAt(0).toUpperCase() + String(n).slice(1)]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Lead volume — last 30 days">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={daily} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="count"
              name="Leads"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
