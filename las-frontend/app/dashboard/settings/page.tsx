'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import PasswordInput from '@/components/PasswordInput'

const TABS = ['Lead Settings', 'Notifications', 'Integrations', 'Email'] as const
type Tab = (typeof TABS)[number]

const DEFAULT_STATUSES = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost']

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-brand-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function SaveBar({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  return (
    <div className="flex items-center gap-3 pt-4">
      <button
        type="button"
        onClick={onSave}
        className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
      >
        Save Changes
      </button>
      {saved && <span className="text-sm text-green-600">Saved!</span>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-4">
      {children}
    </h3>
  )
}

function InputField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {type === 'password' ? (
        <PasswordInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
      )}
    </div>
  )
}

// ─── Tab: Lead Settings ───────────────────────────────────────────────────────

function LeadSettingsTab() {
  const [saved, setSaved]       = useState(false)
  const [statuses, setStatuses] = useState(DEFAULT_STATUSES)
  const [newStatus, setNewStatus] = useState('')
  const [autoResponse, setAutoResponse] = useState(false)
  const [template, setTemplate] = useState(
    'Hi {{name}},\n\nThank you for your interest. We\'ll be in touch shortly.\n\nBest regards,\nThe Team',
  )

  function addStatus() {
    const s = newStatus.trim()
    if (s && !statuses.includes(s)) {
      setStatuses((prev) => [...prev, s])
    }
    setNewStatus('')
  }

  function removeStatus(s: string) {
    setStatuses((prev) => prev.filter((x) => x !== s))
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Lead statuses */}
      <div>
        <SectionTitle>Lead Statuses</SectionTitle>
        <div className="flex flex-wrap gap-2 mb-3">
          {statuses.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium"
            >
              {s}
              {!DEFAULT_STATUSES.slice(0, 2).includes(s) && (
                <button
                  onClick={() => removeStatus(s)}
                  className="text-gray-400 hover:text-red-500 transition-colors leading-none"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addStatus()}
            placeholder="Add status…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={addStatus}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Auto-response */}
      <div>
        <SectionTitle>Auto-Response Email</SectionTitle>
        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <Toggle checked={autoResponse} onChange={setAutoResponse} />
          <span className="text-sm text-gray-700">Send auto-response when a lead is received</span>
        </label>
        {autoResponse && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email Template</label>
            <textarea
              rows={6}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">Use {'{{name}}'}, {'{{email}}'} as placeholders.</p>
          </div>
        )}
      </div>

      <SaveBar onSave={handleSave} saved={saved} />
    </div>
  )
}

// ─── Tab: Notifications ───────────────────────────────────────────────────────

