import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import usePageTitle from '@/hooks/usePageTitle'
import { toast } from 'sonner'
import api from '@/services/api'

var ALL_KEYS = [
  'queued','docx_parsing','docx_parsed','ai_analysis','ai_analyzed',
  'latex_generation','latex_generated','preparing_assets','assets_ready',
  'compiling','compiled','quality_check','quality_passed','storing','completed'
]

function getStepStatus(groupKeys, currentStep, projectStatus) {
  if (projectStatus === 'completed') return 'done'
  var ci = ALL_KEYS.indexOf(currentStep)
  var gi = ALL_KEYS.indexOf(groupKeys[0])
  var gl = ALL_KEYS.indexOf(groupKeys[groupKeys.length - 1])
  if (projectStatus === 'failed') {
    if (ci >= gi && ci <= gl) return 'failed'
    if (ci > gl) return 'done'
    return 'pending'
  }
  if (ci > gl) return 'done'
  if (ci >= gi && ci <= gl) return 'active'
  return 'pending'
}

function fmt(ms) {
  if (!ms) return '-'
  var s = Math.floor(ms / 1000)
  return s < 60 ? s + 's' : Math.floor(s / 60) + 'dk ' + (s % 60) + 's'
}

function fmtSize(b) {
  if (!b) return '-'
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(1) + ' MB'
}

function fmtDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

var API_BASE = import.meta.env.VITE_API_URL || '/api'

function downloadFile(projectId, type, filename, t) {
  var token = localStorage.getItem('token')
  fetch(API_BASE + '/projects/' + projectId + '/download/' + type, {
    headers: { Authorization: 'Bearer ' + token }
  })
    .then(function(r) { if (!r.ok) throw new Error(); return r.blob() })
    .then(function(blob) {
      var a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
    })
    .catch(function() { toast.error(t('project.downloadFailed')) })
}

