import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-blue-600 tracking-tight">QLAS</h1>
        <p className="text-gray-500 text-sm">Leads Acquisition System</p>
        <div className="flex gap-3 justify-center pt-2">
          <Link
            href="/dashboard"
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/login"
            className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}
