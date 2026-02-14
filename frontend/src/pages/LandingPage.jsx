import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import usePageTitle from '@/hooks/usePageTitle'
import { Button } from '@/components/ui/button'
import { FadeIn, StaggerContainer, StaggerItem, HoverLift, MagneticButton, Float, GlowPulse, TextReveal } from '@/components/ui/animations'
import Footer from '@/components/layout/Footer'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  BookOpen, Upload, Settings, Download, FileText, Languages,
  Award, CheckCircle, ArrowRight, Sparkles, Zap, Shield,
  Menu, X, Star, Clock, FileCheck, CreditCard, Headphones, Lock
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
  usePageTitle(null)
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
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

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-stone-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menü"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ===== MOBILE MENU ===== */}
      {mobileMenuOpen && (
        <motion.div
          className="fixed inset-x-0 top-16 z-40 border-b md:hidden"
          style={{ backgroundColor: 'hsl(45, 30%, 97%)', borderColor: 'hsl(35, 15%, 88%)' }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <div className="flex flex-col p-6 gap-4">
            <a href="#features" className="text-sm py-2 hover:opacity-70 transition-opacity" style={{ color: 'hsl(30, 10%, 40%)' }}
              onClick={() => setMobileMenuOpen(false)}>
              Özellikler
            </a>
            <a href="#pricing" className="text-sm py-2 hover:opacity-70 transition-opacity" style={{ color: 'hsl(30, 10%, 40%)' }}
              onClick={() => setMobileMenuOpen(false)}>
              Fiyatlar
            </a>
            <Link to="/login" className="text-sm py-2 hover:opacity-70 transition-opacity" style={{ color: 'hsl(30, 10%, 40%)' }}
              onClick={() => setMobileMenuOpen(false)}>
              Giriş Yap
            </Link>
            <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full bg-stone-900 text-white hover:bg-stone-800 rounded-full text-sm">
                Ücretsiz Başla
              </Button>
            </Link>
          </div>
        </motion.div>
      )}

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

      {/* ===== BEFORE / AFTER COMPARISON ===== */}
      <section className="py-24" style={{ backgroundColor: 'hsl(45, 30%, 97%)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Farkı görün
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="text-center mb-16" style={{ color: 'hsl(30, 10%, 45%)' }}>
              Aynı içerik, bambaşka bir okuma deneyimi.
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="grid md:grid-cols-2 gap-8">
              {/* BEFORE — Word */}
              <motion.div
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: 'hsl(35, 15%, 85%)', backgroundColor: 'white' }}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="px-4 py-2.5 flex items-center gap-2 border-b" style={{ backgroundColor: 'hsl(220, 50%, 96%)', borderColor: 'hsl(220, 30%, 88%)' }}>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(0, 70%, 65%)' }} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(45, 80%, 60%)' }} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(130, 50%, 55%)' }} />
                  </div>
                  <span className="text-xs ml-2" style={{ color: 'hsl(220, 15%, 55%)', fontFamily: "'Inter', sans-serif" }}>belge.docx — Word</span>
                </div>
                <div className="p-8" style={{ fontFamily: "'Inter', sans-serif" }}>
                  <div className="mb-4">
                    <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'hsl(220, 40%, 92%)', color: 'hsl(220, 30%, 50%)' }}>Önce</span>
                  </div>
                  <h3 className="text-lg font-bold mb-3" style={{ fontFamily: "'Inter', sans-serif", color: 'hsl(0, 0%, 15%)' }}>
                    Birinci Bölüm
                  </h3>
                  <p className="text-sm leading-[1.5] mb-3" style={{ color: 'hsl(0, 0%, 25%)', textAlign: 'left' }}>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                  <p className="text-sm leading-[1.5] mb-3" style={{ color: 'hsl(0, 0%, 25%)', textAlign: 'left' }}>
                    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.
                  </p>
                  <div className="flex gap-1 mt-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-1 rounded-full flex-1" style={{ backgroundColor: 'hsl(0, 0%, 85%)' }} />
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* AFTER — Typesettr */}
              <motion.div
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: 'hsl(25, 40%, 75%)', backgroundColor: 'hsl(40, 40%, 98%)' }}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="px-4 py-2.5 flex items-center gap-2 border-b" style={{ backgroundColor: 'hsl(35, 30%, 93%)', borderColor: 'hsl(35, 20%, 85%)' }}>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(0, 70%, 65%)' }} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(45, 80%, 60%)' }} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(130, 50%, 55%)' }} />
                  </div>
                  <span className="text-xs ml-2" style={{ color: 'hsl(30, 15%, 50%)', fontFamily: "'Inter', sans-serif" }}>kitap.pdf — Typesettr</span>
                </div>
                <div className="p-8" style={{ fontFamily: "'Playfair Display', serif" }}>
                  <div className="mb-4">
                    <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'hsla(25, 60%, 30%, 0.12)', color: 'hsl(25, 60%, 30%)', fontFamily: "'Inter', sans-serif" }}>Sonra</span>
                  </div>
                  <div className="text-xs tracking-[0.3em] uppercase mb-6" style={{ color: 'hsl(30, 30%, 60%)', fontFamily: "'Inter', sans-serif", letterSpacing: '0.25em' }}>
                    Birinci Bölüm
                  </div>
                  <h3 className="text-2xl font-bold mb-5 italic" style={{ color: 'hsl(25, 60%, 30%)' }}>
                    Yolculuğun Başlangıcı
                  </h3>
                  <p className="text-sm leading-[1.85] mb-4" style={{ color: 'hsl(30, 15%, 25%)', textAlign: 'justify', textIndent: '1.5em' }}>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
                  </p>
                  <p className="text-sm leading-[1.85]" style={{ color: 'hsl(30, 15%, 25%)', textAlign: 'justify', textIndent: '1.5em' }}>
                    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat.
                  </p>
                  <div className="text-center mt-6 text-xs" style={{ color: 'hsl(30, 15%, 60%)', fontFamily: "'Inter', sans-serif" }}>— 1 —</div>
                </div>
              </motion.div>
            </div>
          </FadeIn>
        </div>
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

      {/* ===== SAMPLE PDF SHOWCASE ===== */}
      <section className="py-24" style={{ backgroundColor: 'hsl(45, 30%, 97%)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Örnek çıktılar
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="text-center mb-16" style={{ color: 'hsl(30, 10%, 45%)' }}>
              Typesettr ile oluşturulmuş farklı türlerdeki kitaplar.
            </p>
          </FadeIn>

          <StaggerContainer staggerDelay={0.15} className="grid md:grid-cols-3 gap-8">
            {[
              {
                type: 'Roman',
                title: 'Sessiz Şehir',
                pages: 284,
                duration: '2 dk 15 sn',
                bgGradient: 'linear-gradient(135deg, hsl(25, 50%, 25%) 0%, hsl(30, 40%, 18%) 100%)',
              },
              {
                type: 'Akademik',
                title: 'Veri Bilimi ve İstatistik',
                pages: 412,
                duration: '3 dk 40 sn',
                bgGradient: 'linear-gradient(135deg, hsl(210, 40%, 35%) 0%, hsl(215, 35%, 22%) 100%)',
              },
              {
                type: 'Teknik Kitap',
                title: 'Modern Web Geliştirme',
                pages: 356,
                duration: '3 dk 10 sn',
                bgGradient: 'linear-gradient(135deg, hsl(160, 35%, 30%) 0%, hsl(165, 30%, 20%) 100%)',
              },
            ].map((book, i) => (
              <StaggerItem key={i}>
                <motion.div
                  className="group rounded-xl border overflow-hidden cursor-pointer"
                  style={{ borderColor: 'hsl(35, 15%, 88%)', backgroundColor: 'hsl(40, 25%, 96%)' }}
                  whileHover={{ y: -6 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {/* Book cover simulation */}
                  <div
                    className="relative h-56 flex items-center justify-center overflow-hidden"
                    style={{ background: book.bgGradient }}
                  >
                    <div className="absolute inset-0 opacity-10">
                      {[...Array(6)].map((_, j) => (
                        <div
                          key={j}
                          className="absolute h-px w-full"
                          style={{ backgroundColor: 'white', top: `${20 + j * 12}%` }}
                        />
                      ))}
                    </div>
                    <div className="relative text-center px-6">
                      <div className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: 'hsla(0, 0%, 100%, 0.6)' }}>
                        {book.type}
                      </div>
                      <h4 className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {book.title}
                      </h4>
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-colors duration-300">
                      <span className="text-white text-sm font-medium px-4 py-2 rounded-full border border-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Yakında
                      </span>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-5">
                    <h4 className="font-semibold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>{book.title}</h4>
                    <div className="flex items-center justify-between text-xs" style={{ color: 'hsl(30, 10%, 50%)' }}>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {book.pages} sayfa
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {book.duration}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ===== DIVIDER with glow ===== */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-t glow-line h-px" style={{ borderColor: 'hsl(35, 15%, 85%)' }} />
      </div>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-24" style={{ backgroundColor: 'hsl(45, 30%, 97%)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Kullanıcılarımız ne diyor?
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="text-center mb-16" style={{ color: 'hsl(30, 10%, 45%)' }}>
              Yüzlerce yazar ve yayınevi Typesettr'a güveniyor.
            </p>
          </FadeIn>

          <StaggerContainer staggerDelay={0.15} className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Elif Yılmaz',
                role: 'Roman Yazarı',
                rating: 5,
                text: 'İlk romanımı yayına hazırlamak için haftalarca uğraştım. Typesettr ile 3 dakikada profesyonel bir dizgi elde ettim. Sonuç matbaacıyı bile şaşırttı.',
              },
              {
                name: 'Prof. Dr. Ahmet Kaya',
                role: 'Akademisyen, İTÜ',
                rating: 5,
                text: 'Akademik kitaplarımız için LaTeX kullanıyorduk. Typesettr aynı kaliteyi çok daha kolay sunuyor. Kaynakça yönetimi mükemmel.',
              },
              {
                name: 'Zeynep Arslan',
                role: 'Yayınevi Editörü',
                rating: 5,
                text: 'Yayınevimizde aylık 20+ kitap diziyoruz. Typesettr iş akışımızı tamamen değiştirdi. Zamandan ve maliyetten büyük tasarruf.',
              },
            ].map((testimonial, i) => (
              <StaggerItem key={i}>
                <motion.div
                  className="p-6 rounded-xl border h-full flex flex-col"
                  style={{ borderColor: 'hsl(35, 15%, 88%)', backgroundColor: 'hsl(40, 25%, 96%)' }}
                  whileHover={{ y: -4 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-current" style={{ color: 'hsl(40, 80%, 50%)' }} />
                    ))}
                  </div>
                  {/* Quote */}
                  <p className="text-sm leading-relaxed flex-1 mb-6" style={{ color: 'hsl(30, 10%, 35%)' }}>
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                  {/* Author */}
                  <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: 'hsl(35, 15%, 90%)' }}>
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                      style={{ backgroundColor: 'hsl(25, 40%, 88%)', color: 'hsl(25, 60%, 30%)' }}
                    >
                      {testimonial.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{testimonial.name}</div>
                      <div className="text-xs" style={{ color: 'hsl(30, 10%, 50%)' }}>{testimonial.role}</div>
                    </div>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Trust stats */}
          <FadeIn delay={0.5}>
            <div className="flex items-center justify-center gap-8 md:gap-16 mt-16 pt-8 border-t" style={{ borderColor: 'hsl(35, 15%, 88%)' }}>
              {[
                { value: '1.200+', label: 'Kitap dizgilendi' },
                { value: '%98', label: 'Memnuniyet oranı' },
                { value: '50+', label: 'Yayınevi güveniyor' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-xl md:text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: 'hsl(25, 60%, 30%)' }}>
                    {stat.value}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'hsl(30, 10%, 50%)' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </FadeIn>
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
            {/* Trust note */}
            <p className="mt-6 text-sm" style={{ color: 'hsl(30, 10%, 55%)' }}>
              Kredi kartı gerekmez
            </p>
            <div className="flex items-center justify-center gap-6 mt-4">
              {[
                { icon: Lock, text: 'Güvenli altyapı' },
                { icon: CreditCard, text: 'Kolay ödeme' },
                { icon: Headphones, text: '7/24 destek' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: 'hsl(30, 10%, 50%)' }}>
                  <item.icon className="w-3.5 h-3.5" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ===== FOOTER ===== */}
      <Footer variant="full" />
    </div>
  )
}
