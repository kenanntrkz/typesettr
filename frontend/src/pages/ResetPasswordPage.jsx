import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authAPI } from '@/services/api'
import { toast } from 'sonner'
import { Loader2, CheckCircle2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <div className="text-center">
        <h2
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Gecersiz baglanti
        </h2>
        <p className="mb-6" style={{ color: 'hsl(30, 10%, 45%)' }}>
          Bu sifre sifirlama baglantisi gecersiz veya suresi dolmus.
        </p>
        <Link
          to="/forgot-password"
          className="text-sm font-semibold hover:underline"
          style={{ color: 'hsl(25, 60%, 30%)' }}
        >
          Yeni baglanti talep et
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Sifre en az 8 karakter olmalidir')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Sifreler eslesmiyor')
      return
    }
    setLoading(true)
    try {
      await authAPI.resetPassword({ token, newPassword: password })
      setSuccess(true)
      toast.success('Sifreniz basariyla sifirlandi')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sifirlama basarisiz')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: 'hsl(140, 40%, 92%)' }}
        >
          <CheckCircle2 className="w-8 h-8" style={{ color: 'hsl(140, 50%, 35%)' }} />
        </div>
        <h2
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Sifreniz sifirlandi
        </h2>
        <p className="mb-6" style={{ color: 'hsl(30, 10%, 45%)' }}>
          Giris sayfasina yonlendiriliyorsunuz...
        </p>
        <Link
          to="/login"
          className="text-sm font-semibold hover:underline"
          style={{ color: 'hsl(25, 60%, 30%)' }}
        >
          Hemen giris yap
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2
        className="text-3xl font-bold mb-2"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Yeni sifre belirleyin
      </h2>
      <p className="mb-8" style={{ color: 'hsl(30, 10%, 45%)' }}>
        Hesabiniz icin yeni bir sifre olusturun.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password">Yeni Sifre</Label>
          <Input
            id="password"
            type="password"
            placeholder="En az 8 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-lg"
            style={{ backgroundColor: 'hsl(40, 25%, 96%)', borderColor: 'hsl(35, 15%, 85%)' }}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Sifre Tekrar</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Sifrenizi tekrar girin"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12 rounded-lg"
            style={{ backgroundColor: 'hsl(40, 25%, 96%)', borderColor: 'hsl(35, 15%, 85%)' }}
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-stone-900 text-white hover:bg-stone-800 rounded-full text-base"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Sifreyi Sifirla
        </Button>
      </form>
    </div>
  )
}
