import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAPI } from '@/services/adminApi'
import { Search, Loader2, ChevronLeft, ChevronRight, Ban, ShieldCheck } from 'lucide-react'

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20 }
      if (search) params.search = search
      if (planFilter) params.plan = planFilter
      const res = await adminAPI.listUsers(params)
      setUsers(res.data.data.users)
      setTotal(res.data.data.total)
      setTotalPages(res.data.data.totalPages)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [page, search, planFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  const handleBan = async (userId, currentBanned) => {
    if (!confirm(currentBanned ? 'Engeli kaldırmak istediğinize emin misiniz?' : 'Kullanıcıyı engellemek istediğinize emin misiniz?')) return
    try {
      await adminAPI.toggleBan(userId, !currentBanned)
      fetchUsers()
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kullanıcılar <span className="text-stone-500 text-lg font-normal">({total})</span></h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            type="text"
            placeholder="E-posta veya isim ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded-lg pl-10 pr-4 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
          />
        </form>
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1) }}
          className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
        >
          <option value="">Tüm Planlar</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
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
                <th className="px-4 py-3 font-medium">İsim</th>
                <th className="px-4 py-3 font-medium">E-posta</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Proje</th>
                <th className="px-4 py-3 font-medium">Kayıt</th>
                <th className="px-4 py-3 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr
                  key={u.id}
                  className="border-b border-stone-800/50 hover:bg-stone-800/30 cursor-pointer"
                  onClick={() => navigate(`/admin/users/${u.id}`)}
                >
                  <td className="px-4 py-3 font-medium">
                    <span className={u.is_banned ? 'line-through text-red-400' : ''}>{u.name}</span>
                  </td>
                  <td className="px-4 py-3 text-stone-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      u.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-400' :
                      u.plan === 'pro' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-stone-700 text-stone-300'
                    }`}>
                      {u.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.role === 'superadmin' && <ShieldCheck className="w-4 h-4 text-amber-500 inline" />}
                    {u.role === 'admin' && <ShieldCheck className="w-4 h-4 text-blue-400 inline" />}
                    <span className="ml-1 text-stone-400 text-xs">{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-stone-400">{u.projects_count}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs">{new Date(u.created_at).toLocaleDateString('tr-TR')}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleBan(u.id, u.is_banned) }}
                      className={`p-1.5 rounded-lg transition-colors ${u.is_banned ? 'text-green-400 hover:bg-green-500/10' : 'text-red-400 hover:bg-red-500/10'}`}
                      title={u.is_banned ? 'Engeli Kaldır' : 'Engelle'}
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-500">Kullanıcı bulunamadı</td>
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
