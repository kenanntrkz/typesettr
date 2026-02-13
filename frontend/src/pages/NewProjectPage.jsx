import { useTranslation } from 'react-i18next'
import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { projectAPI, fileAPI, typesetAPI } from '@/services/api'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'
import {
  Upload, FileText, ChevronRight, ChevronLeft, Check,
  Loader2, BookOpen, Type, Columns, AlignLeft, Minus,
  Rocket, X
} from 'lucide-react'



const PAGE_SIZES = [
  { value: 'a4paper', label: 'A4 (210×297mm)', desc: 'Standart' },
  { value: 'a5paper', label: 'A5 (148×210mm)', desc: 'Roman / Hikaye' },
  { value: 'b5paper', label: 'B5 (176×250mm)', desc: 'Akademik' },
  { value: 'letterpaper', label: 'Letter (216×279mm)', desc: 'US Standart' },
]

const FONTS = [
  { value: 'ebgaramond', label: 'Garamond', desc: 'Roman / hikaye için ideal' },
  { value: 'palatino', label: 'Palatino', desc: 'Akademik için ideal' },
  { value: 'times', label: 'Times New Roman', desc: 'Klasik' },
  { value: 'libertine', label: 'Linux Libertine', desc: 'Modern' },
]

const CHAPTER_STYLES = [
  { value: 'classic', label: 'Klasik', desc: 'Geleneksel bölüm başlığı' },
  { value: 'modern', label: 'Modern', desc: 'Sol hizalı, çizgi dekor' },
  { value: 'academic', label: 'Akademik', desc: 'Numaralı hiyerarşi' },
  { value: 'minimal', label: 'Minimalist', desc: 'Sadece başlık' },
]

