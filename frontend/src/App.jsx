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

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
