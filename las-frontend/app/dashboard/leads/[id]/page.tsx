export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Lead Detail</h2>
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
        <p className="text-sm text-gray-500">
          Lead ID: <span className="font-mono text-gray-800">{id}</span>
        </p>
      </div>
    </div>
  )
}
