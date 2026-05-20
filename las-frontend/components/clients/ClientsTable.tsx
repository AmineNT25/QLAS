'use client'

/** An agency client account, as returned by the backend `/api/clients`. */
export interface Client {
  _id:        string
  name:       string
  industry?:  string
  website?:   string
  createdAt:  string
}

/** Editable fields accepted by POST / PATCH `/api/clients`. */
export interface ClientInput {
  name:     string
  industry: string
  website:  string
}

interface Props {
  clients:         Client[]
  deletingId:      string | null
  onEdit:          (client: Client) => void
  onDelete:        (id: string) => void
  onDeleteConfirm: (id: string) => void
  onDeleteCancel:  () => void
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
            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Industry</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Website</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Date Added</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {clients.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-16 text-center text-gray-400">
                No clients yet. Add your first client to get started.
              </td>
            </tr>
          ) : (
            clients.map((client) => (
              <tr key={client._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-800 whitespace-nowrap font-medium">
                  {client.name}
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{client.industry || '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {client.website ? (
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:text-brand-700 hover:underline"
                    >
                      {client.website}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap tabular-nums text-xs">
                  {new Date(client.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {deletingId === client._id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Delete?</span>
                      <button
                        onClick={() => onDeleteConfirm(client._id)}
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
                        onClick={() => onDelete(client._id)}
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
