import { useState, useEffect } from 'react'
import { adminAPI } from '@/services/adminApi'
import { Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react'

function ServiceCard({ name, data }) {
  const isOk = data?.status === 'ok'
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-stone-200">{name}</span>
        {isOk ? (
          <CheckCircle className="w-5 h-5 text-green-400" />
        ) : (
          <XCircle className="w-5 h-5 text-red-400" />
        )}
      </div>
      <p className={`text-xs ${isOk ? 'text-green-400' : 'text-red-400'}`}>
        {isOk ? 'Çalışıyor' : data?.message || 'Bağlantı hatası'}
      </p>
      {data?.waiting !== undefined && (
        <div className="mt-3 space-y-1 text-xs text-stone-400">
          <p>Bekleyen: <span className="font-mono text-stone-200">{data.waiting}</span></p>
          <p>Aktif: <span className="font-mono text-stone-200">{data.active}</span></p>
          <p>Başarısız: <span className="font-mono text-red-400">{data.failed}</span></p>
        </div>
      )}
    </div>
  )
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}g ${h}s ${m}dk`
  if (h > 0) return `${h}s ${m}dk`
  return `${m}dk`
}

export default function AdminSystemPage() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchHealth = async () => {
    setLoading(true)
    try {
      const res = await adminAPI.systemHealth()
      setHealth(res.data.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHealth() }, [])

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sistem Sağlığı</h1>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 text-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {health && (
        <>
          {/* Services */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <ServiceCard name="PostgreSQL" data={health.postgresql} />
            <ServiceCard name="Redis" data={health.redis} />
            <ServiceCard name="MinIO" data={health.minio} />
            <ServiceCard name="İş Kuyruğu" data={health.queue} />
          </div>

          {/* Server Info */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-stone-300 mb-4">Sunucu Bilgileri</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-stone-500 text-xs mb-1">Uptime</p>
                <p className="font-mono">{formatUptime(health.uptime)}</p>
              </div>
              <div>
                <p className="text-stone-500 text-xs mb-1">RSS Bellek</p>
                <p className="font-mono">{formatBytes(health.memory?.rss)}</p>
              </div>
              <div>
                <p className="text-stone-500 text-xs mb-1">Heap Kullanımı</p>
                <p className="font-mono">{formatBytes(health.memory?.heapUsed)}</p>
              </div>
              <div>
                <p className="text-stone-500 text-xs mb-1">Heap Toplam</p>
                <p className="font-mono">{formatBytes(health.memory?.heapTotal)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
