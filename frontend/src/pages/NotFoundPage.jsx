import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BookOpen, ArrowLeft } from 'lucide-react'
import usePageTitle from '@/hooks/usePageTitle'

export default function NotFoundPage() {
  usePageTitle('404 — Sayfa Bulunamadı')
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'hsl(45, 30%, 97%)' }}>
      <div className="text-center px-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8"
          style={{ backgroundColor: 'hsl(35, 25%, 90%)' }}>
          <BookOpen className="w-10 h-10" style={{ color: 'hsl(25, 60%, 30%)' }} />
        </div>
        <h1
          className="text-8xl font-bold mb-4"
          style={{ fontFamily: "'Playfair Display', serif", color: 'hsl(30, 20%, 12%)' }}
        >
          404
        </h1>
        <h2
          className="text-2xl font-semibold mb-3"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Sayfa bulunamadı
        </h2>
        <p className="mb-8 max-w-md mx-auto" style={{ color: 'hsl(30, 10%, 45%)' }}>
          Aradığınız sayfa kaldırılmış, adı değiştirilmiş veya geçici olarak kullanılamıyor olabilir.
        </p>
        <Link to="/">
          <Button className="bg-stone-900 text-white hover:bg-stone-800 rounded-full px-8 py-5 text-base">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anasayfaya Dön
          </Button>
        </Link>
      </div>
    </div>
  )
}
