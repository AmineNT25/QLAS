'use client'

export interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  company: string | null
  address: string | null
  notes: string | null
  status: 'active' | 'inactive' | 'archived'
  created_at: string
}

const STATUS_CLASSES: Record<string, string> = {
  active:   'bg-green-100 text-green-700',
  inactive: 'bg-gray-100  text-gray-600',
  archived: 'bg-red-100   text-red-600',
}

interface Props {
  clients: Client[]
  deletingId: string | null
  onEdit: (client: Client) => void
  onDelete: (id: string) => void
  onDeleteConfirm: (id: string) => void
  onDeleteCancel: () => void
}

export default function ClientsTable({
  clients,
  deletingId,
  onEdit,
  onDelete,
  onDeleteConfirm,
  onDeleteCancel,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Email</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Phone</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Company</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Date Added</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {clients.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                No clients yet. Add your first client to get started.
              </td>
            </tr>
          ) : (
            clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-800 whitespace-nowrap font-medium">
                  {client.first_name} {client.last_name}
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{client.email}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{client.phone ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{client.company ?? '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      STATUS_CLASSES[client.status] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {client.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap tabular-nums text-xs">
                  {new Date(client.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {deletingId === client.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Delete?</span>
                      <button
                        onClick={() => onDeleteConfirm(client.id)}
                        className="px-2.5 py-1 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={onDeleteCancel}
                        className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit(client)}
                        className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(client.id)}
                        className="px-2.5 py-1 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
