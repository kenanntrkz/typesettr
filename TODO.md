# Typesettr — TODO & Roadmap

## Bilinen Sorunlar

- [ ] **DB feature key birikimi**: Eski feature key'leri (`toc` vs `tableOfContents` gibi) veritabaninda birikmis durumda. Backend sadece yeni key'leri okuyor, zararli degil ama karisikliga yol acabilir. Migration ile temizlenmeli.
- [ ] **Chunk size uyarisi**: Frontend build ciktisinda ~848KB JS bundle uyarisi var. Code-splitting ile cozulmeli.

---

## Kisa Vadeli

- [ ] Frontend code-splitting (React.lazy + Suspense) — bundle boyutunu dusur
- [ ] DB migration scripti — eski/kullanilmayan feature key'lerini temizle
- [ ] Test altyapisi genisletme — mevcut 3 test dosyasini (auth, project service) kapsamli hale getir
- [ ] Hata yonetimi iyilestirmeleri — frontend'te global error boundary'yi tum sayfalara yay
- [ ] i18n eksik cevirileri tamamla (Turkce + Ingilizce)
- [ ] LaTeX compiler timeout ayari kullaniciya gore yapilandirilabilir olsun

## Orta Vadeli

- [ ] CI/CD pipeline (GitHub Actions) — test + build + deploy otomasyonu
- [ ] Multi-user collaboration — ayni proje uzerinde birden fazla kullanici calisabilsin
- [ ] Template editor — admin panelinden LaTeX sablonlari duzenlenebilsin
- [ ] Batch processing — birden fazla DOCX'u tek seferde isleme
- [ ] WebSocket notification sistemi genisletme — email + in-app bildirimler
- [ ] Rate limiting iyilestirme — kullanici planina gore dinamik limitler

## Uzun Vadeli

- [ ] Kubernetes migration — Docker Compose'dan K8s'e gecis
- [ ] Plugin system — ucuncu parti LaTeX paketleri ve donusum eklentileri
- [ ] API marketplace — harici gelistiriciler icin public API
- [ ] AI-powered formatting — Anthropic API ile otomatik duzen onerileri
- [ ] White-label destegi — musterilere ozel branding

---

## Tamamlananlar

- [x] Temel DOCX -> LaTeX -> PDF pipeline
- [x] Kullanici kayit/giris sistemi (email dogrulama dahil)
- [x] Admin paneli (9 sayfa: Dashboard, Users, Projects, Analytics, Queue, Logs, Settings, System, User Detail)
- [x] MinIO ile dosya depolama
- [x] Redis ile kuyruk yonetimi (BullMQ)
- [x] Kapak sayfasi sablonlari
- [x] Socket.IO ile gercek zamanli durum takibi
- [x] Rate limiting ve guvenlik middleware'leri
- [x] Coklu dil destegi (i18n altyapisi)
- [x] Docker Compose ile production deployment
