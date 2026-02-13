import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authAPI } from '@/services/api'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      toast.error('Lutfen e-posta adresinizi girin')
      return
    }
    setLoading(true)
    try {
      await authAPI.forgotPassword(email)
      setSent(true)
      toast.success('Sifirlama baglantisi gonderildi')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bir hata olustu')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: 'hsl(140, 40%, 92%)' }}
        >
          <Mail className="w-8 h-8" style={{ color: 'hsl(140, 50%, 35%)' }} />
        </div>
        <h2
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          E-postanizi kontrol edin
        </h2>
        <p className="mb-8" style={{ color: 'hsl(30, 10%, 45%)' }}>
          Eger bu e-posta adresine ait bir hesap varsa, sifre sifirlama baglantisi gonderdik.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center text-sm font-semibold hover:underline"
          style={{ color: 'hsl(25, 60%, 30%)' }}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Girise don
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
        Sifrenizi mi unuttunuz?
      </h2>
      <p className="mb-8" style={{ color: 'hsl(30, 10%, 45%)' }}>
        E-posta adresinizi girin, size sifirlama baglantisi gonderelim.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
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
            autoFocus
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-stone-900 text-white hover:bg-stone-800 rounded-full text-base"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Sifirlama Baglantisi Gonder
        </Button>
      </form>

      <p className="text-center mt-8 text-sm" style={{ color: 'hsl(30, 10%, 45%)' }}>
        <Link
          to="/login"
          className="inline-flex items-center font-semibold hover:underline"
          style={{ color: 'hsl(25, 60%, 30%)' }}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Girise don
        </Link>
      </p>
    </div>
  )
}