export default function NewProjectPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const STEPS = [t("wizard.step1Title"), t("wizard.step2Title"), t("wizard.step3Title"), t("wizard.step4Title")]
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Step 1: File
  const [file, setFile] = useState(null)
  const [fileId, setFileId] = useState(null)
  const [fileUrl, setFileUrl] = useState(null)

  // Step 2: Settings
  const [projectName, setProjectName] = useState('')
  const [pageSize, setPageSize] = useState('a5paper')
  const [margins, setMargins] = useState('standard')
  const [font, setFont] = useState('ebgaramond')
  const [fontSize, setFontSize] = useState('11pt')
  const [lineSpacing, setLineSpacing] = useState(1.15)
  const [chapterStyle, setChapterStyle] = useState('classic')
  const [language, setLanguage] = useState('tr')
  const [features, setFeatures] = useState({
    toc: true,
    lof: true,
    lot: true,
    footnotes: true,
    bibliography: false,
    pageNumbers: true,
    header: true,
    footer: true,
    coverPage: false,
  })

  // Step 3: Cover
  const [coverTitle, setCoverTitle] = useState('')
  const [coverAuthor, setCoverAuthor] = useState('')
  const [coverSubtitle, setCoverSubtitle] = useState('')
  const [coverTemplateId, setCoverTemplateId] = useState('classic-serif')
  const [coverTemplates, setCoverTemplates] = useState([])

  // Fetch cover templates
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || '/api'
    fetch(apiBase + '/covers/templates')
      .then(r => r.json())
      .then(d => { if (d.success) setCoverTemplates(d.data) })
      .catch(() => { toast.error(t('wizard.coverTemplatesFailed') || 'Kapak şablonları yüklenemedi') })
  }, [])

  // File upload
  const onDrop = useCallback(async (acceptedFiles) => {
    const f = acceptedFiles[0]
    if (!f) return
    if (!f.name.endsWith('.docx')) {
      toast.error(t('wizard.onlyDocx'))
      return
    }
    if (f.size > 50 * 1024 * 1024) {
      toast.error(t('wizard.fileTooLarge'))
      return
    }

    setFile(f)
    setProjectName(f.name.replace('.docx', ''))
    setLoading(true)
    setUploadProgress(0)

    try {
      const { data } = await fileAPI.upload(f, (progress) => {
        setUploadProgress(progress)
      })
      setFileId(data.file?.id || data.fileId || data.id)
      setFileUrl(data.file?.storage_path || data.url)
      toast.success(t('wizard.fileUploaded'))
    } catch (err) {
      toast.error(t('wizard.uploadFailed') + ': ' + (err.response?.data?.error || err.message))
      setFile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    maxFiles: 1,
    disabled: loading,
  })

  const toggleFeature = (key) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Submit
  const handleSubmit = async () => {
    setLoading(true)
    try {
      const settings = {
        pageSize, margins, fontFamily: font, fontSize, lineSpacing,
        chapterStyle, language, features,
      }
      const coverData = features.coverPage ? {
        templateId: coverTemplateId,
        title: coverTitle || projectName,
        author: coverAuthor,
        subtitle: coverSubtitle,
      } : null

      const { data: project } = await projectAPI.create({
        name: projectName,
        settings,
        coverData,
        fileId,
      })

      // Start typesetting
      await typesetAPI.start(project.id || project.project?.id)
      toast.success(t('wizard.typesetStarted'))
      navigate(`/projects/${project.id || project.project?.id}`)
    } catch (err) {
      toast.error(t('wizard.projectFailed') + ': ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  const canNext = () => {
    if (step === 0) return !!fileId
    if (step === 1) return !!projectName
    if (step === 2) return true
    return true
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                style={{
                  backgroundColor: i <= step ? 'hsl(30, 20%, 12%)' : 'hsl(35, 15%, 88%)',
                  color: i <= step ? 'hsl(45, 30%, 95%)' : 'hsl(30, 10%, 55%)',
                }}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className="text-sm hidden sm:inline"
                style={{ color: i <= step ? 'hsl(30, 20%, 12%)' : 'hsl(30, 10%, 55%)' }}
              >
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="w-8 h-px mx-2"
                style={{ backgroundColor: i < step ? 'hsl(30, 20%, 12%)' : 'hsl(35, 15%, 85%)' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* ===== STEP 1: FILE UPLOAD ===== */}
      {step === 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Dosyanızı yükleyin
          </h2>
          <p className="mb-8" style={{ color: 'hsl(30, 10%, 45%)' }}>
            Word (.docx) dosyanızı sürükleyip bırakın veya seçin.
          </p>

          {!file ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-stone-500 bg-stone-100' : ''
              }`}
              style={{
                borderColor: isDragActive ? 'hsl(25, 60%, 30%)' : 'hsl(35, 15%, 80%)',
                backgroundColor: isDragActive ? 'hsl(40, 30%, 94%)' : 'hsl(40, 25%, 96%)',
              }}
            >
              <input {...getInputProps()} />
              <Upload className="w-10 h-10 mx-auto mb-4" style={{ color: 'hsl(30, 10%, 55%)' }} />
              <p className="text-lg font-medium mb-1">
                {isDragActive ? 'Bırakın...' : 'DOCX dosyanızı sürükleyin'}
              </p>
              <p className="text-sm" style={{ color: 'hsl(30, 10%, 55%)' }}>
                veya dosya seçmek için tıklayın — Maks. 50MB
              </p>
            </div>
          ) : (
            <div
              className="border rounded-xl p-6"
              style={{ borderColor: 'hsl(35, 15%, 88%)', backgroundColor: 'hsl(40, 25%, 96%)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'hsl(35, 25%, 90%)' }}
                  >
                    <FileText className="w-6 h-6" style={{ color: 'hsl(25, 60%, 30%)' }} />
                  </div>
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm" style={{ color: 'hsl(30, 10%, 55%)' }}>
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                {fileId ? (
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5" style={{ color: 'hsl(140, 50%, 35%)' }} />
                    <button
                      onClick={() => { setFile(null); setFileId(null); setFileUrl(null); }}
                      className="p-1 rounded hover:bg-stone-200"
                    >
                      <X className="w-4 h-4" style={{ color: 'hsl(30, 10%, 55%)' }} />
                    </button>
                  </div>
                ) : (
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'hsl(30, 10%, 55%)' }} />
                )}
              </div>
              {loading && (
                <div className="mt-4">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'hsl(35, 15%, 88%)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%`, backgroundColor: 'hsl(25, 60%, 30%)' }}
                    />
                  </div>
                  <p className="text-xs mt-1 text-right" style={{ color: 'hsl(30, 10%, 55%)' }}>
                    %{uploadProgress}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== STEP 2: SETTINGS ===== */}
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Kitap ayarları
          </h2>
          <p className="mb-8" style={{ color: 'hsl(30, 10%, 45%)' }}>
            Dizgi tercihlerinizi belirleyin.
          </p>

          <div className="space-y-8">
            {/* Project name */}
            <div>
              <Label className="text-sm font-medium">Proje Adı</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="mt-2 h-11 rounded-lg"
                style={{ backgroundColor: 'hsl(40, 25%, 96%)', borderColor: 'hsl(35, 15%, 85%)' }}
                placeholder="Kitabınızın adı"
              />
            </div>

            {/* Page size */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Sayfa Boyutu</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PAGE_SIZES.map((ps) => (
                  <button
                    key={ps.value}
                    onClick={() => setPageSize(ps.value)}
                    className="p-3 rounded-lg border text-left transition-all"
                    style={{
                      borderColor: pageSize === ps.value ? 'hsl(25, 60%, 30%)' : 'hsl(35, 15%, 85%)',
                      backgroundColor: pageSize === ps.value ? 'hsl(35, 30%, 93%)' : 'hsl(40, 25%, 96%)',
                    }}
                  >
                    <p className="text-sm font-medium">{ps.label}</p>
                    <p className="text-xs" style={{ color: 'hsl(30, 10%, 55%)' }}>{ps.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Font */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Font</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {FONTS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFont(f.value)}
                    className="p-3 rounded-lg border text-left transition-all"
                    style={{
                      borderColor: font === f.value ? 'hsl(25, 60%, 30%)' : 'hsl(35, 15%, 85%)',
                      backgroundColor: font === f.value ? 'hsl(35, 30%, 93%)' : 'hsl(40, 25%, 96%)',
                    }}
                  >
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-xs" style={{ color: 'hsl(30, 10%, 55%)' }}>{f.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Font size + line spacing */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium mb-3 block">Font Boyutu</Label>
                <div className="flex gap-2">
                  {['10pt', '11pt', '12pt'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setFontSize(s)}
                      className="flex-1 py-2 rounded-lg border text-sm transition-all"
                      style={{
                        borderColor: fontSize === s ? 'hsl(25, 60%, 30%)' : 'hsl(35, 15%, 85%)',
                        backgroundColor: fontSize === s ? 'hsl(35, 30%, 93%)' : 'hsl(40, 25%, 96%)',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-3 block">Satır Aralığı</Label>
                <div className="flex gap-2">
                  {[1.0, 1.15, 1.5, 2.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => setLineSpacing(s)}
                      className="flex-1 py-2 rounded-lg border text-sm transition-all"
                      style={{
                        borderColor: lineSpacing === s ? 'hsl(25, 60%, 30%)' : 'hsl(35, 15%, 85%)',
                        backgroundColor: lineSpacing === s ? 'hsl(35, 30%, 93%)' : 'hsl(40, 25%, 96%)',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chapter style */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Bölüm Stili</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CHAPTER_STYLES.map((cs) => (
                  <button
                    key={cs.value}
                    onClick={() => setChapterStyle(cs.value)}
                    className="p-3 rounded-lg border text-left transition-all"
                    style={{
                      borderColor: chapterStyle === cs.value ? 'hsl(25, 60%, 30%)' : 'hsl(35, 15%, 85%)',
                      backgroundColor: chapterStyle === cs.value ? 'hsl(35, 30%, 93%)' : 'hsl(40, 25%, 96%)',
                    }}
                  >
                    <p className="text-sm font-medium">{cs.label}</p>
                    <p className="text-xs" style={{ color: 'hsl(30, 10%, 55%)' }}>{cs.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Dil</Label>
              <div className="flex gap-3">
                {[
                  { value: 'tr', label: '🇹🇷 Türkçe' },
                  { value: 'en', label: '🇬🇧 İngilizce' },
                ].map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLanguage(l.value)}
                    className="px-5 py-2.5 rounded-lg border text-sm transition-all"
                    style={{
                      borderColor: language === l.value ? 'hsl(25, 60%, 30%)' : 'hsl(35, 15%, 85%)',
                      backgroundColor: language === l.value ? 'hsl(35, 30%, 93%)' : 'hsl(40, 25%, 96%)',
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Features toggles */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Ek Özellikler</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: 'toc', label: 'İçindekiler' },
                  { key: 'lof', label: 'Şekiller Listesi' },
                  { key: 'lot', label: 'Tablolar Listesi' },
                  { key: 'footnotes', label: 'Dipnot Desteği' },
                  { key: 'bibliography', label: 'Kaynakça (BibTeX)' },
                  { key: 'pageNumbers', label: t('wizard.pageNumbers') },
                  { key: 'header', label: 'Üst Bilgi' },
                  { key: 'footer', label: 'Alt Bilgi' },
                  { key: 'coverPage', label: t('wizard.coverPage') },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => toggleFeature(f.key)}
                    className="flex items-center gap-2 p-3 rounded-lg border text-sm text-left transition-all"
                    style={{
                      borderColor: features[f.key] ? 'hsl(25, 60%, 30%)' : 'hsl(35, 15%, 85%)',
                      backgroundColor: features[f.key] ? 'hsl(35, 30%, 93%)' : 'hsl(40, 25%, 96%)',
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: features[f.key] ? 'hsl(25, 60%, 30%)' : 'transparent',
                        border: features[f.key] ? 'none' : '1.5px solid hsl(35, 15%, 75%)',
                      }}
                    >
                      {features[f.key] && <Check className="w-3 h-3 text-white" />}
                    </div>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== STEP 3: COVER ===== */}
      {step === 2 && (
        <div>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            {features.coverPage ? t('wizard.step3Title') : t('wizard.coverDisabled')}
          </h2>
          {features.coverPage ? (
            <div className="space-y-6 mt-6">
              <div>
                <Label className="text-sm font-medium mb-3 block">{t("wizard.selectTemplate")}</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {coverTemplates.map(tpl => (
                    <button key={tpl.id} type="button"
                      onClick={() => setCoverTemplateId(tpl.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${coverTemplateId === tpl.id ? 'border-amber-600 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
                      style={coverTemplateId === tpl.id ? { backgroundColor: 'hsl(40, 30%, 97%)' } : {}}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-full" style={{ backgroundColor: tpl.colors.primary }} />
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tpl.colors.accent }} />
                      </div>
                      <div className="font-medium text-sm">{tpl.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'hsl(30,10%,50%)' }}>{tpl.category}</div>
                      {coverTemplateId === tpl.id && <Check className="w-4 h-4 mt-1" style={{ color: '#8B6914' }} />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">{t("wizard.bookTitle")}</Label>
                  <Input value={coverTitle || projectName} onChange={(e) => setCoverTitle(e.target.value)}
                    className="mt-2 h-11 rounded-lg"
                    style={{ backgroundColor: 'hsl(40, 25%, 96%)', borderColor: 'hsl(35, 15%, 85%)' }} />
                </div>
                <div>
                  <Label className="text-sm font-medium">{t("wizard.authorName")}</Label>
                  <Input value={coverAuthor} onChange={(e) => setCoverAuthor(e.target.value)}
                    className="mt-2 h-11 rounded-lg"
                    style={{ backgroundColor: 'hsl(40, 25%, 96%)', borderColor: 'hsl(35, 15%, 85%)' }}
                    placeholder={t("wizard.authorPlaceholder")} />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">{t("wizard.subtitle")}</Label>
                <Input value={coverSubtitle} onChange={(e) => setCoverSubtitle(e.target.value)}
                  className="mt-2 h-11 rounded-lg"
                  style={{ backgroundColor: 'hsl(40, 25%, 96%)', borderColor: 'hsl(35, 15%, 85%)' }} />
              </div>
            </div>
          ) : (
            <p className="mt-4" style={{ color: 'hsl(30, 10%, 45%)' }}>
              \u00d6nceki ad\u0131mda "Kapak Sayfas\u0131" \u00f6zelli\u011fini a\u00e7arak kapak ekleyebilirsiniz.
            </p>
          )}
        </div>
      )}

      {/* ===== STEP 4: CONFIRMATION ===== */}
      {step === 3 && (
        <div>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Özet ve onay
          </h2>
          <p className="mb-8" style={{ color: 'hsl(30, 10%, 45%)' }}>
            Ayarlarınızı gözden geçirin ve dizgiyi başlatın.
          </p>

          <div
            className="rounded-xl border p-6 space-y-4"
            style={{ borderColor: 'hsl(35, 15%, 88%)', backgroundColor: 'hsl(40, 25%, 96%)' }}
          >
            {[
              ['Proje', projectName],
              [t('wizard.step1Title'), file?.name],
              [t('wizard.pageSizeLabel'), PAGE_SIZES.find(p => p.value === pageSize)?.label],
              ['Font', FONTS.find(f => f.value === font)?.label + ' / ' + fontSize],
              ['Satır Aralığı', lineSpacing.toString()],
              ['Bölüm Stili', CHAPTER_STYLES.find(c => c.value === chapterStyle)?.label],
              ['Dil', language === 'tr' ? 'Türkçe' : 'İngilizce'],
              ['Özellikler', Object.entries(features).filter(([,v]) => v).map(([k]) => {
                const map = { toc:t('wizard.toc'), lof:t('wizard.lof'), lot:t('wizard.lot'), footnotes:t('wizard.footnotes'), bibliography:t('wizard.bibliography'), pageNumbers:t('wizard.pageNumbers'), header:t('wizard.header'), footer:t('wizard.footer'), coverPage:t('wizard.coverPage') }
                return map[k] || k
              }).join(', ')],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 border-b last:border-0" style={{ borderColor: 'hsl(35, 15%, 90%)' }}>
                <span className="text-sm" style={{ color: 'hsl(30, 10%, 45%)' }}>{label}</span>
                <span className="text-sm font-medium text-right max-w-[60%]">{value}</span>
              </div>
            ))}
          </div>

          <div
            className="mt-6 p-4 rounded-lg text-center text-sm"
            style={{ backgroundColor: 'hsl(35, 25%, 90%)', color: 'hsl(30, 10%, 40%)' }}
          >
            ⏱ Tahmini işleme süresi: <strong>3-5 dakika</strong>
          </div>
        </div>
      )}

      {/* ===== NAVIGATION ===== */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t" style={{ borderColor: 'hsl(35, 15%, 88%)' }}>
        <Button
          variant="outline"
          onClick={() => step === 0 ? navigate('/dashboard') : setStep(step - 1)}
          className="rounded-full px-6"
          style={{ borderColor: 'hsl(35, 15%, 80%)' }}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {step === 0 ? 'İptal' : 'Geri'}
        </Button>

        {step < 3 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="rounded-full px-6 bg-stone-900 text-white hover:bg-stone-800"
          >
            İleri
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-full px-8 bg-stone-900 text-white hover:bg-stone-800"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}
            Dizgiyi Başlat
          </Button>
        )}
      </div>
    </div>
  )
}
