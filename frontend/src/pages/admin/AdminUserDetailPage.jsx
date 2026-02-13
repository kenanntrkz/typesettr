import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminAPI } from '@/services/adminApi'
import { useAuthStore } from '@/stores/authStore'
import { ArrowLeft, Loader2, Ban, FolderKanban } from 'lucide-react'

export default function AdminUserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const currentUser = useAuthStore(s => s.user)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const res = await adminAPI.getUser(id)
      setData(res.data.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [id])

  const handlePlanChange = async (plan) => {
    try {
      await adminAPI.updateUserPlan(id, plan)
      fetchData()
    } catch {
      // ignore
    }
  }

  const handleRoleChange = async (role) => {
    if (!confirm(`Rol "${role}" olarak değiştirilsin mi?`)) return
    try {
      await adminAPI.updateUserRole(id, role)
      fetchData()
    } catch {
      // ignore
    }
  }

  const handleBan = async () => {
    const banned = !data.user.is_banned
    if (!confirm(banned ? 'Kullanıcı engellensin mi?' : 'Engel kaldırılsın mı?')) return
    try {
      await adminAPI.toggleBan(id, banned)
      fetchData()
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    )
  }

  if (!data) {
    return <p className="text-stone-400">Kullanıcı bulunamadı.</p>
  }

  const { user, projects } = data
  const isSuperAdmin = currentUser?.role === 'superadmin'

  return (
    <div>
      <button
        onClick={() => navigate('/admin/users')}
        className="flex items-center gap-2 text-stone-400 hover:text-stone-100 mb-6 text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Kullanıcılara Dön
      </button>

      {/* User Info */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {user.name}
              {user.is_banned && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">BANNED</span>}
            </h1>
            <p className="text-stone-400 text-sm mt-1">{user.email}</p>
            <p className="text-stone-500 text-xs mt-1">ID: {user.id}</p>
            <p className="text-stone-500 text-xs">Kayıt: {new Date(user.created_at).toLocaleString('tr-TR')}</p>
          </div>
          <button
            onClick={handleBan}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              user.is_banned
                ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
            }`}
          >
            <Ban className="w-4 h-4" />
            {user.is_banned ? 'Engeli Kaldır' : 'Engelle'}
          </button>
        </div>

        {/* Plan & Role Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div>
            <label className="text-xs text-stone-500 mb-2 block">Plan</label>
            <div className="flex gap-2">
              {['free', 'pro', 'enterprise'].map(p => (
                <button
                  key={p}
                  onClick={() => handlePlanChange(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    user.plan === p
                      ? 'bg-amber-500 text-stone-900'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          {isSuperAdmin && (
            <div>
              <label className="text-xs text-stone-500 mb-2 block">Rol</label>
              <div className="flex gap-2">
                {['user', 'admin', 'superadmin'].map(r => (
                  <button
                    key={r}
                    onClick={() => handleRoleChange(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      user.role === r
                        ? 'bg-amber-500 text-stone-900'
                        : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Projects */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-stone-300 mb-4 flex items-center gap-2">
          <FolderKanban className="w-4 h-4" /> Projeler ({projects.length})
        </h2>
        {projects.length === 0 ? (
          <p className="text-stone-500 text-sm">Henüz proje yok.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-800 text-stone-400 text-left">
                <th className="pb-2 font-medium">Proje Adı</th>
                <th className="pb-2 font-medium">Durum</th>
                <th className="pb-2 font-medium">Sayfa</th>
                <th className="pb-2 font-medium">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} className="border-b border-stone-800/50">
                  <td className="py-2 font-medium">{p.name}</td>
                  <td className="py-2">
                    <span className={`text-xs ${
                      p.status === 'completed' ? 'text-green-400' :
                      p.status === 'failed' ? 'text-red-400' :
                      p.status === 'processing' ? 'text-blue-400' :
                      'text-yellow-400'
                    }`}>{p.status}</span>
                  </td>
                  <td className="py-2 text-stone-400">{p.page_count || '-'}</td>
                  <td className="py-2 text-stone-500 text-xs">{new Date(p.created_at).toLocaleDateString('tr-TR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