function NotificationsTab() {
  const [saved, setSaved] = useState(false)
  const [notifications, setNotifications] = useState({
    new_lead:       true,
    status_changed: true,
    form_submission: false,
  })
  const [recipients, setRecipients] = useState(['admin@example.com'])
  const [newRecipient, setNewRecipient] = useState('')

  function toggle(key: keyof typeof notifications) {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function addRecipient() {
    const r = newRecipient.trim()
    if (r && !recipients.includes(r)) setRecipients((prev) => [...prev, r])
    setNewRecipient('')
  }

  function removeRecipient(r: string) {
    setRecipients((prev) => prev.filter((x) => x !== r))
  }

  const rows: { key: keyof typeof notifications; label: string; desc: string }[] = [
    { key: 'new_lead',        label: 'New lead received',        desc: 'Get notified when a new lead is captured' },
    { key: 'status_changed',  label: 'Lead status changed',      desc: 'Get notified when a lead status is updated' },
    { key: 'form_submission', label: 'Form submission received',  desc: 'Get notified on each form submission' },
  ]

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <SectionTitle>Notification Events</SectionTitle>
        <div className="space-y-3">
          {rows.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-gray-700 font-medium">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
              <Toggle checked={notifications[key]} onChange={() => toggle(key)} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>Email Recipients</SectionTitle>
        <div className="space-y-2 mb-3">
          {recipients.map((r) => (
            <div key={r} className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
              <span className="text-sm text-gray-700">{r}</span>
              <button onClick={() => removeRecipient(r)} className="text-gray-400 hover:text-red-500 transition-colors text-sm">
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            value={newRecipient}
            onChange={(e) => setNewRecipient(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRecipient()}
            placeholder="Add email address…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={addRecipient}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      <SaveBar onSave={() => { setSaved(true); setTimeout(() => setSaved(false), 2500) }} saved={saved} />
    </div>
  )
}

// ─── Platform credential form ─────────────────────────────────────────────────

type PlatformKey = 'meta' | 'google' | 'linkedin' | 'tiktok'

interface PlatformConfig {
  label:       string
  webhookPath: string
  fields:      { name: string; label: string; placeholder: string; isToken?: boolean }[]
}

const PLATFORM_CONFIGS: Record<PlatformKey, PlatformConfig> = {
  meta: {
    label:       'Meta / Facebook Ads',
    webhookPath: '/api/webhooks/meta',
    fields: [
      { name: 'accessToken', label: 'Access Token',  placeholder: 'EAAxxxxx…', isToken: true },
      { name: 'pageId',      label: 'Page ID',       placeholder: '123456789' },
      { name: 'formId',      label: 'Lead Form ID',  placeholder: '987654321' },
    ],
  },
  google: {
    label:       'Google Ads',
    webhookPath: '/api/webhooks/google',
    fields: [
      { name: 'accessToken', label: 'Access Token',  placeholder: 'ya29.xxxxx', isToken: true },
      { name: 'customerId',  label: 'Customer ID',   placeholder: '123-456-7890' },
    ],
  },
  linkedin: {
    label:       'LinkedIn Ads',
    webhookPath: '/api/webhooks/linkedin',
    fields: [
      { name: 'accessToken',    label: 'Access Token',    placeholder: 'AQVxxxxx…', isToken: true },
      { name: 'organizationId', label: 'Organization ID', placeholder: '12345678' },
    ],
  },
  tiktok: {
    label:       'TikTok Ads',
    webhookPath: '/api/webhooks/tiktok',
    fields: [
      { name: 'accessToken',  label: 'Access Token',   placeholder: 'xxxxxxxx', isToken: true },
      { name: 'advertiserId', label: 'Advertiser ID',  placeholder: '1234567890123456' },
    ],
  },
}

function PlatformCard({
  platform,
  clientId,
  savedValues,
  onSaved,
}: {
  platform:    PlatformKey
  clientId:    string
  savedValues: Record<string, string>
  onSaved?:   () => void
}) {
  const cfg = PLATFORM_CONFIGS[platform]
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  const webhookUrl = `${apiBase}${cfg.webhookPath}`

  const [open, setOpen]         = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [copied, setCopied]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Determine connected status: any non-token field is filled
  const nonTokenFields = cfg.fields.filter((f) => !f.isToken)
  const isConnected    = nonTokenFields.some((f) => !!savedValues[f.name])

  const { register, handleSubmit, reset } = useForm<Record<string, string>>({
    defaultValues: Object.fromEntries(cfg.fields.map((f) => [f.name, ''])),
  })

  async function onSave(data: Record<string, string>) {
    if (!clientId) { setError('No client selected'); return }
    setSaving(true)
    setError(null)
    try {
      const token = localStorage.getItem('access_token')
      const res   = await fetch(`${apiBase}/api/clients/${clientId}/integrations`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ [platform]: data }),
      })
      if (!res.ok) throw new Error((await res.json()).message ?? 'Save failed')
      setSaved(true)
      reset()
      onSaved?.()
      setTimeout(() => setSaved(false), 2500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function copyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-800">{cfg.label}</span>
          {isConnected ? (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
              Connected
            </span>
          ) : (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              Not connected
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
        >
          {open ? 'Close' : 'Configure'}
        </button>
      </div>

      {/* Expandable form */}
      {open && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4 bg-gray-50/50">
          {/* Webhook URL to copy */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Webhook URL — paste this into {cfg.label} dashboard
            </label>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg text-gray-700 font-mono truncate">
                {webhookUrl}
              </code>
              <button
                type="button"
                onClick={copyWebhookUrl}
                className="px-3 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Credential fields */}
          <form onSubmit={handleSubmit(onSave)} className="space-y-3">
            {cfg.fields.map((f) => (
              <div key={f.name}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {f.label}
                  {f.isToken && savedValues[f.name] !== undefined && (
                    <span className="ml-2 text-green-600 font-normal">Token saved</span>
                  )}
                </label>
                <input
                  {...register(f.name)}
                  type={f.isToken ? 'password' : 'text'}
                  placeholder={f.isToken ? '(leave blank to keep existing)' : f.placeholder}
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-gray-900 placeholder:text-gray-400"
                />
              </div>
            ))}

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              {saved && <span className="text-sm text-green-600">Saved!</span>}
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Integrations ────────────────────────────────────────────────────────

function IntegrationsTab() {
  const [webhook, setWebhook]   = useState('')
  const [apiKey, setApiKey]     = useState('qlas_live_xxxxxxxxxxxxxxxxxxxxxxxx')
  const [showKey, setShowKey]   = useState(false)
  const [apiSaved, setApiSaved] = useState(false)

  // Client selection for the Connected Platforms section
  const [clients, setClients]               = useState<{ _id: string; name: string }[]>([])
  const [selectedClientId, setSelId]        = useState('')
  const [clientsLoading, setClientsLoading] = useState(true)
  // Saved non-token integration values per platform (tokens are stripped by backend)
  type IntegrationData = Record<PlatformKey, Record<string, string>>
  const [integrationData, setIntegrationData] = useState<Partial<IntegrationData>>({})

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    fetch(`${apiBase}/api/clients`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((body) => {
        const list = body.data ?? []
        setClients(list)
        if (list.length > 0) setSelId(list[0]._id)
      })
      .catch(() => {})
      .finally(() => setClientsLoading(false))
  }, [apiBase])

  // Re-fetch selected client's integration fields whenever the selection changes
  useEffect(() => {
    if (!selectedClientId) return
    const token = localStorage.getItem('access_token')
    fetch(`${apiBase}/api/clients/${selectedClientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((body) => {
        setIntegrationData(body.data?.integrations ?? {})
      })
      .catch(() => {})
  }, [selectedClientId, apiBase])

  function regenerate() {
    const chars  = 'abcdefghijklmnopqrstuvwxyz0123456789'
    const random = Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setApiKey(`qlas_live_${random}`)
  }

  return (
    <div className="space-y-8 max-w-xl">
      {/* Connected Platforms */}
      <div>
        <SectionTitle>Connected Platforms</SectionTitle>
        <p className="text-xs text-gray-500 mb-4">
          Each platform calls your QLAS webhook when a lead is captured.
          Paste the webhook URL into the platform&apos;s dashboard, then save the credentials here.
        </p>

        {/* Client picker */}
        {!clientsLoading && clients.length > 1 && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Configure for client</label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-gray-900"
            >
              {clients.map((c) => (
                <option key={c._id} value={c._id} className="text-gray-900">{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {clientsLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-gray-500">Create a client first to configure ad platform integrations.</p>
        ) : (
          <div className="space-y-3">
            {(Object.keys(PLATFORM_CONFIGS) as PlatformKey[]).map((p) => (
              <PlatformCard
                key={p}
                platform={p}
                clientId={selectedClientId}
                savedValues={(integrationData[p as PlatformKey] ?? {}) as Record<string, string>}
                onSaved={() => {
                  // Re-fetch integration data so connection status refreshes
                  const token = localStorage.getItem('access_token')
                  fetch(`${apiBase}/api/clients/${selectedClientId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  })
                    .then((r) => r.json())
                    .then((body) => setIntegrationData(body.data?.integrations ?? {}))
                    .catch(() => {})
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Outbound webhook */}
      <div>
        <SectionTitle>Outbound Webhook</SectionTitle>
        <p className="text-xs text-gray-500 mb-3">
          Send lead data to an external URL when a new lead is captured.
        </p>
        <InputField
          label="Webhook URL"
          value={webhook}
          onChange={setWebhook}
          placeholder="https://hooks.example.com/lead"
        />
      </div>

      {/* API key */}
      <div>
        <SectionTitle>API Key</SectionTitle>
        <p className="text-xs text-gray-500 mb-3">
          Use this key to authenticate requests to the QLAS API.
        </p>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
            <code className="text-xs text-gray-700 font-mono truncate">
              {showKey ? apiKey : 'qlas_live_' + '•'.repeat(24)}
            </code>
          </div>
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            onClick={regenerate}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Regenerate
          </button>
        </div>
      </div>

      <SaveBar onSave={() => { setApiSaved(true); setTimeout(() => setApiSaved(false), 2500) }} saved={apiSaved} />
    </div>
  )
}

// ─── Tab: Email ────────────────────────────────────────────────────────────────

function EmailTab() {
  const [saved, setSaved]   = useState(false)
  const [testing, setTesting] = useState(false)
  const [testSent, setTestSent] = useState(false)
  const [smtp, setSmtp]     = useState({
    host:     '',
    port:     '587',
    username: '',
    password: '',
    from:     '',
  })

  function setField(key: keyof typeof smtp) {
    return (v: string) => setSmtp((f) => ({ ...f, [key]: v }))
  }

  async function sendTest() {
    setTesting(true)
    await new Promise((r) => setTimeout(r, 1200))
    setTesting(false)
    setTestSent(true)
    setTimeout(() => setTestSent(false), 3000)
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <SectionTitle>SMTP Configuration</SectionTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InputField label="SMTP Host" value={smtp.host} onChange={setField('host')} placeholder="smtp.example.com" />
            <InputField label="Port"      value={smtp.port} onChange={setField('port')} placeholder="587" />
          </div>
          <InputField label="Username"     value={smtp.username} onChange={setField('username')} placeholder="user@example.com" />
          <InputField label="Password"     type="password" value={smtp.password} onChange={setField('password')} placeholder="••••••••" />
          <InputField label="From Address" type="email"   value={smtp.from}     onChange={setField('from')}     placeholder="noreply@example.com" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={sendTest}
          disabled={testing}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          {testing ? 'Sending…' : 'Send Test Email'}
        </button>
        {testSent && <span className="text-sm text-green-600">Test email sent!</span>}
      </div>

      <SaveBar onSave={() => { setSaved(true); setTimeout(() => setSaved(false), 2500) }} saved={saved} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Lead Settings')

  return (
    <div className="space-y-4">
      {/* Header */}
      <h2 className="text-xl font-semibold text-gray-800">Settings</h2>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/40'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'Lead Settings' && <LeadSettingsTab />}
          {activeTab === 'Notifications' && <NotificationsTab />}
          {activeTab === 'Integrations'  && <IntegrationsTab />}
          {activeTab === 'Email'         && <EmailTab />}
        </div>
      </div>
    </div>
  )
}
