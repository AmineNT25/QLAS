'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import PasswordInput from '@/components/PasswordInput'

const TABS = ['Prospect Settings', 'Notifications', 'Outreach Email'] as const
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

// ─── Tab: Prospect Settings ───────────────────────────────────────────────────

function ProspectSettingsTab() {
  const [saved, setSaved]           = useState(false)
  const [statuses, setStatuses]     = useState(DEFAULT_STATUSES)
  const [newStatus, setNewStatus]   = useState('')
  const [autoResponse, setAutoResponse] = useState(false)
  const [template, setTemplate]     = useState(
    "Hi {{name}},\n\nThank you for your interest. We'll be in touch shortly.\n\nBest regards,\nThe Team",
  )

  function addStatus() {
    const s = newStatus.trim()
    if (s && !statuses.includes(s)) setStatuses((prev) => [...prev, s])
    setNewStatus('')
  }

  function removeStatus(s: string) {
    setStatuses((prev) => prev.filter((x) => x !== s))
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <SectionTitle>Prospect Status</SectionTitle>
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

      <div>
        <SectionTitle>Auto-Response Email</SectionTitle>
        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <Toggle checked={autoResponse} onChange={setAutoResponse} />
          <span className="text-sm text-gray-700">Send auto-response when a prospect is received</span>
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
            <p className="text-xs text-gray-400 mt-1">
              Use {'{{name}}'}, {'{{email}}'} as placeholders.
            </p>
          </div>
        )}
      </div>

      <SaveBar onSave={() => { setSaved(true); setTimeout(() => setSaved(false), 2500) }} saved={saved} />
    </div>
  )
}

// ─── Tab: Notifications ───────────────────────────────────────────────────────

function NotificationsTab() {
  const [saved, setSaved] = useState(false)
  const [notifications, setNotifications] = useState({
    new_prospect:      true,
    status_changed:    true,
    high_score:        true,
    email_opened:      false,
    meeting_scheduled: true,
  })
  const [recipients, setRecipients]     = useState(['admin@example.com'])
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
    { key: 'new_prospect',      label: 'New prospect discovered',        desc: 'Get notified when a new business is added to prospects' },
    { key: 'status_changed',    label: 'Prospect status changed',        desc: "Get notified when a prospect's pipeline status is updated" },
    { key: 'high_score',        label: 'High opportunity score detected', desc: 'Get notified when a business scores above 70' },
    { key: 'email_opened',      label: 'Outreach email opened',          desc: 'Get notified when a prospect opens your outreach email' },
    { key: 'meeting_scheduled', label: 'Meeting scheduled',              desc: 'Get notified when a prospect moves to Meeting Scheduled' },
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
            <div
              key={r}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 bg-gray-50"
            >
              <span className="text-sm text-gray-700">{r}</span>
              <button
                onClick={() => removeRecipient(r)}
                className="text-gray-400 hover:text-red-500 transition-colors text-sm"
              >
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

// ─── Tab: Outreach Email ──────────────────────────────────────────────────────

const MERGE_TAGS = ['[Business Name]', '[Name]', '[City]'] as const

function MergeTags({ onInsert }: { onInsert: (tag: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      <span className="text-xs text-gray-400 self-center">Insert:</span>
      {MERGE_TAGS.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onInsert(tag)}
          className="px-2 py-0.5 rounded text-xs font-mono bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition-colors"
        >
          {tag}
        </button>
      ))}
    </div>
  )
}

function TemplateCard({
  number,
  title,
  defaultSubject,
  defaultBody,
}: {
  number: number
  title: string
  defaultSubject: string
  defaultBody: string
}) {
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody]       = useState('')
  const [saved, setSaved]     = useState(false)
  const bodyRef               = useRef<HTMLTextAreaElement>(null)

  function insertTag(tag: string) {
    const el = bodyRef.current
    if (!el) { setBody((v) => v + tag); return }
    const start = el.selectionStart
    const end   = el.selectionEnd
    setBody((v) => v.slice(0, start) + tag + v.slice(end))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + tag.length, start + tag.length)
    })
  }

  function handleSave() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
    fetch(`${apiBase}/api/settings/outreach-templates`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ [`template${number}`]: { subject, body } }),
    }).catch(() => {})
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Template {number} — {title}
      </p>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Body</label>
        <textarea
          ref={bodyRef}
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={defaultBody}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
        <MergeTags onInsert={insertTag} />
      </div>
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
        >
          Save Template
        </button>
        {saved && <span className="text-sm text-green-600">Saved!</span>}
      </div>
    </div>
  )
}

type SenderFields = { fromName: string; fromEmail: string; replyTo: string }

