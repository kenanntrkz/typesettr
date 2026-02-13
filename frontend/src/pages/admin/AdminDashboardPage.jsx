import { useState, useEffect } from 'react'
import { adminAPI } from '@/services/adminApi'
import { Users, FolderKanban, Loader2, Activity, UserPlus } from 'lucide-react'

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
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    )
  }

  if (!stats) {
    return <p className="text-stone-400">İstatistikler yüklenemedi.</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Toplam Kullanıcı" value={stats.totalUsers} color="#f59e0b" />
        <StatCard icon={FolderKanban} label="Toplam Proje" value={stats.totalProjects} color="#3b82f6" />
        <StatCard icon={Activity} label="Aktif İşlem" value={stats.activeProcessing} color="#10b981" />
        <StatCard icon={UserPlus} label="Bugün Kayıt" value={stats.todayRegistrations} color="#8b5cf6" />
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Plan Breakdown */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-stone-300 mb-4">Plan Dağılımı</h2>
          <div className="space-y-3">
            {(stats.planBreakdown || []).map(item => (
              <div key={item.plan} className="flex items-center justify-between">
                <span className="text-sm text-stone-400 capitalize">{item.plan}</span>
                <span className="text-sm font-mono font-bold">{item.count}</span>
              </div>
            ))}
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
      </div>
    </div>
  )
}
