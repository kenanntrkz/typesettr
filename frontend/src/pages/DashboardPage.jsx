import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { projectAPI } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'
import {
  Plus, BookOpen, Clock, FileText, Download,
  Eye, Trash2, Loader2, AlertCircle, CheckCircle2,
  Timer, RotateCcw
} from 'lucide-react'

function ProjectCard({ project, onDelete, t }) {
  const navigate = useNavigate()

  const statusMap = {
    pending:    { label: t('dashboard.status.pending'),    color: 'hsl(30, 10%, 55%)',  bg: 'hsl(35, 15%, 90%)',  icon: Timer },
    processing: { label: t('dashboard.status.processing'), color: 'hsl(210, 70%, 45%)', bg: 'hsl(210, 60%, 93%)', icon: Loader2 },
    completed:  { label: t('dashboard.status.completed'),  color: 'hsl(140, 50%, 35%)', bg: 'hsl(140, 40%, 92%)', icon: CheckCircle2 },
    failed:     { label: t('dashboard.status.failed'),     color: 'hsl(0, 70%, 50%)',   bg: 'hsl(0, 60%, 94%)',   icon: AlertCircle },
  }

  const status = statusMap[project.status] || statusMap.pending
  const StatusIcon = status.icon
  const isProcessing = project.status === 'processing'

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return t('dashboard.status.pending') === 'Pending' ? 'Just now' : 'Az önce'
    if (mins < 60) return `${mins} ${t('dashboard.status.pending') === 'Pending' ? 'min ago' : 'dk önce'}`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} ${t('dashboard.status.pending') === 'Pending' ? 'hr ago' : 'saat önce'}`
    const days = Math.floor(hours / 24)
    return `${days} ${t('dashboard.status.pending') === 'Pending' ? 'days ago' : 'gün önce'}`
  }

  const formatSize = (bytes) => {
    if (!bytes) return '-'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div
      className="p-6 rounded-xl border hover:shadow-md transition-shadow cursor-pointer"
      style={{ borderColor: 'hsl(35, 15%, 88%)', backgroundColor: 'hsl(40, 25%, 96%)' }}
      onClick={() => navigate('/projects/' + project.id)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'hsl(35, 25%, 90%)' }}>
            <BookOpen className="w-5 h-5" style={{ color: 'hsl(25, 60%, 30%)' }} />
          </div>
          <div>
            <h3 className="font-semibold text-base leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              {project.name}
            </h3>
            <span className="text-xs" style={{ color: 'hsl(30, 10%, 55%)' }}>
              <Clock className="w-3 h-3 inline mr-1" />
              {timeAgo(project.updated_at || project.created_at)}
            </span>
          </div>
        </div>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1"
          style={{ backgroundColor: status.bg, color: status.color }}
        >
          <StatusIcon className={'w-3 h-3' + (isProcessing ? ' animate-spin' : '')} />
          {status.label}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-4 text-xs" style={{ color: 'hsl(30, 10%, 50%)' }}>
        {project.page_count ? (
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {project.page_count} {t('dashboard.pages')}
          </span>
        ) : null}
        {project.file_size ? <span>{formatSize(project.file_size)}</span> : null}
        {project.processing_time_ms ? <span>{(project.processing_time_ms / 1000).toFixed(0)}s</span> : null}
      </div>

      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {project.status === 'completed' && (
          <>
            <Button size="sm" variant="outline" className="rounded-full text-xs h-8 px-3" style={{ borderColor: 'hsl(35, 15%, 80%)' }}
              onClick={() => navigate('/projects/' + project.id)}>
              <Eye className="w-3 h-3 mr-1" /> {t('dashboard.view')}
            </Button>
            <Button size="sm" className="rounded-full text-xs h-8 px-3 bg-stone-900 text-white hover:bg-stone-800"
              onClick={() => {
                var token = localStorage.getItem('token')
                var url = 'http://91.99.207.148:3100/api/projects/' + project.id + '/download/pdf'
                fetch(url, { headers: { Authorization: 'Bearer ' + token } })
                  .then(function(r) { return r.blob() })
                  .then(function(blob) {
                    var a = document.createElement('a')
                    a.href = URL.createObjectURL(blob)
                    a.download = project.name + '.pdf'
                    a.click()
                  })
                  .catch(function() { toast.error(t('project.downloadFailed')) })
              }}>
              <Download className="w-3 h-3 mr-1" /> {t('common.download')}
            </Button>
          </>
        )}
        {project.status === 'failed' && (
          <Button size="sm" variant="outline" className="rounded-full text-xs h-8 px-3"
            style={{ borderColor: 'hsl(0, 50%, 80%)', color: 'hsl(0, 70%, 50%)' }}
            onClick={() => navigate('/projects/' + project.id)}>
            <RotateCcw className="w-3 h-3 mr-1" /> {t('common.retry')}
          </Button>
        )}
        <Button size="sm" variant="ghost" className="rounded-full text-xs h-8 w-8 p-0 ml-auto hover:bg-red-50"
          onClick={() => onDelete(project.id)}>
          <Trash2 className="w-3 h-3" style={{ color: 'hsl(0, 50%, 55%)' }} />
        </Button>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(function() { loadProjects() }, [])

  var loadProjects = async function() {
    try {
      var res = await projectAPI.list()
      setProjects(res.data.projects || res.data || [])
    } catch (err) {
      toast.error(t('project.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  var handleDelete = async function(id) {
    if (!confirm(t('common.confirm') + '?')) return
    try {
      await projectAPI.delete(id)
      setProjects(function(prev) { return prev.filter(function(p) { return p.id !== id }) })
      toast.success(t('common.success'))
    } catch (err) {
      toast.error(t('common.error'))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            {t('dashboard.title')}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'hsl(30, 10%, 45%)' }}>
            {user?.name || ''} 
          </p>
        </div>
        <Button onClick={function() { navigate('/projects/new') }}
          className="bg-stone-900 text-white hover:bg-stone-800 rounded-full px-6">
          <Plus className="w-4 h-4 mr-2" /> {t('nav.newProject')}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'hsl(30, 10%, 55%)' }} />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'hsl(35, 25%, 90%)' }}>
            <BookOpen className="w-8 h-8" style={{ color: 'hsl(25, 60%, 30%)' }} />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            {t('dashboard.empty')}
          </h2>
          <p className="mb-6" style={{ color: 'hsl(30, 10%, 45%)' }}>
            {t('dashboard.emptyDesc')}
          </p>
          <Button onClick={function() { navigate('/projects/new') }}
            className="bg-stone-900 text-white hover:bg-stone-800 rounded-full px-8 py-5 text-base">
            <Plus className="w-4 h-4 mr-2" /> {t('dashboard.createFirst')}
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(function(project) {
            return <ProjectCard key={project.id} project={project} onDelete={handleDelete} t={t} />
          })}
        </div>
      )}
    </div>
  )
}
