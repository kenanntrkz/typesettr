import { Link } from 'react-router-dom'
import { BookOpen, Mail, MessageSquare, MapPin, Clock, Send } from 'lucide-react'
import { useState } from 'react'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    await new Promise((r) => setTimeout(r, 1000))
    setSending(false)
    setSent(true)
    setForm({ name: '', email: '', subject: '', message: '' })
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <BookOpen className="h-6 w-6 text-primary" />
            Typesettr
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Ana Sayfa
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">İletişim</h1>
          <p className="text-muted-foreground">
            Sorularınız, önerileriniz veya destek talepleriniz için bize ulaşın.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-lg border bg-card p-6 space-y-6">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-medium text-sm">E-posta</h3>
                  <a href="mailto:destek@typesettr.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    destek@typesettr.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-medium text-sm">Yanıt Süresi</h3>
                  <p className="text-sm text-muted-foreground">İş günlerinde 24 saat içinde yanıt veriyoruz.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-medium text-sm">Konum</h3>
                  <p className="text-sm text-muted-foreground">İzmir, Türkiye</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-medium text-sm mb-2">Hızlı Bağlantılar</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/faq" className="text-muted-foreground hover:text-primary transition-colors">→ Sıkça Sorulan Sorular</Link></li>
                <li><Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">→ Hakkımızda</Link></li>
                <li><Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">→ Gizlilik Politikası</Link></li>
              </ul>
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="rounded-lg border bg-card p-6">
              {sent ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                    <Send className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Mesajınız İletildi</h3>
                  <p className="text-sm text-muted-foreground mb-4">En kısa sürede size dönüş yapacağız. Teşekkürler!</p>
                  <button onClick={() => setSent(false)} className="text-sm text-primary hover:underline">Yeni mesaj gönder</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium mb-1.5">Adınız <span className="text-red-500">*</span></label>
                      <input id="name" type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Adınız Soyadınız" />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-1.5">E-posta <span className="text-red-500">*</span></label>
                      <input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="ornek@email.com" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium mb-1.5">Konu <span className="text-red-500">*</span></label>
                    <select id="subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">Konu seçin...</option>
                      <option value="general">Genel Soru</option>
                      <option value="support">Teknik Destek</option>
                      <option value="billing">Fiyatlandırma / Ödeme</option>
                      <option value="feature">Özellik İsteği</option>
                      <option value="bug">Hata Bildirimi</option>
                      <option value="partnership">İş Birliği</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium mb-1.5">Mesajınız <span className="text-red-500">*</span></label>
                    <textarea id="message" required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Mesajınızı buraya yazın..." />
                  </div>
                  <button type="submit" disabled={sending} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    <Send className="h-4 w-4" />
                    {sending ? 'Gönderiliyor...' : 'Gönder'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
