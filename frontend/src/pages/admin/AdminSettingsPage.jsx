import { useState, useEffect } from 'react'
import { adminAPI } from '@/services/adminApi'
import { Loader2, Save, Settings } from 'lucide-react'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    adminAPI.getSettings()
      .then(res => setSettings(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleUpdate = async (key, value) => {
    setSaving(key)
    try {
      await adminAPI.updateSetting(key, value)
      setSettings(prev => ({ ...prev, [key]: { ...prev[key], value } }))
    } catch { /* */ }
    finally { setSaving(null) }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>
  }

  if (!settings) {
    return <p className="text-stone-400">Ayarlar yüklenemedi.</p>
  }

  const booleanKeys = ['maintenance_mode', 'registration_enabled']
  const numberKeys = ['max_file_size_mb', 'max_projects_free', 'max_projects_pro', 'max_projects_enterprise', 'rate_limit_free', 'rate_limit_pro']
  const textKeys = ['site_announcement']

  return (
    <div>
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6 text-amber-500" /> Site Ayarları
      </h1>

      <div className="space-y-4">
        {/* Boolean toggles */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-stone-300 mb-4">Genel Ayarlar</h2>
          <div className="space-y-4">
            {booleanKeys.map(key => {
              const s = settings[key]
              if (!s) return null
              return (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{s.description}</p>
                    <p className="text-xs text-stone-500">{key}</p>
                  </div>
                  <button
                    onClick={() => handleUpdate(key, !s.value)}
                    disabled={saving === key}
                    className={`relative w-12 h-6 rounded-full transition-colors ${s.value ? 'bg-green-500' : 'bg-stone-700'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${s.value ? 'left-[26px]' : 'left-0.5'}`} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Number settings */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-stone-300 mb-4">Limitler</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {numberKeys.map(key => {
              const s = settings[key]
              if (!s) return null
              return (
                <div key={key}>
                  <label className="text-xs text-stone-400 mb-1 block">{s.description}</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      defaultValue={s.value}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value)
                        if (!isNaN(v) && v !== s.value) handleUpdate(key, v)
                      }}
                      className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                    {saving === key && <Loader2 className="w-4 h-4 animate-spin text-amber-500 self-center" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Text settings */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-stone-300 mb-4">Duyurular</h2>
          {textKeys.map(key => {
            const s = settings[key]
            if (!s) return null
            return (
              <div key={key}>
                <label className="text-xs text-stone-400 mb-1 block">{s.description}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    defaultValue={s.value}
                    placeholder="Duyuru metni yazın..."
                    onBlur={(e) => {
                      if (e.target.value !== s.value) handleUpdate(key, e.target.value)
                    }}
                    className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                  />
                  {saving === key && <Loader2 className="w-4 h-4 animate-spin text-amber-500 self-center" />}
                </div>
                <p className="text-xs text-stone-600 mt-1">Boş bırakırsanız duyuru kapalı olur</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
