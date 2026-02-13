import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import MainLayout from '@/components/layout/MainLayout'
import AuthLayout from '@/components/layout/AuthLayout'
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import NewProjectPage from '@/pages/NewProjectPage'
import ProjectDetailPage from '@/pages/ProjectDetailPage'
import ProfilePage from '@/pages/ProfilePage'
import AboutPage from '@/pages/AboutPage'
import FaqPage from '@/pages/FaqPage'
import ContactPage from '@/pages/ContactPage'
import PrivacyPage from '@/pages/PrivacyPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import NotFoundPage from '@/pages/NotFoundPage'
import AdminLayout from '@/components/layout/AdminLayout'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import AdminUserDetailPage from '@/pages/admin/AdminUserDetailPage'
import AdminProjectsPage from '@/pages/admin/AdminProjectsPage'
import AdminSystemPage from '@/pages/admin/AdminSystemPage'
import AdminLogsPage from '@/pages/admin/AdminLogsPage'
import AdminQueuePage from '@/pages/admin/AdminQueuePage'
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage'
import AdminAnalyticsPage from '@/pages/admin/AdminAnalyticsPage'
import { useAuthStore } from '@/stores/authStore'
import ErrorBoundary from '@/components/ErrorBoundary'

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

function GuestRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  if (token) return <Navigate to="/dashboard" replace />
  return children
}

function AdminRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  if (!token) return <Navigate to="/login" replace />
  if (user?.role !== 'admin' && user?.role !== 'superadmin') return <Navigate to="/dashboard" replace />
  return children
}

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        {/* Auth */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
          <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
        </Route>

        {/* Protected */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects/new" element={<NewProjectPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Admin */}
        <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
          <Route path="/admin/projects" element={<AdminProjectsPage />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/admin/queue" element={<AdminQueuePage />} />
          <Route path="/admin/logs" element={<AdminLogsPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
          <Route path="/admin/system" element={<AdminSystemPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
