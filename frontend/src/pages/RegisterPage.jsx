import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/authStore'
import { authAPI } from '@/services/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !email || !password) {
      toast.error('Lütfen tüm alanları doldurun')
      return
    }
    if (password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalı')
      return
    }
    setLoading(true)
    try {
      const { data } = await authAPI.register({ name, email, password })
      setAuth(data.token, data.user)
      toast.success('Kayıt başarılı! Hoş geldiniz.')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Kayıt başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2
        className="text-3xl font-bold mb-2"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Hesap oluşturun
      </h2>
      <p className="mb-8" style={{ color: 'hsl(30, 10%, 45%)' }}>
        Ücretsiz başlayın, ilk kitabınızı hemen dizin.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Ad Soyad</Label>
          <Input
            id="name"
            type="text"
            placeholder="Adınız Soyadınız"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-lg"
            style={{ backgroundColor: 'hsl(40, 25%, 96%)', borderColor: 'hsl(35, 15%, 85%)' }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-posta</Label>
          <Input
            id="email"
            type="email"
            placeholder="ornek@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-lg"
            style={{ backgroundColor: 'hsl(40, 25%, 96%)', borderColor: 'hsl(35, 15%, 85%)' }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Şifre</Label>
          <Input
            id="password"
            type="password"
            placeholder="En az 6 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          Ücretsiz Kaydol
        </Button>
      </form>

      <p className="text-center mt-8 text-sm" style={{ color: 'hsl(30, 10%, 45%)' }}>
        Zaten hesabınız var mı?{' '}
        <Link to="/login" className="font-semibold hover:underline" style={{ color: 'hsl(25, 60%, 30%)' }}>
          Giriş yapın
        </Link>
      </p>
    </div>
  )
}
