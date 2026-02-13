import { Link } from 'react-router-dom'
import { BookOpen, Shield } from 'lucide-react'

const sections = [
  {
    title: '1. Toplanan Veriler',
    content: 'Typesettr\'ı kullanırken aşağıdaki verileri topluyoruz:\n\n• Hesap bilgileri: Ad, e-posta adresi, şifre (hashlenmiş).\n• Proje verileri: Yüklenen Word (.docx) dosyaları, dizgi ayarları, oluşturulan PDF ve LaTeX dosyaları.\n• Kullanım verileri: Oturum bilgileri, proje sayısı, işlem süreleri.\n• Teknik veriler: Tarayıcı türü, IP adresi (anonim loglar için).\n\nKredi kartı veya ödeme bilgileriniz doğrudan sunucularımızda saklanmaz; ödeme işlemleri üçüncü taraf ödeme sağlayıcıları aracılığıyla güvenli şekilde gerçekleştirilir.',
  },
  {
    title: '2. Verilerin Kullanım Amacı',
    content: 'Topladığımız veriler yalnızca aşağıdaki amaçlarla kullanılır:\n\n• Kitap dizgi hizmetinin sunulması (dosya işleme, AI analiz, PDF üretimi).\n• Hesabınızın yönetimi ve güvenliği.\n• Hizmet kalitesinin iyileştirilmesi ve hata giderme.\n• Yasal yükümlülüklerin yerine getirilmesi.\n\nVerileriniz reklam veya pazarlama amacıyla üçüncü taraflarla paylaşılmaz.',
  },
  {
    title: '3. Dosya Güvenliği',
    content: 'Yüklediğiniz dosyalar ve oluşturulan çıktılar:\n\n• HTTPS/TLS şifreli bağlantı üzerinden iletilir.\n• Hetzner veri merkezlerinde (Almanya, EU) S3-uyumlu depolama (MinIO) üzerinde saklanır.\n• Tamamlanan projeler 30 gün boyunca indirilebilir durumda kalır; süre sonunda otomatik silinir.\n• AI analiz sürecinde dosya içerikleri Claude API\'ye gönderilir. Anthropic\'in veri politikası gereği API üzerinden gönderilen veriler model eğitiminde kullanılmaz.\n• İstediğiniz zaman projelerinizi ve ilgili dosyaları manuel olarak silebilirsiniz.',
  },
  {
    title: '4. Çerezler (Cookies)',
    content: 'Typesettr aşağıdaki çerezleri kullanır:\n\n• Oturum çerezi: Giriş durumunuzu korumak için (zorunlu).\n• Tercih çerezi: Dil ve tema tercihlerinizi hatırlamak için.\n\nÜçüncü taraf izleme çerezleri veya reklam çerezleri kullanmıyoruz. Google Analytics veya benzeri analitik araçlar kullanılmamaktadır.',
  },
  {
    title: '5. Veri Saklama Süresi',
    content: '• Hesap bilgileri: Hesabınız aktif olduğu sürece saklanır. Hesap silme talebinde tüm veriler 30 gün içinde kalıcı olarak silinir.\n• Proje dosyaları: Tamamlanan projeler 30 gün, başarısız projeler 7 gün saklanır.\n• İşleme logları: Hata ayıklama amaçlı 90 gün saklanır, ardından anonimleştirilir.\n• Yedekler: Veritabanı yedekleri 14 gün saklanır.',
  },
  {
    title: '6. Üçüncü Taraf Hizmetleri',
    content: 'Hizmetimizin çalışması için aşağıdaki üçüncü taraf sağlayıcıları kullanıyoruz:\n\n• Anthropic (Claude API): Metin analizi ve LaTeX kod üretimi. ABD merkezli, SOC 2 sertifikalı.\n• Hetzner: Sunucu altyapısı. Almanya merkezli, GDPR uyumlu.\n\nBu sağlayıcılar yalnızca hizmet sunumu için gerekli minimum veriyi alır ve kendi gizlilik politikalarına tabidir.',
  },
  {
    title: '7. Kullanıcı Hakları',
    content: 'KVKK (6698 sayılı Kişisel Verilerin Korunması Kanunu) ve GDPR kapsamında aşağıdaki haklara sahipsiniz:\n\n• Erişim hakkı: Hangi verilerinizin saklandığını öğrenebilirsiniz.\n• Düzeltme hakkı: Yanlış veya eksik verilerinizi düzelttirebilirsiniz.\n• Silme hakkı: Verilerinizin silinmesini talep edebilirsiniz.\n• Taşınabilirlik hakkı: Verilerinizi yaygın bir formatta alabilirsiniz.\n• İtiraz hakkı: Veri işleme faaliyetlerine itiraz edebilirsiniz.\n\nBu haklarınızı kullanmak için destek@typesettr.com adresine başvurabilirsiniz. Talepleriniz 30 gün içinde yanıtlanır.',
  },
  {
    title: '8. Güvenlik Önlemleri',
    content: 'Verilerinizin güvenliği için aldığımız teknik ve idari önlemler:\n\n• Tüm iletişim TLS 1.3 ile şifrelenir.\n• Şifreler bcrypt ile hashlenmiş olarak saklanır.\n• JWT tabanlı kimlik doğrulama ve oturum yönetimi.\n• Rate limiting ile brute-force koruması.\n• Docker izolasyonu ile servisler arası güvenlik.\n• Düzenli güvenlik güncellemeleri ve yama yönetimi.\n• LaTeX injection koruması (shell-escape devre dışı).',
  },
  {
    title: '9. Değişiklikler',
    content: 'Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişiklikler yapıldığında kayıtlı e-posta adresinize bildirim gönderilir. Politikanın güncel versiyonu her zaman bu sayfada yayınlanır.',
  },
  {
    title: '10. İletişim',
    content: 'Gizlilik politikamız hakkında sorularınız için:\n\nE-posta: destek@typesettr.com\nKonum: İzmir, Türkiye',
  },
]

export default function PrivacyPage() {
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
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">Gizlilik Politikası</h1>
          <p className="text-muted-foreground text-sm">Son güncelleme: Şubat 2025</p>
        </div>

        <div className="rounded-lg border bg-card p-6 mb-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Typesettr olarak kişisel verilerinizin korunmasına büyük önem veriyoruz.
            Bu politika, hizmetimizi kullanırken hangi verilerin toplandığını, nasıl kullanıldığını
            ve nasıl korunduğunu açıklar. Hizmetimizi kullanarak bu politikayı kabul etmiş sayılırsınız.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-semibold mb-3">{section.title}</h2>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>
            Sorularınız için{' '}
            <Link to="/contact" className="text-primary hover:underline">iletişim sayfamızı</Link>{' '}
            ziyaret edebilirsiniz.
          </p>
        </div>
      </main>
    </div>
  )
}