function OutreachEmailTab() {
  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

  // Section 1 — Sender Configuration
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<SenderFields>()
  const [senderSaved, setSenderSaved] = useState(false)

  async function saveSender(data: SenderFields) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
    await fetch(`${apiBase}/api/settings/outreach-email`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    }).catch(() => {})
    setSenderSaved(true)
    setTimeout(() => setSenderSaved(false), 2500)
  }

  // Section 2 — Email Signature
  const MAX_SIG = 500
  const [signature, setSignature] = useState('')
  const [sigSaved, setSigSaved]   = useState(false)

  // Section 4 — Resend Configuration
  const [apiKey, setApiKey]           = useState('')
  const [testing, setTesting]         = useState(false)
  const [testResult, setTestResult]   = useState<'sent' | 'error' | null>(null)
  const [resendSaved, setResendSaved] = useState(false)
  const isConfigured                  = apiKey.trim().length > 0

  async function testConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
      const res     = await fetch(`${apiBase}/api/settings/test-email`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ apiKey }),
      })
      setTestResult(res.ok ? 'sent' : 'error')
    } catch {
      setTestResult('error')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-8 max-w-lg">

      {/* Section 1: Sender Configuration */}
      <div>
        <SectionTitle>Sender Configuration</SectionTitle>
        <form onSubmit={handleSubmit(saveSender)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Name</label>
            <input
              {...register('fromName')}
              type="text"
              placeholder="Ahmed — Media Leo Tech"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Email</label>
            <input
              {...register('fromEmail')}
              type="email"
              placeholder="outreach@medialeotech.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reply-To Email</label>
            <input
              {...register('replyTo')}
              type="email"
              placeholder="hello@medialeotech.com"
              className={inputClass}
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
            {senderSaved && <span className="text-sm text-green-600">Saved!</span>}
          </div>
        </form>
      </div>

      {/* Section 2: Email Signature */}
      <div>
        <SectionTitle>Email Signature</SectionTitle>
        <textarea
          rows={6}
          value={signature}
          onChange={(e) => setSignature(e.target.value.slice(0, MAX_SIG))}
          placeholder={`Best regards,\nAhmed\nMedia Leo Tech\n+212 6 00 00 00 00\nmedialeotech.com`}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
        <p className="text-xs text-gray-400 text-right mt-1">{signature.length} / {MAX_SIG}</p>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => { setSigSaved(true); setTimeout(() => setSigSaved(false), 2500) }}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
          >
            Save Changes
          </button>
          {sigSaved && <span className="text-sm text-green-600">Saved!</span>}
        </div>
      </div>

      {/* Section 3: Outreach Templates */}
      <div>
        <SectionTitle>Outreach Templates</SectionTitle>
        <div className="space-y-4">
          <TemplateCard
            number={1}
            title="First Contact"
            defaultSubject="Quick question about [Business Name]"
            defaultBody="Hi [Name], I came across your business and noticed there might be some opportunities to help you attract more customers online. Would you be open to a quick chat?"
          />
          <TemplateCard
            number={2}
            title="Follow Up"
            defaultSubject="Following up — [Business Name]"
            defaultBody="Hi [Name], I wanted to follow up on my previous message. We've helped similar businesses in [City] grow their online presence. Happy to share some ideas if you're interested."
          />
          <TemplateCard
            number={3}
            title="Final Follow Up"
            defaultSubject="Last message — [Business Name]"
            defaultBody="Hi [Name], I'll keep this short. If you're ever looking to grow your customer base online, we'd love to help. Feel free to reach out anytime."
          />
        </div>
      </div>

      {/* Section 4: SMTP / Resend Configuration */}
      <div>
        <SectionTitle>SMTP / Resend Configuration</SectionTitle>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">Resend API Key</label>
              {isConfigured ? (
                <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  Connected
                </span>
              ) : (
                <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  Not configured
                </span>
              )}
            </div>
            <PasswordInput
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={testConnection}
              disabled={testing || !isConfigured}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              {testing ? 'Sending…' : 'Test Connection'}
            </button>
            {testResult === 'sent'  && <span className="text-sm text-green-600">Test email sent!</span>}
            {testResult === 'error' && <span className="text-sm text-red-600">Failed to send test email.</span>}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setResendSaved(true); setTimeout(() => setResendSaved(false), 2500) }}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
            >
              Save Changes
            </button>
            {resendSaved && <span className="text-sm text-green-600">Saved!</span>}
          </div>
        </div>
      </div>

    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Prospect Settings')

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Settings</h2>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
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

        <div className="p-6">
          {activeTab === 'Prospect Settings' && <ProspectSettingsTab />}
          {activeTab === 'Notifications'     && <NotificationsTab />}
          {activeTab === 'Outreach Email'    && <OutreachEmailTab />}
        </div>
      </div>
    </div>
  )
}
