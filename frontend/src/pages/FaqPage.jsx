import { Link } from 'react-router-dom'
import { BookOpen, FileText, Settings, CreditCard, Shield, HelpCircle, ChevronDown } from 'lucide-react'
import { useState } from 'react'

const faqs = [
  {
    category: 'Genel',
    icon: BookOpen,
    items: [
      { q: 'Typesettr nedir?', a: 'Typesettr, Word (.docx) dosyalarınızı profesyonel kitap dizgisine (LaTeX) otomatik olarak dönüştüren bir SaaS platformudur. Yapay zeka destekli analiz ile baskıya hazır PDF çıktı üretir.' },
      { q: 'Hangi dosya formatlarını destekliyorsunuz?', a: 'Şu anda yalnızca .docx (Microsoft Word) formatını destekliyoruz. Dosyanız .doc formatındaysa önce Word ile .docx olarak kaydedin.' },
      { q: 'Maksimum dosya boyutu nedir?', a: 'Ücretsiz planda maksimum 25 MB, Pro ve Kurumsal planlarda 50 MB dosya yükleyebilirsiniz.' },
    ],
  },
  {
    category: 'Dizgi ve Çıktı',
    icon: FileText,
    items: [
      { q: 'Dizgi işlemi ne kadar sürer?', a: 'Kitabınızın uzunluğuna bağlı olarak genellikle 2-5 dakika sürer. 300+ sayfalık kitaplarda bu süre 8-10 dakikaya çıkabilir.' },
      { q: 'Hangi sayfa boyutlarını destekliyorsunuz?', a: 'A4, A5, B5, Letter ve özel boyut seçenekleri mevcuttur. Roman/hikaye için A5, akademik çalışmalar için B5 öneriyoruz.' },
      { q: 'Türkçe karakterler doğru görünüyor mu?', a: 'Evet, tam UTF-8 ve Türkçe heceleme desteği mevcuttur. ç, ğ, ı, İ, ö, ş, ü karakterleri profesyonel fontlarla sorunsuz çalışır.' },
      { q: 'Görseller ve tablolar destekleniyor mu?', a: 'Evet, Word dosyanızdaki görseller otomatik olarak çıkarılır ve baskı kalitesinde (300 DPI) PDF içine yerleştirilir. Tablolar da booktabs formatında profesyonel şekilde dizilir.' },
    ],
  },
  {
    category: 'Ayarlar',
    icon: Settings,
    items: [
      { q: 'Font ve satır aralığını değiştirebilir miyim?', a: 'Evet, Garamond, Palatino, Times New Roman, Linux Libertine ve Open Sans fontları arasından seçim yapabilir, 10pt-12pt font boyutu ve 1.0-2.0 satır aralığı belirleyebilirsiniz.' },
      { q: 'Kapak tasarımı yapabilir miyim?', a: 'Evet, hazır şablonlardan seçebilir veya kendi kapak görselinizi yükleyebilirsiniz. Kitap adı, yazar adı ve alt başlık alanları mevcuttur.' },
      { q: 'İçindekiler ve kaynakça otomatik oluşuyor mu?', a: 'Evet, ayarlar adımında aktifleştirdiğiniz tüm özellikler (içindekiler, şekiller listesi, tablolar listesi, kaynakça, indeks) otomatik olarak oluşturulur.' },
    ],
  },
  {
    category: 'Fiyatlandırma',
    icon: CreditCard,
    items: [
      { q: 'Ücretsiz plan neleri kapsıyor?', a: 'Ayda 3 kitap, 100 sayfa limiti ve temel şablonları kullanabilirsiniz. Deneme amaçlı yeterli bir plandır.' },
      { q: 'Pro plana nasıl geçebilirim?', a: 'Profil sayfanızdan veya fiyatlandırma bölümünden Pro plana geçebilirsiniz. Aylık 99 TL karşılığında sınırsız proje ve tüm şablonlara erişim sağlarsınız.' },
      { q: 'İptal ve iade politikanız nedir?', a: 'Aboneliğinizi istediğiniz zaman iptal edebilirsiniz. Mevcut dönem sonuna kadar hizmet devam eder. İlk 7 gün içinde tam iade garantisi sunuyoruz.' },
    ],
  },
  {
    category: 'Güvenlik',
    icon: Shield,
    items: [
      { q: 'Dosyalarım güvende mi?', a: 'Evet, tüm dosyalar şifreli bağlantı (HTTPS/TLS) üzerinden iletilir ve kendi sunucularımızda (Hetzner, Almanya) S3-uyumlu depolamada saklanır. Üçüncü taraflarla paylaşılmaz.' },
      { q: 'Dosyalarım ne kadar süre saklanır?', a: 'Oluşturulan PDF ve LaTeX dosyaları 30 gün boyunca indirilebilir durumda kalır. Bu süre sonunda otomatik olarak silinir. İstediğiniz zaman manuel silme de yapabilirsiniz.' },
    ],
  },
]

function AccordionItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-0">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-4 text-left text-sm font-medium hover:text-primary transition-colors">
        {question}
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-4 text-sm text-muted-foreground leading-relaxed">{answer}</div>}
    </div>
  )
}

export default function FaqPage() {
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
      <main className="container mx-auto max-w-3xl px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <HelpCircle className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">Sıkça Sorulan Sorular</h1>
          <p className="text-muted-foreground">
            Typesettr hakkında merak ettikleriniz. Sorunuz burada yoksa{' '}
            <Link to="/contact" className="text-primary hover:underline">bize ulaşın</Link>.
          </p>
        </div>
        <div className="space-y-8">
          {faqs.map((section) => (
            <div key={section.category}>
              <div className="flex items-center gap-2 mb-4">
                <section.icon className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">{section.category}</h2>
              </div>
              <div className="rounded-lg border bg-card">
                <div className="px-4">
                  {section.items.map((item) => (
                    <AccordionItem key={item.q} question={item.q} answer={item.a} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center text-sm text-muted-foreground">
          Başka sorularınız mı var?{' '}
          <Link to="/contact" className="text-primary hover:underline">İletişim sayfamızdan</Link>{' '}
          bize yazabilirsiniz.
        </div>
      </main>
    </div>
  )
}
