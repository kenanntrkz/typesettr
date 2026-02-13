import { Link } from 'react-router-dom'
import { BookOpen, Zap, Shield, Globe, Code, Heart } from 'lucide-react'

const values = [
  {
    icon: Zap,
    title: 'Hız ve Otomasyon',
    description: 'Geleneksel dizgi süreçlerinin günler sürdüğü işleri dakikalara indiriyoruz. AI destekli pipeline sayesinde Word dosyanız anında profesyonel bir kitaba dönüşür.',
  },
  {
    icon: BookOpen,
    title: 'Profesyonel Kalite',
    description: 'LaTeX tabanlı dizgi motoru, yüzyıllardır akademik ve ticari yayıncılığın altın standardıdır. Typesettr bu gücü herkes için erişilebilir kılar.',
  },
  {
    icon: Shield,
    title: 'Gizlilik ve Güvenlik',
    description: 'Dosyalarınız kendi sunucularımızda, Avrupa veri merkezlerinde saklanır. Üçüncü taraflarla paylaşılmaz, AI analiz verileri model eğitiminde kullanılmaz.',
  },
  {
    icon: Globe,
    title: 'Türkçe Odaklı',
    description: 'Türkçe heceleme, tipografi ve karakter desteği özel olarak optimize edilmiştir. Aynı zamanda İngilizce ve çoklu dil desteği de mevcuttur.',
  },
  {
    icon: Code,
    title: 'Açık Standartlar',
    description: 'Oluşturulan LaTeX kaynak koduna tam erişim sağlarsınız. İsterseniz kodu indirip kendi ortamınızda düzenleyebilir ve derleyebilirsiniz.',
  },
  {
    icon: Heart,
    title: 'Kullanıcı Deneyimi',
    description: 'LaTeX bilgisi gerektirmeden, sezgisel bir arayüzle profesyonel dizgi yapabilirsiniz. Teknik karmaşıklığı biz hallediyoruz, siz içeriğinize odaklanın.',
  },
]

export default function AboutPage() {
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

      <section className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-4">Hakkımızda</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Typesettr, yazarların, akademisyenlerin ve yayınevlerinin kitap dizgi sürecini
          otomatikleştirmek için geliştirilen yapay zeka destekli bir SaaS platformudur.
        </p>
      </section>

      <section className="container mx-auto max-w-3xl px-4 pb-16">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Hikayemiz</h2>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>
              Kitap yazmanın en zor kısımlarından biri, içeriğinizi baskıya hazır profesyonel bir formata
              dönüştürmektir. Geleneksel dizgi süreci, ya pahalı yazılımlar ya da karmaşık LaTeX bilgisi gerektirir.
            </p>
            <p>
              Typesettr, bu sorunu çözmek için doğdu. Amacımız, Word dosyanızı yüklemenizin ardından yapay zeka ile
              analiz ederek, birkaç dakika içinde profesyonel tipografi standartlarında baskıya hazır PDF üretmek.
            </p>
            <p>
              LaTeX'in onlarca yıllık dizgi gücünü, modern AI teknolojileri ile birleştirerek herkesin
              erişebileceği basit bir arayüzde sunuyoruz. Teknik bilgi gerektirmeden, profesyonel sonuçlar.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Değerlerimiz</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {values.map((v) => (
            <div key={v.title} className="rounded-lg border bg-card p-5 space-y-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <v.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">{v.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto max-w-3xl px-4 pb-16">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Teknoloji Altyapımız</h2>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
            <p>Typesettr, modern ve güvenilir teknolojiler üzerine inşa edilmiştir:</p>
            <ul className="space-y-1.5 ml-4">
              <li>• <strong className="text-foreground">AI Motor:</strong> Anthropic Claude API ile metin analizi ve LaTeX üretimi</li>
              <li>• <strong className="text-foreground">Dizgi Motor:</strong> TeX Live Full — akademik yayıncılığın altın standardı</li>
              <li>• <strong className="text-foreground">Altyapı:</strong> Docker konteyner mimarisi, Hetzner veri merkezleri (Almanya)</li>
              <li>• <strong className="text-foreground">Güvenlik:</strong> TLS şifreleme, JWT kimlik doğrulama, izole derleme ortamı</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-3xl px-4 pb-16 text-center">
        <p className="text-muted-foreground mb-4">Sorularınız mı var?</p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/contact" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            İletişime Geçin
          </Link>
          <Link to="/faq" className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
            SSS
          </Link>
        </div>
      </section>
    </div>
  )
}
