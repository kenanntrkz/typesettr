import { useState, useEffect } from 'react'
import { adminAPI } from '@/services/adminApi'
import { Loader2, RefreshCw, RotateCcw, Trash2, Clock, Play, CheckCircle, XCircle, Pause } from 'lucide-react'

function QueueStatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex items-center gap-3">
      <Icon className="w-5 h-5" style={{ color }} />
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-stone-400">{label}</p>
      </div>
    </div>
  )
}

export default function AdminQueuePage() {
  const [stats, setStats] = useState(null)
  const [jobs, setJobs] = useState([])
  const [jobStatus, setJobStatus] = useState('failed')
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [statsRes, jobsRes] = await Promise.all([
        adminAPI.queueStats(),
        adminAPI.queueJobs({ status: jobStatus })
      ])
      setStats(statsRes.data.data)
      setJobs(jobsRes.data.data.jobs)
    } catch { /* */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [jobStatus])

  const handleRetry = async (jobId) => {
    try { await adminAPI.retryJob(jobId); fetchAll() }
    catch { /* */ }
  }

  const handleClean = async (status) => {
    if (!confirm(`Tüm "${status}" işleri temizlensin mi?`)) return
    try { await adminAPI.cleanQueue(status); fetchAll() }
    catch { /* */ }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kuyruk Yönetimi</h1>
        <button onClick={fetchAll} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 text-sm transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Yenile
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <QueueStatCard label="Bekleyen" value={stats.waiting} icon={Clock} color="#f59e0b" />
          <QueueStatCard label="Aktif" value={stats.active} icon={Play} color="#3b82f6" />
          <QueueStatCard label="Tamamlanan" value={stats.completed} icon={CheckCircle} color="#10b981" />
          <QueueStatCard label="Başarısız" value={stats.failed} icon={XCircle} color="#ef4444" />
          <QueueStatCard label="Ertelenmiş" value={stats.delayed} icon={Pause} color="#8b5cf6" />
        </div>
      )}

      {/* Clean buttons */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => handleClean('failed')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors">
          <Trash2 className="w-3 h-3" /> Başarısızları Temizle
        </button>
        <button onClick={() => handleClean('completed')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs font-medium transition-colors">
          <Trash2 className="w-3 h-3" /> Tamamlananları Temizle
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-4">
        {['failed', 'waiting', 'active', 'completed', 'delayed'].map(s => (
          <button key={s} onClick={() => setJobStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${jobStatus === s ? 'bg-amber-500 text-stone-900' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Jobs table */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-800 text-stone-400 text-left">
                <th className="px-4 py-3 font-medium">Job ID</th>
                <th className="px-4 py-3 font-medium">Proje</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Deneme</th>
                <th className="px-4 py-3 font-medium">Hata</th>
                <th className="px-4 py-3 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id} className="border-b border-stone-800/50">
                  <td className="px-4 py-3 font-mono text-xs text-stone-300">{job.id}</td>
                  <td className="px-4 py-3 text-stone-300">{job.data?.projectName || job.data?.projectId || '-'}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs">
                    {job.timestamp ? new Date(job.timestamp).toLocaleString('tr-TR') : '-'}
                  </td>
                  <td className="px-4 py-3 text-stone-400">{job.attemptsMade}</td>
                  <td className="px-4 py-3 text-red-400 text-xs max-w-[200px] truncate">{job.failedReason || '-'}</td>
                  <td className="px-4 py-3">
                    {jobStatus === 'failed' && (
                      <button onClick={() => handleRetry(job.id)}
                        className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors" title="Yeniden Dene">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-500">Bu durumda iş yok</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
