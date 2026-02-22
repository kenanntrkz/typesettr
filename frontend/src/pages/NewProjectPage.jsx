import { useTranslation } from 'react-i18next'
import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import usePageTitle from '@/hooks/usePageTitle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { projectAPI, fileAPI, typesetAPI } from '@/services/api'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'
import {
  Upload, FileText, ChevronRight, ChevronLeft, Check,
  Loader2, BookOpen, Type, Columns, AlignLeft, Minus,
  Rocket, X, ClipboardList
} from 'lucide-react'



const DOCUMENT_TYPES = [
  { value: 'book', label: 'Kitap', desc: 'Roman, hikaye, kitap', icon: BookOpen },
  { value: 'article', label: 'Makale', desc: 'Kısa belge, makale', icon: FileText },
  { value: 'report', label: 'Rapor', desc: 'Rapor, tez, proje', icon: Columns },
  { value: 'exam', label: 'Sınav', desc: 'Sınav kağıdı', icon: ClipboardList },
]

const PAGE_SIZES = [
  { value: 'a4paper', label: 'A4 (210\u00d7297mm)', desc: 'Standart' },
  { value: 'a5paper', label: 'A5 (148\u00d7210mm)', desc: 'Roman / Hikaye' },
  { value: 'b5paper', label: 'B5 (176\u00d7250mm)', desc: 'Akademik' },
  { value: 'letterpaper', label: 'Letter (216\u00d7279mm)', desc: 'US Standart' },
]

const FONTS = [
  { value: 'ebgaramond', label: 'Garamond', desc: 'Roman / hikaye i\u00e7in ideal' },
  { value: 'palatino', label: 'Palatino', desc: 'Akademik i\u00e7in ideal' },
  { value: 'times', label: 'Times New Roman', desc: 'Klasik' },
  { value: 'libertine', label: 'Linux Libertine', desc: 'Modern' },
]

const CHAPTER_STYLES = [
  { value: 'classic', label: 'Klasik', desc: 'Geleneksel b\u00f6l\u00fcm ba\u015fl\u0131\u011f\u0131' },
  { value: 'modern', label: 'Modern', desc: 'Sol hizal\u0131, \u00e7izgi dekor' },
  { value: 'academic', label: 'Akademik', desc: 'Numaral\u0131 hiyerar\u015fi' },
  { value: 'minimal', label: 'Minimalist', desc: 'Sadece ba\u015fl\u0131k' },
]

// Which chapter styles are available per document type
const STYLES_PER_TYPE = {
  book: ['classic', 'modern', 'academic', 'minimal'],
  article: ['classic', 'modern', 'academic', 'minimal'],
  report: ['classic', 'modern', 'academic', 'minimal'],
  exam: ['classic', 'modern'],
}

function estimateTime(fileSize) {
  if (!fileSize) return '3-5 dakika';
  const mb = fileSize / (1024 * 1024);
  if (mb < 1) return '1-2 dakika';
  if (mb < 5) return '2-4 dakika';
  if (mb < 15) return '4-7 dakika';
  if (mb < 30) return '5-10 dakika';
  return '10-15 dakika';
}

// Document type display name map
const DOC_TYPE_LABELS = {
  book: 'Kitap',
  article: 'Makale',
  report: 'Rapor',
  exam: 'S\u0131nav',
}

