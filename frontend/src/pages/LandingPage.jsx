import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FadeIn, StaggerContainer, StaggerItem, HoverLift, MagneticButton, Float, GlowPulse, TextReveal } from '@/components/ui/animations'
import Footer from '@/components/layout/Footer'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  BookOpen, Upload, Settings, Download, FileText, Languages,
  Award, CheckCircle, ArrowRight, Sparkles, Zap, Shield
} from 'lucide-react'

function Particles() {
  return (
    <div className="particles-container">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="particle" />
      ))}
    </div>
  )
}

function AnimatedCounter({ target, suffix = '', duration = 2 }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const step = target / (duration * 60)
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 1000 / 60)
    return () => clearInterval(timer)
  }, [target, duration])
  return <span className="count-up">{count.toLocaleString('tr-TR')}{suffix}</span>
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const { scrollYProgress } = useScroll()
  const navbarOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 1])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ color: 'hsl(30, 20%, 12%)' }}>

      {/* ===== NAVBAR ===== */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 border-b navbar-blur ${scrolled ? 'scrolled' : ''}`}
        style={{ borderColor: scrolled ? 'hsl(35, 15%, 88%)' : 'transparent' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div whileHover={{ rotate: 10 }} transition={{ type: 'spring', stiffness: 300 }}>
              <BookOpen className="w-5 h-5" style={{ color: 'hsl(25, 60%, 30%)' }} />
            </motion.div>
            <span className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              Typesettr
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm hover:opacity-70 transition-opacity" style={{ color: 'hsl(30, 10%, 40%)' }}>
              Özellikler
            </a>
            <a href="#pricing" className="text-sm hover:opacity-70 transition-opacity" style={{ color: 'hsl(30, 10%, 40%)' }}>
              Fiyatlar
            </a>
            <Link to="/login" className="text-sm hover:opacity-70 transition-opacity" style={{ color: 'hsl(30, 10%, 40%)' }}>
              Giriş Yap
            </Link>
            <MagneticButton>
              <Link to="/register">
                <Button className="bg-stone-900 text-white hover:bg-stone-800 rounded-full px-5 text-sm btn-shine">
                  Ücretsiz Başla
                </Button>
              </Link>
            </MagneticButton>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-center justify-center animated-gradient overflow-hidden">
        <Particles />
        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-16 text-center">
          <FadeIn delay={0.2}>
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-8"
              style={{
                borderColor: 'hsl(25, 60%, 30%)',
                backgroundColor: 'hsla(25, 60%, 30%, 0.06)',
              }}
              whileHover={{ scale: 1.05 }}
            >
              <Sparkles className="w-4 h-4" style={{ color: 'hsl(25, 60%, 30%)' }} />
              <span className="text-sm font-medium" style={{ color: 'hsl(25, 60%, 30%)' }}>
                Yapay zeka destekli dizgi motoru
              </span>
            </motion.div>
          </FadeIn>

          <div className="mb-6">
            <h1
              className="text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              <TextReveal text="Kitabınızı" delay={0.4} />
              <br />
              <TextReveal text="profesyonel dizgiyle" delay={0.7} />
              <br />
              <span className="relative inline-block">
                <TextReveal text="hayata geçirin" delay={1.0} />
                <motion.div
                  className="absolute -bottom-2 left-0 right-0 h-3 rounded-full"
                  style={{ backgroundColor: 'hsla(25, 60%, 30%, 0.12)' }}
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1.6, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                />
              </span>
            </h1>
          </div>

          <FadeIn delay={1.3}>
            <p
              className="text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
              style={{ color: 'hsl(30, 10%, 45%)', fontFamily: "'Inter', sans-serif" }}
            >
              Word dosyanızı yükleyin, yapay zeka ile analiz edilsin,
              baskıya hazır profesyonel PDF alın. Hepsi otomatik.
            </p>
          </FadeIn>

          <FadeIn delay={1.6}>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <MagneticButton>
                <Link to="/register">
                  <GlowPulse>
                    <Button className="bg-stone-900 text-white hover:bg-stone-800 rounded-full px-8 py-6 text-base btn-shine">
                      Ücretsiz Deneyin
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </GlowPulse>
                </Link>
              </MagneticButton>
              <MagneticButton>
                <a href="#how-it-works">
                  <Button variant="outline" className="rounded-full px-8 py-6 text-base border-stone-300 hover:bg-stone-100">
                    Nasıl Çalışır?
                  </Button>
                </a>
              </MagneticButton>
            </div>
          </FadeIn>

          {/* Stats */}
          <FadeIn delay={2.0}>
            <div className="flex items-center justify-center gap-8 md:gap-12 mt-16 pt-8 border-t" style={{ borderColor: 'hsl(35, 15%, 88%)' }}>
              {[
                { value: 1200, suffix: '+', label: 'Kitap dizgilendi' },
                { value: 98, suffix: '%', label: 'Memnuniyet' },
                { value: 3, suffix: ' dk', label: 'Ortalama süre' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'hsl(30, 10%, 50%)' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-6 h-10 rounded-full border-2 flex items-start justify-center pt-2" style={{ borderColor: 'hsl(30, 10%, 65%)' }}>
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: 'hsl(25, 60%, 30%)' }}
              animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="py-24" style={{ backgroundColor: 'hsl(45, 30%, 97%)' }}>
        <div className="max-w-4xl mx-auto px-6">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Üç adımda kitabınız hazır
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="text-center mb-16" style={{ color: 'hsl(30, 10%, 45%)' }}>
              Karmaşık dizgi yazılımlarıyla uğraşmanıza gerek yok.
            </p>
          </FadeIn>

          <StaggerContainer staggerDelay={0.2} className="grid md:grid-cols-3 gap-12">
            {[
              { icon: Upload, step: '01', title: 'Yükleyin', desc: 'Word (.docx) dosyanızı sürükleyip bırakın. Görseller, tablolar, dipnotlar — hepsi otomatik algılanır.' },
              { icon: Settings, step: '02', title: 'Ayarlayın', desc: 'Sayfa boyutu, font, bölüm stili seçin. Canlı önizleme ile sonucu hemen görün.' },
              { icon: Download, step: '03', title: 'İndirin', desc: "Yapay zeka dizgiyi tamamlar, baskıya hazır PDF'iniz birkaç dakikada elinizde." },
            ].map((item) => (
              <StaggerItem key={item.step}>
                <HoverLift className="text-center">
                  <Float duration={4 + parseInt(item.step) * 0.5} distance={6}>
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                      style={{ backgroundColor: 'hsl(35, 25%, 90%)' }}
                    >
                      <item.icon className="w-6 h-6" style={{ color: 'hsl(25, 60%, 30%)' }} />
                    </div>
                  </Float>
                  <div className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'hsl(30, 45%, 65%)' }}>
                    Adım {item.step}
                  </div>
                  <h3 className="text-xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'hsl(30, 10%, 45%)' }}>{item.desc}</p>
                </HoverLift>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ===== DIVIDER with glow ===== */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-t glow-line h-px" style={{ borderColor: 'hsl(35, 15%, 85%)' }} />
      </div>

      {/* ===== FEATURES ===== */}
      <section id="features" className="py-24" style={{ backgroundColor: 'hsl(45, 30%, 97%)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Her detay düşünüldü
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="text-center mb-16" style={{ color: 'hsl(30, 10%, 45%)' }}>
              Profesyonel yayınevlerinin kullandığı dizgi standartları, artık elinizin altında.
            </p>
          </FadeIn>

          <StaggerContainer staggerDelay={0.1} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: FileText, title: 'Otomatik İçindekiler', desc: 'Bölüm başlıkları algılanır, içindekiler tablosu otomatik oluşturulur.' },
              { icon: Award, title: 'Profesyonel Tipografi', desc: 'LaTeX motoruyla mikrotipografi, heceleme ve satır optimizasyonu.' },
              { icon: BookOpen, title: 'Kapak Tasarımı', desc: 'Hazır şablonlardan seçin veya kendi kapak görselinizi yükleyin.' },
              { icon: Languages, title: 'Çoklu Dil', desc: 'Türkçe ve İngilizce tam destek. Heceleme kuralları otomatik.' },
              { icon: Shield, title: 'Kaynakça Yönetimi', desc: 'BibTeX desteği ile akademik referanslar otomatik düzenlenir.' },
              { icon: Zap, title: 'PDF/A Uyumlu', desc: 'Baskı ve arşiv standartlarına uygun çıktı. Fontlar gömülü.' },
            ].map((item, i) => (
              <StaggerItem key={i}>
                <div
                  className="p-6 rounded-xl border card-hover cursor-default"
                  style={{ borderColor: 'hsl(35, 15%, 88%)', backgroundColor: 'hsl(40, 25%, 96%)' }}
                >
                  <motion.div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: 'hsl(35, 25%, 90%)' }}
                    whileHover={{ rotate: 5, scale: 1.1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <item.icon className="w-5 h-5" style={{ color: 'hsl(25, 60%, 30%)' }} />
                  </motion.div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'hsl(30, 10%, 45%)' }}>{item.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ===== DIVIDER with glow ===== */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-t glow-line h-px" style={{ borderColor: 'hsl(35, 15%, 85%)' }} />
      </div>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="py-24" style={{ backgroundColor: 'hsl(45, 30%, 97%)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Basit fiyatlandırma
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="text-center mb-16" style={{ color: 'hsl(30, 10%, 45%)' }}>
              Küçük başlayın, ihtiyaç duydukça büyütün.
            </p>
          </FadeIn>

          <StaggerContainer staggerDelay={0.15} className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Ücretsiz', price: '₺0', period: 'sonsuza dek',
                features: ['Ayda 3 kitap', '100 sayfa limit', 'Temel şablonlar', 'Standart işleme'],
                cta: 'Ücretsiz Başla', highlighted: false,
              },
              {
                name: 'Pro', price: '₺99', period: '/ay',
                features: ['Sınırsız kitap', 'Sayfa limiti yok', 'Tüm şablonlar', 'Öncelikli işleme', 'Kapak tasarımı', 'LaTeX kaynak indirme'],
                cta: "Pro'ya Geç", highlighted: true,
              },
              {
                name: 'Kurumsal', price: '₺499', period: '/ay',
                features: ["Her şey Pro'da olan", 'API erişimi', 'Toplu işlem', 'Özel şablonlar', 'Öncelikli destek', 'SLA garantisi'],
                cta: 'İletişime Geç', highlighted: false,
              },
            ].map((plan) => (
              <StaggerItem key={plan.name}>
                <motion.div
                  className={`p-8 rounded-xl border card-hover ${plan.highlighted ? 'ring-2' : ''}`}
                  style={{
                    borderColor: plan.highlighted ? 'hsl(25, 60%, 30%)' : 'hsl(35, 15%, 88%)',
                    backgroundColor: plan.highlighted ? 'hsl(40, 30%, 95%)' : 'hsl(40, 25%, 96%)',
                  }}
                  whileHover={plan.highlighted ? { scale: 1.03 } : {}}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {plan.highlighted && (
                    <motion.div
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold mb-4"
                      style={{ backgroundColor: 'hsl(25, 60%, 30%)', color: 'white' }}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles className="w-3 h-3" />
                      En Popüler
                    </motion.div>
                  )}
                  {!plan.highlighted && (
                    <div className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'hsl(30, 45%, 65%)' }}>
                      {plan.name}
                    </div>
                  )}
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>{plan.price}</span>
                    <span className="text-sm" style={{ color: 'hsl(30, 10%, 45%)' }}>{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f, i) => (
                      <motion.li
                        key={i}
                        className="flex items-start gap-2 text-sm"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.08 }}
                      >
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'hsl(25, 60%, 30%)' }} />
                        <span>{f}</span>
                      </motion.li>
                    ))}
                  </ul>
                  <Link to="/register">
                    <Button
                      className={`w-full rounded-full py-5 btn-shine ${
                        plan.highlighted ? 'bg-stone-900 text-white hover:bg-stone-800' : 'bg-transparent border hover:bg-stone-100'
                      }`}
                      style={!plan.highlighted ? { borderColor: 'hsl(35, 15%, 80%)' } : {}}
                      variant={plan.highlighted ? 'default' : 'outline'}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <FadeIn>
        <section className="py-24 relative overflow-hidden" style={{ backgroundColor: 'hsl(30, 20%, 12%)' }}>
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: 'hsl(25, 60%, 30%)' }} />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: 'hsl(30, 45%, 25%)' }} />
          </div>
          <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ fontFamily: "'Playfair Display', serif", color: 'hsl(45, 30%, 95%)' }}
            >
              Kitabınız baskıya hazır olmayı hak ediyor
            </h2>
            <p className="text-lg mb-8" style={{ color: 'hsl(30, 10%, 65%)' }}>
              İlk projenizi ücretsiz oluşturun, farkı görün.
            </p>
            <MagneticButton className="inline-block">
              <Link to="/register">
                <Button className="bg-white text-stone-900 hover:bg-stone-100 rounded-full px-8 py-6 text-base font-semibold btn-shine">
                  Hemen Başlayın
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </MagneticButton>
          </div>
        </section>
      </FadeIn>

      {/* ===== FOOTER ===== */}
      <Footer variant="full" />
    </div>
  )
}