export default function ProjectDetailPage() {
  var params = useParams()
  var id = params.id
  var navigate = useNavigate()
  var { t } = useTranslation()
  var _a = useState(null), project = _a[0], setProject = _a[1]
  usePageTitle(project ? project.name : t('common.loading'))
  var _b = useState(true), loading = _b[0], setLoading = _b[1]
  var _c = useState(false), retrying = _c[0], setRetrying = _c[1]
  var _d = useState(null), pdfUrl = _d[0], setPdfUrl = _d[1]

  var STEP_GROUPS = [
    { keys: ['queued'], label: t('project.steps.fileReceived'), icon: '📋' },
    { keys: ['docx_parsing', 'docx_parsed'], label: t('project.steps.docxParsed'), icon: '📄' },
    { keys: ['ai_analysis', 'ai_analyzed'], label: t('project.steps.aiAnalysis'), icon: '🤖' },
    { keys: ['latex_generation', 'latex_generated'], label: t('project.steps.latexGeneration'), icon: '📝' },
    { keys: ['preparing_assets', 'assets_ready'], label: t('project.steps.assetsReady'), icon: '🖼️' },
    { keys: ['compiling', 'compiled'], label: t('project.steps.compiling'), icon: '⚙️' },
    { keys: ['quality_check', 'quality_passed'], label: t('project.steps.qualityCheck'), icon: '✅' },
    { keys: ['storing', 'completed'], label: t('project.steps.completed'), icon: '🎉' },
  ]

  var fetchProject = useCallback(async function() {
    try {
      var res = await api.get('/projects/' + id)
      if (res.data.success) setProject(res.data.project)
    } catch (e) {
      toast.error(t('project.loadFailed'))
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, t])

  useEffect(function() { fetchProject() }, [fetchProject])

  useEffect(function() {
    if (!project || project.status === 'completed' || project.status === 'failed') return
    var iv = setInterval(fetchProject, 3000)
    return function() { clearInterval(iv) }
  }, [project && project.status, fetchProject])

  useEffect(function() {
    if (!project || project.status !== 'completed' || !project.output_pdf_url) return
    var token = localStorage.getItem('token')
    fetch(API_BASE + '/projects/' + id + '/download/pdf', {
      headers: { Authorization: 'Bearer ' + token }
    })
      .then(function(r) { return r.blob() })
      .then(function(blob) { setPdfUrl(URL.createObjectURL(blob)) })
      .catch(function() { toast.error(t('project.pdfPreviewFailed') || 'PDF \u00f6nizleme y\u00fcklenemedi') })
  }, [project && project.status, project && project.output_pdf_url, id])

  var handleRetry = async function() {
    setRetrying(true)
    try {
      var res = await api.post('/typeset/retry/' + id)
      if (res.data.success) { toast.success(t('project.retryStarted')); fetchProject() }
    } catch (e) {
      toast.error((e.response && e.response.data && e.response.data.error) || t('project.retryFailed'))
    } finally { setRetrying(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
  if (!project) return null

  var badgeMap = {
    pending:    { cls: 'bg-gray-100 text-gray-700', txt: t('dashboard.status.pending') },
    processing: { cls: 'bg-blue-100 text-blue-700', txt: t('dashboard.status.processing') },
    completed:  { cls: 'bg-green-100 text-green-700', txt: t('dashboard.status.completed') },
    failed:     { cls: 'bg-red-100 text-red-700', txt: t('dashboard.status.failed') }
  }
  var badge = badgeMap[project.status] || { cls: 'bg-gray-100 text-gray-700', txt: project.status }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={function() { navigate('/dashboard') }} className="text-gray-500 hover:text-gray-700 text-sm">
            ← {t('common.back')}
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-sm text-gray-500">{fmtDate(project.created_at)}</p>
          </div>
        </div>
        <span className={'px-3 py-1 rounded-full text-sm font-medium ' + badge.cls}>{badge.txt}</span>
      </div>

      {project.status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <span className="text-red-500 text-xl mt-0.5">❌</span>
          <div className="flex-1">
            <h3 className="font-semibold text-red-800">{t('project.errorTitle')}</h3>
            <p className="text-red-600 text-sm mt-1">{project.error_message || t('project.unknownError')}</p>
          </div>
          <button onClick={handleRetry} disabled={retrying}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium whitespace-nowrap">
            {retrying ? '⏳ ' + t('project.retrying') : '🔄 ' + t('common.retry')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">{t('project.status')}</h2>
            <div className="mb-6">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">{t('project.progress')}</span>
                <span className="text-sm font-semibold text-blue-600">{project.progress || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5" role="progressbar" aria-valuenow={project.progress || 0} aria-valuemin={0} aria-valuemax={100} aria-label={t('project.progress')}>
                <div className={'h-2.5 rounded-full transition-all duration-500 ' + (
                  project.status === 'failed' ? 'bg-red-500' :
                  project.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                )} style={{ width: (project.progress || 0) + '%' }}></div>
              </div>
            </div>

            <div className="space-y-3">
              {STEP_GROUPS.map(function(g, i) {
                var st = getStepStatus(g.keys, project.current_step, project.status)
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className={'w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ' + (
                      st === 'done'   ? 'bg-green-100 text-green-600' :
                      st === 'active' ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-300' :
                      st === 'failed' ? 'bg-red-100 text-red-600' :
                                        'bg-gray-100 text-gray-400'
                    )} role="img" aria-label={g.label + ' - ' + st}>
                      {st === 'done' ? '✓' :
                       st === 'active' ? <span className="animate-pulse">{g.icon}</span> :
                       st === 'failed' ? '✗' :
                       <span className="text-xs">{i + 1}</span>}
                    </div>
                    <span className={'text-sm ' + (
                      st === 'done'   ? 'text-green-700 font-medium' :
                      st === 'active' ? 'text-blue-700 font-semibold' :
                      st === 'failed' ? 'text-red-600 font-medium' : 'text-gray-400'
                    )}>
                      {g.label}{st === 'active' ? '...' : ''}
                    </span>
                  </div>
                )
              })}
            </div>

            {project.status === 'completed' && (
              <div className="mt-6 pt-4 border-t space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('project.result')}</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('project.pageCount')}</span>
                  <span className="font-medium">{project.page_count || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('project.fileSize')}</span>
                  <span className="font-medium">{fmtSize(project.file_size)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('project.processingTime')}</span>
                  <span className="font-medium">{fmt(project.processing_time_ms)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {project.status === 'completed' && (
              <div className="p-4 border-b flex flex-wrap gap-3">
                <button onClick={function() { downloadFile(id, 'pdf', project.name + '.pdf', t) }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                  📥 {t('project.downloadPdf')}
                </button>
                <button onClick={function() { downloadFile(id, 'latex', project.name + '_latex.zip', t) }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">
                  📄 {t('project.downloadLatex')}
                </button>
                <button onClick={handleRetry} disabled={retrying}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium disabled:opacity-50">
                  🔄 {t('project.retypeset')}
                </button>
              </div>
            )}

            <div className="bg-gray-100" style={{ minHeight: 600 }}>
              {project.status === 'completed' && pdfUrl ? (
                <iframe src={pdfUrl} className="w-full border-0" style={{ height: '75vh' }} title="PDF"></iframe>
              ) : project.status === 'processing' ? (
                <div className="flex flex-col items-center justify-center h-96 p-8 text-center">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">{t('project.processing')}</h3>
                  <p className="text-gray-500">{t('project.processingDesc')}</p>
                </div>
              ) : project.status === 'failed' ? (
                <div className="flex flex-col items-center justify-center h-96 p-8 text-center">
                  <span className="text-6xl mb-4">😞</span>
                  <h3 className="text-lg font-semibold text-red-700 mb-2">{t('project.failedTitle')}</h3>
                  <p className="text-gray-500">{project.error_message || t('project.failedDesc')}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 p-8 text-center">
                  <span className="text-6xl mb-4">📋</span>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">{t('project.pendingTitle')}</h3>
                  <p className="text-gray-500">{t('project.pendingDesc')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {project.settings && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">{t('project.settings')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              [t('project.settingsLabels.pageSize'), project.settings.pageSize || 'A5'],
              [t('project.settingsLabels.font'), project.settings.fontFamily || 'Garamond'],
              [t('project.settingsLabels.fontSize'), (project.settings.fontSize || '11') + 'pt'],
              [t('project.settingsLabels.lineSpacing'), project.settings.lineSpacing || '1.15'],
              [t('project.settingsLabels.chapterStyle'), project.settings.chapterStyle || 'classic'],
              [t('project.settingsLabels.language'), project.settings.language === 'en' ? 'English' : 'Türkçe'],
              [t('project.settingsLabels.margins'), project.settings.margins || 'standard'],
            ].map(function(item, i) {
              return (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{item[0]}</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{item[1]}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