export default function NewProjectPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  usePageTitle(t('nav.newProject'))
  const STEPS = [t("wizard.step1Title"), t("wizard.step2Title"), t("wizard.step3Title"), t("wizard.step4Title")]
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Step 1: File
  const [file, setFile] = useState(null)
  const [fileId, setFileId] = useState(null)
  const [fileUrl, setFileUrl] = useState(null)

  // Step 2: Settings
  const [documentType, setDocumentType] = useState('book')
  const [projectName, setProjectName] = useState('')
  const [pageSize, setPageSize] = useState('a5paper')
  const [margins, setMargins] = useState('standard')
  const [font, setFont] = useState('ebgaramond')
  const [fontSize, setFontSize] = useState('11pt')
  const [lineSpacing, setLineSpacing] = useState(1.15)
  const [chapterStyle, setChapterStyle] = useState('classic')
  const [language, setLanguage] = useState('tr')
  const [features, setFeatures] = useState({
    tableOfContents: true,
    listOfFigures: true,
    listOfTables: true,
    footnotes: true,
    bibliography: false,
    pageNumbers: true,
    header: true,
    footer: true,
    coverPage: false,
  })

  // Exam-specific fields
  const [examSchool, setExamSchool] = useState('')
  const [examDate, setExamDate] = useState('')
  const [examTitle, setExamTitle] = useState('')

  // Step 3: Cover
  const [coverTitle, setCoverTitle] = useState('')
  const [coverAuthor, setCoverAuthor] = useState('')
  const [coverSubtitle, setCoverSubtitle] = useState('')
  const [coverTemplateId, setCoverTemplateId] = useState('classic-serif')
  const [coverTemplates, setCoverTemplates] = useState([])

  // Handle document type change — adjust features and style
  const handleDocumentTypeChange = (type) => {
    setDocumentType(type)

    // Filter chapter style if current not available for new type
    const availableStyles = STYLES_PER_TYPE[type] || STYLES_PER_TYPE.book
    if (!availableStyles.includes(chapterStyle)) {
      setChapterStyle(availableStyles[0])
    }

    // Adjust features based on type
    if (type === 'exam') {
      setFeatures(prev => ({
        ...prev,
        tableOfContents: false,
        listOfFigures: false,
        listOfTables: false,
        bibliography: false,
        coverPage: false,
      }))
      setPageSize('a4paper')
    } else if (type === 'article') {
      setFeatures(prev => ({
        ...prev,
        listOfFigures: false,
        listOfTables: false,
      }))
    }
  }

  // Fetch cover templates
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || '/api'
    fetch(apiBase + '/covers/templates')
      .then(r => r.json())
      .then(d => { if (d.success) setCoverTemplates(d.data) })
      .catch(() => { toast.error(t('wizard.coverTemplatesFailed') || 'Kapak \u015fablonlar\u0131 y\u00fcklenemedi') })
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

  // Features that should be hidden for certain document types
  const getVisibleFeatures = () => {
    const allFeatures = [
      { key: 'tableOfContents', label: t('wizard.toc') || '\u0130\u00e7indekiler' },
      { key: 'listOfFigures', label: t('wizard.lof') || '\u015eekiller' },
      { key: 'listOfTables', label: t('wizard.lot') || 'Tablolar' },
      { key: 'footnotes', label: t('wizard.footnotes') || 'Dipnot Deste\u011fi' },
      { key: 'bibliography', label: t('wizard.bibliographyBib') || 'Kaynak\u00e7a (BibTeX)' },
      { key: 'pageNumbers', label: t('wizard.pageNumbers') },
      { key: 'header', label: t('wizard.header') || '\u00dcst Bilgi' },
      { key: 'footer', label: t('wizard.footer') || 'Alt Bilgi' },
      { key: 'coverPage', label: t('wizard.coverPage') },
    ]

    if (documentType === 'exam') {
      // Hide toc, lof, lot, bibliography, coverPage for exam
      const hiddenKeys = ['tableOfContents', 'listOfFigures', 'listOfTables', 'bibliography', 'coverPage']
      return allFeatures.filter(f => !hiddenKeys.includes(f.key))
    }

    return allFeatures
  }

  // Submit
  const handleSubmit = async () => {
    setLoading(true)
    try {
      const settings = {
        pageSize, margins, fontFamily: font, fontSize, lineSpacing,
        chapterStyle, language, documentType, features,
      }

      // Add exam-specific fields
      if (documentType === 'exam') {
        settings.examSchool = examSchool
        settings.examDate = examDate
        settings.examTitle = examTitle
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

  // Get available chapter styles for current document type
  const availableStyles = CHAPTER_STYLES.filter(cs =>
    (STYLES_PER_TYPE[documentType] || STYLES_PER_TYPE.book).includes(cs.value)
  )

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
            Dosyan\u0131z\u0131 y\u00fckleyin
          </h2>
          <p className="mb-8" style={{ color: 'hsl(30, 10%, 45%)' }}>
            Word (.docx) dosyan\u0131z\u0131 s\u00fcr\u00fckleyip b\u0131rak\u0131n veya se\u00e7in.
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
                {isDragActive ? 'B\u0131rak\u0131n...' : 'DOCX dosyan\u0131z\u0131 s\u00fcr\u00fckleyin'}
              </p>
              <p className="text-sm" style={{ color: 'hsl(30, 10%, 55%)' }}>
                veya dosya se\u00e7mek i\u00e7in t\u0131klay\u0131n \u2014 Maks. 50MB
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
            {t('wizard.step2Title')}
          </h2>
          <p className="mb-8" style={{ color: 'hsl(30, 10%, 45%)' }}>
            Dizgi tercihlerinizi belirleyin.
          </p>

          <div className="space-y-8">
            {/* Document Type selector */}
            <div>
              <Label className="text-sm font-medium mb-3 block">{t('wizard.documentType') || 'Belge Tipi'}</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {DOCUMENT_TYPES.map((dt) => {
                  const Icon = dt.icon
                  return (
                    <button
                      key={dt.value}
                      onClick={() => handleDocumentTypeChange(dt.value)}
                      className="p-4 rounded-lg border text-left transition-all"
                      style={{
                        borderColor: documentType === dt.value ? 'hsl(25, 60%, 30%)' : 'hsl(35, 15%, 85%)',
                        backgroundColor: documentType === dt.value ? 'hsl(35, 30%, 93%)' : 'hsl(40, 25%, 96%)',
                      }}
                    >
                      <Icon className="w-5 h-5 mb-2" style={{ color: documentType === dt.value ? 'hsl(25, 60%, 30%)' : 'hsl(30, 10%, 55%)' }} />
                      <p className="text-sm font-medium">{dt.label}</p>
                      <p className="text-xs" style={{ color: 'hsl(30, 10%, 55%)' }}>{dt.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Project name */}
            <div>
              <Label className="text-sm font-medium">Proje Ad\u0131</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="mt-2 h-11 rounded-lg"
                style={{ backgroundColor: 'hsl(40, 25%, 96%)', borderColor: 'hsl(35, 15%, 85%)' }}
                placeholder={documentType === 'exam' ? 'S\u0131nav ad\u0131' : 'Kitab\u0131n\u0131z\u0131n ad\u0131'}
              />
            </div>

            {/* Exam-specific fields */}
            {documentType === 'exam' && (
              <div className="p-4 rounded-lg border space-y-4" style={{ borderColor: 'hsl(35, 15%, 85%)', backgroundColor: 'hsl(40, 30%, 97%)' }}>
                <Label className="text-sm font-medium block">{t('wizard.examInfo') || 'S\u0131nav Bilgileri'}</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs" style={{ color: 'hsl(30, 10%, 55%)' }}>{t('wizard.examSchool') || 'Okul / Kurum Ad\u0131'}</Label>
                    <Input
                      value={examSchool}
                      onChange={(e) => setExamSchool(e.target.value)}
                      className="mt-1 h-10 rounded-lg"
                      style={{ backgroundColor: 'hsl(40, 25%, 96%)', borderColor: 'hsl(35, 15%, 85%)' }}
                      placeholder="\u00d6rn: ABC \u00dcniversitesi"
                    />
                  </div>
                  <div>
                    <Label className="text-xs" style={{ color: 'hsl(30, 10%, 55%)' }}>{t('wizard.examTitle') || 'Ders / S\u0131nav Ad\u0131'}</Label>
                    <Input
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      className="mt-1 h-10 rounded-lg"
                      style={{ backgroundColor: 'hsl(40, 25%, 96%)', borderColor: 'hsl(35, 15%, 85%)' }}
                      placeholder="\u00d6rn: Matematik Vize S\u0131nav\u0131"
                    />
                  </div>
                  <div>
                    <Label className="text-xs" style={{ color: 'hsl(30, 10%, 55%)' }}>{t('wizard.examDate') || 'S\u0131nav Tarihi'}</Label>
                    <Input
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="mt-1 h-10 rounded-lg"
                      style={{ backgroundColor: 'hsl(40, 25%, 96%)', borderColor: 'hsl(35, 15%, 85%)' }}
                      placeholder="\u00d6rn: 15 Mart 2026"
                    />
                  </div>
                </div>
              </div>
            )}

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
                <Label className="text-sm font-medium mb-3 block">Sat\u0131r Aral\u0131\u011f\u0131</Label>
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
              <Label className="text-sm font-medium mb-3 block">B\u00f6l\u00fcm Stili</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {availableStyles.map((cs) => (
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
                  { value: 'tr', label: '\ud83c\uddf9\ud83c\uddf7 T\u00fcrk\u00e7e' },
                  { value: 'en', label: '\ud83c\uddec\ud83c\udde7 \u0130ngilizce' },
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
              <Label className="text-sm font-medium mb-3 block">Ek \u00d6zellikler</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {getVisibleFeatures().map((f) => (
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
            \u00d6zet ve onay
          </h2>
          <p className="mb-8" style={{ color: 'hsl(30, 10%, 45%)' }}>
            Ayarlar\u0131n\u0131z\u0131 g\u00f6zden ge\u00e7irin ve dizgiyi ba\u015flat\u0131n.
          </p>

          <div
            className="rounded-xl border p-6 space-y-4"
            style={{ borderColor: 'hsl(35, 15%, 88%)', backgroundColor: 'hsl(40, 25%, 96%)' }}
          >
            {[
              [t('wizard.documentType') || 'Belge Tipi', DOC_TYPE_LABELS[documentType] || documentType],
              ['Proje', projectName],
              [t('wizard.step1Title'), file?.name],
              [t('wizard.pageSizeLabel'), PAGE_SIZES.find(p => p.value === pageSize)?.label],
              ['Font', FONTS.find(f => f.value === font)?.label + ' / ' + fontSize],
              ['Sat\u0131r Aral\u0131\u011f\u0131', lineSpacing.toString()],
              ['B\u00f6l\u00fcm Stili', CHAPTER_STYLES.find(c => c.value === chapterStyle)?.label],
              ['Dil', language === 'tr' ? 'T\u00fcrk\u00e7e' : '\u0130ngilizce'],
              ...(documentType === 'exam' ? [
                [t('wizard.examSchool') || 'Okul', examSchool || '-'],
                [t('wizard.examTitle') || 'S\u0131nav', examTitle || '-'],
                [t('wizard.examDate') || 'Tarih', examDate || '-'],
              ] : []),
              ['\u00d6zellikler', Object.entries(features).filter(([,v]) => v).map(([k]) => {
                const map = {
                  tableOfContents: t('wizard.toc'),
                  listOfFigures: t('wizard.lof'),
                  listOfTables: t('wizard.lot'),
                  footnotes: t('wizard.footnotes'),
                  bibliography: t('wizard.bibliography'),
                  pageNumbers: t('wizard.pageNumbers'),
                  header: t('wizard.header'),
                  footer: t('wizard.footer'),
                  coverPage: t('wizard.coverPage')
                }
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
            \u23f1 Tahmini i\u015fleme s\u00fcresi: <strong>{estimateTime(file?.size)}</strong>
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
          {step === 0 ? '\u0130ptal' : 'Geri'}
        </Button>

        {step < 3 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="rounded-full px-6 bg-stone-900 text-white hover:bg-stone-800"
          >
            \u0130leri
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-full px-8 bg-stone-900 text-white hover:bg-stone-800"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}
            Dizgiyi Ba\u015flat
          </Button>
        )}
      </div>
    </div>
  )
}
