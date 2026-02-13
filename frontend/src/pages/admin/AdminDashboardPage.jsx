import { useState, useEffect } from 'react'
import { adminAPI } from '@/services/adminApi'
import { Users, FolderKanban, Loader2, Activity, UserPlus, Ban, CheckCircle, XCircle, Percent } from 'lucide-react'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-stone-400 text-sm">{label}</span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminAPI.dashboard()
      .then(res => setStats(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>
  }

  if (!stats) {
    return <p className="text-stone-400">İstatistikler yüklenemedi.</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Main Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Toplam Kullanıcı" value={stats.totalUsers} color="#f59e0b" />
        <StatCard icon={FolderKanban} label="Toplam Proje" value={stats.totalProjects} color="#3b82f6" />
        <StatCard icon={Activity} label="Aktif İşlem" value={stats.activeProcessing} color="#10b981" />
        <StatCard icon={UserPlus} label="Bugün Kayıt" value={stats.todayRegistrations} color="#8b5cf6" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard icon={CheckCircle} label="Başarılı" value={stats.totalCompleted} color="#10b981" />
        <StatCard icon={XCircle} label="Başarısız" value={stats.totalFailed} color="#ef4444" />
        <StatCard icon={Percent} label="Başarı Oranı" value={`%${stats.successRate}`} color="#06b6d4" />
        <StatCard icon={Ban} label="Banlı Kullanıcı" value={stats.bannedUsers} color="#ef4444" />
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Plan Breakdown */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-stone-300 mb-4">Plan Dağılımı</h2>
          <div className="space-y-3">
            {(stats.planBreakdown || []).map(item => {
              const colors = { free: 'bg-stone-600', pro: 'bg-blue-500', enterprise: 'bg-purple-500' }
              const pct = stats.totalUsers > 0 ? Math.round((item.count / stats.totalUsers) * 100) : 0
              return (
                <div key={item.plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-stone-400 capitalize">{item.plan}</span>
                    <span className="font-mono font-bold">{item.count} <span className="text-stone-500 font-normal">(%{pct})</span></span>
                  </div>
                  <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${colors[item.plan] || 'bg-stone-600'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-stone-300 mb-4">Proje Durumları</h2>
          <div className="space-y-3">
            {(stats.statusBreakdown || []).map(item => {
              const colors = { completed: 'text-green-400', processing: 'text-blue-400', failed: 'text-red-400', pending: 'text-yellow-400' }
              return (
                <div key={item.status} className="flex items-center justify-between">
                  <span className={`text-sm capitalize ${colors[item.status] || 'text-stone-400'}`}>{item.status}</span>
                  <span className="text-sm font-mono font-bold">{item.count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Role Breakdown */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-stone-300 mb-4">Rol Dağılımı</h2>
          <div className="space-y-3">
            {(stats.roleBreakdown || []).map(item => {
              const colors = { user: 'text-stone-400', admin: 'text-blue-400', superadmin: 'text-amber-400' }
              return (
                <div key={item.role} className="flex items-center justify-between">
                  <span className={`text-sm ${colors[item.role] || 'text-stone-400'}`}>{item.role}</span>
                  <span className="text-sm font-mono font-bold">{item.count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
