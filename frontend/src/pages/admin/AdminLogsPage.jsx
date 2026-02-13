import { useState, useEffect, useCallback } from 'react'
import { adminAPI } from '@/services/adminApi'
import { Search, Loader2, ChevronLeft, ChevronRight, ScrollText } from 'lucide-react'

const actionLabels = {
  'user.role_change': 'Rol Değişikliği',
  'user.plan_change': 'Plan Değişikliği',
  'user.ban': 'Kullanıcı Engellendi',
  'user.unban': 'Engel Kaldırıldı',
  'project.delete': 'Proje Silindi',
  'queue.clean': 'Kuyruk Temizlendi',
  'settings.update': 'Ayar Güncellendi',
}

const actionColors = {
  'user.ban': 'text-red-400',
  'user.unban': 'text-green-400',
  'project.delete': 'text-red-400',
  'settings.update': 'text-amber-400',
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 30 }
      if (search) params.search = search
      if (actionFilter) params.action = actionFilter
      const res = await adminAPI.auditLogs(params)
      setLogs(res.data.data.logs)
      setTotal(res.data.data.total)
      setTotalPages(res.data.data.totalPages)
    } catch { /* */ }
    finally { setLoading(false) }
  }, [page, search, actionFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-amber-500" /> Aktivite Logları
          <span className="text-stone-500 text-lg font-normal">({total})</span>
        </h1>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchLogs() }} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input type="text" placeholder="Admin email veya aksiyon ara..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded-lg pl-10 pr-4 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500" />
        </form>
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
          className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500">
          <option value="">Tüm Aksiyonlar</option>
          <option value="user.role_change">Rol Değişikliği</option>
          <option value="user.plan_change">Plan Değişikliği</option>
          <option value="user.ban">Ban</option>
          <option value="user.unban">Unban</option>
          <option value="project.delete">Proje Silme</option>
          <option value="settings.update">Ayar Güncelleme</option>
          <option value="queue.clean">Kuyruk Temizleme</option>
        </select>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-800 text-stone-400 text-left">
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Aksiyon</th>
                <th className="px-4 py-3 font-medium">Detay</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-stone-800/50">
                  <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-stone-300">{log.admin_email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${actionColors[log.action] || 'text-blue-400'}`}>
                      {actionLabels[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-400 text-xs max-w-[300px] truncate">
                    {log.details ? JSON.stringify(log.details) : '-'}
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs font-mono">{log.ip_address || '-'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-500">Henüz log yok</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg text-stone-400 hover:bg-stone-800 disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-stone-400">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-2 rounded-lg text-stone-400 hover:bg-stone-800 disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
