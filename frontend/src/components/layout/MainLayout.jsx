import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BookOpen, Plus, LogOut, Globe, User, ChevronDown, Shield } from 'lucide-react'

export default function MainLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const toggleLang = () => {
    const next = i18n.language === 'tr' ? 'en' : 'tr'
    i18n.changeLanguage(next)
    localStorage.setItem('language', next)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'hsl(45, 30%, 97%)' }}>
      <header className="border-b" style={{ borderColor: 'hsl(35, 15%, 85%)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <BookOpen className="w-6 h-6" style={{ color: 'hsl(25, 60%, 30%)' }} />
            <span className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              Typesettr
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/projects/new')}
              className="bg-stone-900 text-white hover:bg-stone-800 rounded-full px-5"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('nav.newProject')}
            </Button>

            <div className="flex items-center gap-3 ml-2">
              <button
                onClick={toggleLang}
                className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-stone-200 transition-colors text-sm"
                style={{ color: 'hsl(30, 10%, 45%)' }}
                title={i18n.language === 'tr' ? 'Switch to English' : "Türkçe'ye geç"}
              >
                <Globe className="w-4 h-4" />
                {i18n.language === 'tr' ? 'EN' : 'TR'}
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-stone-200 transition-colors">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                      style={{ backgroundColor: 'hsl(25, 60%, 30%)' }}
                    >
                      {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'hsl(30, 10%, 35%)' }}>
                      {user?.name || user?.email}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5" style={{ color: 'hsl(30, 10%, 55%)' }} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    {t('nav.profile')}
                  </DropdownMenuItem>
                  {(user?.role === 'admin' || user?.role === 'superadmin') && (
                    <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer text-amber-600">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
