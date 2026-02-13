import { Outlet, Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'hsl(45, 30%, 97%)' }}>
      {/* Sol: Dekoratif alan */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12"
        style={{ backgroundColor: 'hsl(30, 20%, 12%)' }}
      >
        <div className="max-w-md text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-8" style={{ color: 'hsl(30, 45%, 65%)' }} />
          <h1
            className="text-4xl font-bold mb-4"
            style={{ fontFamily: "'Playfair Display', serif", color: 'hsl(45, 30%, 95%)' }}
          >
            Kitabınız, profesyonel ellerde.
          </h1>
          <p style={{ color: 'hsl(30, 10%, 65%)' }}>
            Word dosyanızı yükleyin, baskıya hazır PDF alın. Otomatik dizgi, profesyonel tipografi.
          </p>
        </div>
      </div>

      {/* Sağ: Form alanı */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <BookOpen className="w-6 h-6" style={{ color: 'hsl(25, 60%, 30%)' }} />
            <span className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              Typesettr
            </span>
          </Link>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
