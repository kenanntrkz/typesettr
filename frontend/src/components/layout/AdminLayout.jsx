import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LayoutDashboard, Users, FolderKanban, Activity, ArrowLeft, LogOut, Shield, ScrollText, ListTodo, Settings, TrendingUp } from 'lucide-react'

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/analytics', icon: TrendingUp, label: 'Analitik' },
  { path: '/admin/users', icon: Users, label: 'Kullanıcılar' },
  { path: '/admin/projects', icon: FolderKanban, label: 'Projeler' },
  { path: '/admin/queue', icon: ListTodo, label: 'Kuyruk' },
  { path: '/admin/logs', icon: ScrollText, label: 'Loglar' },
  { path: '/admin/settings', icon: Settings, label: 'Ayarlar' },
  { path: '/admin/system', icon: Activity, label: 'Sistem' },
]

export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex bg-stone-950 text-stone-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-stone-800 flex flex-col">
        <div className="p-5 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            <span className="text-lg font-bold tracking-tight">Admin Panel</span>
          </div>
          <p className="text-xs text-stone-500 mt-1">{user?.name || user?.email}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path ||
              (path !== '/admin' && location.pathname.startsWith(path))
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-stone-800 space-y-1">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Ana Siteye Dön
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-stone-800 transition-colors w-full text-left"
          >
            <LogOut className="w-4 h-4" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
