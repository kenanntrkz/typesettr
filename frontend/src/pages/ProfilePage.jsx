// Faz 3 — Profile Page
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import usePageTitle from '@/hooks/usePageTitle'
import { useAuthStore } from '@/stores/authStore'
import { authAPI } from '@/services/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  User, Mail, Globe, Shield, CreditCard, Calendar,
  FolderOpen, Loader2, Save, AlertTriangle, Lock
} from 'lucide-react'

export default function ProfilePage() {
  const { t, i18n } = useTranslation()
  const { user, updateUser } = useAuthStore()
  usePageTitle(t('nav.profile'))

  // Personal info form
  const [name, setName] = useState(user?.name || '')
  const [language, setLanguage] = useState(user?.language || 'tr')
  const [saving, setSaving] = useState(false)

  // Password form
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setLanguage(user.language || 'tr')
    }
  }, [user])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      const { data } = await authAPI.updateProfile({ name: name.trim(), language })
      updateUser(data.user || data)

      // Also switch i18n language
      if (language !== i18n.language) {
        i18n.changeLanguage(language)
        localStorage.setItem('language', language)
      }

      toast.success(t('profile.saved'))
    } catch (err) {
      toast.error(err.response?.data?.error || t('profile.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error(t('profile.passwordMismatch'))
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setSavingPassword(true)
    try {
      await authAPI.updateProfile({ currentPassword, newPassword })
      toast.success(t('profile.passwordUpdated'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    } catch (err) {
      toast.error(err.response?.data?.error || t('profile.passwordFailed'))
    } finally {
      setSavingPassword(false)
    }
  }

  const planColors = {
    free: 'bg-gray-100 text-gray-700',
    pro: 'bg-emerald-100 text-emerald-700',
    enterprise: 'bg-purple-100 text-purple-700'
  }

  const planLabel = {
    free: t('profile.planFree'),
    pro: t('profile.planPro'),
    enterprise: t('profile.planEnterprise')
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Page Title */}
      <h1
        className="text-3xl font-bold mb-8"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {t('profile.title')}
      </h1>

      {/* ─── Personal Information ─── */}
      <div className="rounded-lg border bg-white p-6 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <User className="w-5 h-5" style={{ color: 'hsl(25, 60%, 30%)' }} />
          <h2 className="text-lg font-semibold">{t('profile.personalInfo')}</h2>
        </div>
        <p className="text-sm mb-6" style={{ color: 'hsl(30, 10%, 45%)' }}>
          {t('profile.personalInfoDesc')}
        </p>

        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t('profile.name')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">{t('profile.email')}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-gray-50"
              />
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
            </div>
            <p className="text-xs" style={{ color: 'hsl(30, 10%, 55%)' }}>
              {t('profile.emailHelper')}
            </p>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label>{t('profile.language')}</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLanguage('tr')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                  language === 'tr'
                    ? 'border-stone-800 bg-stone-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium">{t('profile.langTr')}</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                  language === 'en'
                    ? 'border-stone-800 bg-stone-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium">{t('profile.langEn')}</span>
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="rounded-full px-6"
              style={{ backgroundColor: 'hsl(25, 60%, 30%)' }}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saving ? t('profile.saving') : t('profile.saveChanges')}
            </Button>
          </div>
        </form>
      </div>

      {/* ─── Plan & Usage ─── */}
      <div className="rounded-lg border bg-white p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-5 h-5" style={{ color: 'hsl(25, 60%, 30%)' }} />
          <h2 className="text-lg font-semibold">{t('profile.plan')}</h2>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Badge className={`text-sm px-3 py-1 ${planColors[user?.plan || 'free']}`}>
              {planLabel[user?.plan || 'free']}
            </Badge>
          </div>
          {user?.plan === 'free' && (
            <Button variant="outline" size="sm" className="rounded-full">
              {t('profile.upgradePlan')}
            </Button>
          )}
        </div>

        <p className="text-sm mb-4" style={{ color: 'hsl(30, 10%, 45%)' }}>
          {t('profile.planDesc')}
        </p>

        <Separator className="my-4" />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs" style={{ color: 'hsl(30, 10%, 55%)' }}>
                {t('profile.memberSince')}
              </p>
              <p className="text-sm font-medium">{formatDate(user?.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FolderOpen className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs" style={{ color: 'hsl(30, 10%, 55%)' }}>
                {t('profile.projectsUsed')}
              </p>
              <p className="text-sm font-medium">{user?.projects_count || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Security / Password ─── */}
      <div className="rounded-lg border bg-white p-6 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-5 h-5" style={{ color: 'hsl(25, 60%, 30%)' }} />
          <h2 className="text-lg font-semibold">{t('profile.account')}</h2>
        </div>
        <p className="text-sm mb-4" style={{ color: 'hsl(30, 10%, 45%)' }}>
          {t('profile.accountDesc')}
        </p>

        {!showPasswordForm ? (
          <Button
            variant="outline"
            onClick={() => setShowPasswordForm(true)}
            className="rounded-full"
          >
            <Lock className="w-4 h-4 mr-2" />
            {t('profile.changePassword')}
          </Button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('profile.currentPassword')}</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.newPassword')}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.confirmPassword')}</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={savingPassword}
                className="rounded-full"
                style={{ backgroundColor: 'hsl(25, 60%, 30%)' }}
              >
                {savingPassword && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {t('profile.updatePassword')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowPasswordForm(false)
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                }}
                className="rounded-full"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* ─── Danger Zone ─── */}
      <div className="rounded-lg border border-red-200 bg-red-50/50 p-6">
        <div className="flex items-center gap-3 mb-1">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-red-700">{t('profile.dangerZone')}</h2>
        </div>
        <p className="text-sm mb-4 text-red-600/70">
          {t('profile.deleteAccountDesc')}
        </p>
        <Button
          variant="outline"
          className="rounded-full border-red-300 text-red-600 hover:bg-red-100"
          onClick={() => {
            if (window.confirm(t('profile.deleteConfirm'))) {
              toast.error('Account deletion not implemented yet')
            }
          }}
        >
          {t('profile.deleteAccount')}
        </Button>
      </div>
    </div>
  )
}
