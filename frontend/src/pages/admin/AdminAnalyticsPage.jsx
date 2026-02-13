import { useState, useEffect } from 'react'
import { adminAPI } from '@/services/adminApi'
import { Loader2, TrendingUp } from 'lucide-react'

function BarChart({ data, labelKey, valueKey, color = '#f59e0b', height = 120 }) {
  if (!data || data.length === 0) return <p className="text-stone-500 text-xs">Veri yok</p>
  const maxVal = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1)
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => {
        const val = Number(d[valueKey]) || 0
        const h = Math.max((val / maxVal) * 100, 2)
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-6 bg-stone-800 text-stone-200 text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {d[labelKey]}: {val}
            </div>
            <div className="w-full rounded-t" style={{ height: `${h}%`, backgroundColor: color, minHeight: 2 }} />
          </div>
        )
      })}
    </div>
  )
}

function HourlyChart({ data }) {
  if (!data || data.length === 0) return <p className="text-stone-500 text-xs">Veri yok</p>
  const hours = Array.from({ length: 24 }, (_, i) => {
    const found = data.find(d => d.hour === i)
    return { hour: `${i}:00`, count: found ? Number(found.count) : 0 }
  })
  return <BarChart data={hours} labelKey="hour" valueKey="count" color="#3b82f6" height={80} />
}

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState('7d')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminAPI.stats(period)
      .then(res => setStats(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  if (loading && !stats) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-amber-500" /> Analitik
        </h1>
        <div className="flex gap-1">
          {['7d', '30d', '90d'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p ? 'bg-amber-500 text-stone-900' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}>
              {p === '7d' ? '7 Gün' : p === '30d' ? '30 Gün' : '90 Gün'}
            </button>
          ))}
        </div>
      </div>

      {stats && (
        <div className="space-y-6">
          {/* Daily Users */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-stone-300 mb-4">Günlük Yeni Kayıtlar</h2>
            <BarChart data={stats.dailyUsers} labelKey="date" valueKey="count" color="#8b5cf6" />
            <div className="flex justify-between text-xs text-stone-600 mt-2">
              <span>{stats.dailyUsers?.[0]?.date}</span>
              <span>{stats.dailyUsers?.[stats.dailyUsers.length - 1]?.date}</span>
            </div>
          </div>

          {/* Daily Projects */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-stone-300 mb-4">Günlük Projeler</h2>
            <BarChart data={stats.dailyProjects} labelKey="date" valueKey="count" color="#f59e0b" />
            <div className="flex justify-between text-xs text-stone-600 mt-2">
              <span>{stats.dailyProjects?.[0]?.date}</span>
              <span>{stats.dailyProjects?.[stats.dailyProjects.length - 1]?.date}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Avg Processing Time */}
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-stone-300 mb-4">Ortalama İşlem Süresi (ms)</h2>
              <BarChart data={stats.avgProcessingTime} labelKey="date" valueKey="avg_ms" color="#10b981" height={80} />
            </div>

            {/* Hourly Distribution */}
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-stone-300 mb-4">Saatlik Dağılım</h2>
              <HourlyChart data={stats.hourlyDistribution} />
              <div className="flex justify-between text-xs text-stone-600 mt-2">
                <span>00:00</span><span>12:00</span><span>23:00</span>
              </div>
            </div>
          </div>

          {/* Top Users */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-stone-300 mb-4">En Aktif Kullanıcılar</h2>
            {stats.topUsers?.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-800 text-stone-400 text-left">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">İsim</th>
                    <th className="pb-2 font-medium">E-posta</th>
                    <th className="pb-2 font-medium text-right">Proje</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topUsers.map((u, i) => (
                    <tr key={i} className="border-b border-stone-800/50">
                      <td className="py-2 text-stone-500">{i + 1}</td>
                      <td className="py-2 font-medium">{u.name}</td>
                      <td className="py-2 text-stone-400">{u.email}</td>
                      <td className="py-2 text-right font-mono font-bold text-amber-400">{u.project_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-stone-500 text-xs">Veri yok</p>}
          </div>

          {/* Cumulative Growth */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-stone-300 mb-4">Kümülatif Kullanıcı Büyümesi</h2>
            <BarChart data={stats.cumulativeUsers} labelKey="date" valueKey="cumulative" color="#06b6d4" />
            <div className="flex justify-between text-xs text-stone-600 mt-2">
              <span>{stats.cumulativeUsers?.[0]?.date}</span>
              <span>{stats.cumulativeUsers?.[stats.cumulativeUsers.length - 1]?.date}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
