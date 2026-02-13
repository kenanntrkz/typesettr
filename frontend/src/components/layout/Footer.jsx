import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'

export default function Footer({ variant = 'simple' }) {
  const year = new Date().getFullYear()

  if (variant === 'simple') {
    return (
      <footer className="py-6 text-center text-sm" style={{ color: 'hsl(30, 10%, 55%)' }}>
        &copy; {year} Typesettr. Tum haklari saklidir.
      </footer>
    )
  }

  return (
    <footer style={{ backgroundColor: 'hsl(30, 20%, 12%)', color: 'hsl(40, 15%, 70%)' }}>
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-6 h-6" style={{ color: 'hsl(35, 40%, 60%)' }} />
              <span className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Typesettr
              </span>
            </div>
            <p className="text-sm leading-relaxed">
              Profesyonel kitap dizgi platformu. Word dosyanizi yukleyin, yapay zeka destekli LaTeX motorumuz ile kitabinizi dizin.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/register" className="hover:text-white transition-colors">Kayit Ol</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Giris Yap</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">SSS</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Kurumsal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-white transition-colors">Hakkimizda</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Iletisim</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Gizlilik</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Iletisim</h4>
            <ul className="space-y-2 text-sm">
              <li>info@typesettr.com</li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-12 pt-8 text-center text-sm" style={{ borderColor: 'hsl(30, 15%, 22%)' }}>
          &copy; {year} Typesettr. Tum haklari saklidir.
        </div>
      </div>
    </footer>
  )
}
