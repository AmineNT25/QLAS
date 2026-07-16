import { Suspense } from 'react'
import LeadsContent from './LeadsContent'

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-gray-400">Loading…</div>}>
      <LeadsContent />
    </Suspense>
  )
}
