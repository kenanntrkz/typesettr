import { useState, useEffect, useCallback } from 'react'
import { adminAPI } from '@/services/adminApi'
import { Search, Loader2, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20 }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      const res = await adminAPI.listProjects(params)
      setProjects(res.data.data.projects)
      setTotal(res.data.data.total)
      setTotalPages(res.data.data.totalPages)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchProjects()
  }

  const handleDelete = async (projectId, name) => {
    if (!confirm(`"${name}" projesini silmek istediğinize emin misiniz?`)) return
    try {
      await adminAPI.deleteProject(projectId)
      fetchProjects()
    } catch {
      // ignore
    }
  }

  const statusColors = {
    completed: 'bg-green-500/20 text-green-400',
    processing: 'bg-blue-500/20 text-blue-400',
    failed: 'bg-red-500/20 text-red-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projeler <span className="text-stone-500 text-lg font-normal">({total})</span></h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            type="text"
            placeholder="Proje adı ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded-lg pl-10 pr-4 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
          />
        </form>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
        >
          <option value="">Tüm Durumlar</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-800 text-stone-400 text-left">
                <th className="px-4 py-3 font-medium">Proje Adı</th>
                <th className="px-4 py-3 font-medium">Sahip</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">Sayfa</th>
                <th className="px-4 py-3 font-medium">Boyut</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} className="border-b border-stone-800/50 hover:bg-stone-800/30">
                  <td className="px-4 py-3 font-medium max-w-[200px] truncate">{p.name}</td>
                  <td className="px-4 py-3 text-stone-400">{p.User?.name || p.User?.email || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[p.status] || 'bg-stone-700 text-stone-300'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-400">{p.page_count || '-'}</td>
                  <td className="px-4 py-3 text-stone-400">
                    {p.file_size ? `${(p.file_size / 1024 / 1024).toFixed(1)} MB` : '-'}
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs">{new Date(p.created_at).toLocaleDateString('tr-TR')}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-500">Proje bulunamadı</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg text-stone-400 hover:bg-stone-800 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-stone-400">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg text-stone-400 hover:bg-stone-800 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
