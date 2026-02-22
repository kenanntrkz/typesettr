# Typesettr — Proje Referans Belgesi

## Proje Ozeti

**Typesettr** — DOCX dosyalarini LaTeX uzerinden profesyonel PDF'lere donusturen SaaS platformu.
Kullanicilar DOCX yukler, sistem otomatik olarak LaTeX'e cevirir, derler ve indirilebilir PDF uretir.

- **Domain:** `typesettr.kenanturkoz.cloud`
- **Sunucu:** Hetzner Server 1 (91.99.207.148)
- **Proje dizini:** `/opt/typesettr`
- **Branch:** `main`

---

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Backend | Node.js + Express.js |
| Frontend | React 19 + Vite + Tailwind CSS |
| UI Kit | Radix UI + shadcn/ui |
| Veritabani | PostgreSQL 16 (Sequelize ORM) |
| Cache/Queue | Redis 7 + BullMQ |
| Object Storage | MinIO |
| LaTeX | TeX Live (Docker container) |
| AI | Anthropic Claude API (opsiyonel) |
| Realtime | Socket.IO |
| i18n | i18next (TR/EN) |
| Auth | JWT (access + refresh token) |

---

## Proje Yapisi

```
/opt/typesettr/
├── src/                        # Backend (Node.js/Express)
│   ├── config/                 # database.js, redis.js, minio.js, socket.js
│   ├── middleware/              # auth, adminAuth, errorHandler, fileValidator, rateLimiter
│   ├── models/                 # User, Project, File, AuditLog, ProcessingLog, SiteSetting
│   ├── routes/                 # auth, project, file, typeset, cover, admin
│   ├── services/               # Is mantigi katmani
│   │   ├── auth.service.js
│   │   ├── project.service.js
│   │   ├── file.service.js
│   │   ├── docxParser.service.js
│   │   ├── latexGenerator.service.js
│   │   ├── latexCompiler.service.js
│   │   ├── cover.service.js
│   │   ├── admin.service.js
│   │   ├── aiAnalyzer.service.js
│   │   ├── email.service.js
│   │   └── notification.service.js
│   ├── queues/                 # typeset.queue, cover.queue, cleanup.queue
│   ├── utils/                  # logger, latexSanitizer, chunkText, templateEngine
│   └── __tests__/              # Jest test dosyalari
├── frontend/                   # React/Vite SPA
│   └── src/
│       ├── components/         # UI bilesenleri (Radix/shadcn)
│       │   ├── layout/         # MainLayout, AuthLayout, AdminLayout, Footer
│       │   └── ui/             # button, card, dialog, input, tabs, vb.
│       ├── pages/              # Sayfa bilesenleri
│       │   ├── admin/          # 9 admin sayfasi
│       │   └── *.jsx           # Public + auth + kullanici sayfalari
│       └── stores/             # Zustand store (authStore)
├── latex-compiler/             # Bagimsiz LaTeX derleme servisi
│   ├── server.js               # Express API (port 3001)
│   ├── compiler.js             # LaTeX derleme mantigi
│   ├── templates/              # LaTeX sablonlari
│   └── Dockerfile
├── frontend-nginx/             # Nginx config (frontend serve + API proxy)
├── docker-compose.yml
├── Dockerfile                  # Backend Dockerfile
├── .env / .env.example
└── init.sql                    # PostgreSQL init script
```

---

## Docker Servisleri

| Servis | Container | Port | Aciklama |
|--------|-----------|------|----------|
| backend | typesettr-backend | 127.0.0.1:3100->3000 | Express API |
| latex-compiler | typesettr-latex | internal:3001 | LaTeX derleme servisi |
| typesettr-postgres | typesettr-postgres | 127.0.0.1:5433->5432 | PostgreSQL 16 |
| typesettr-redis | typesettr-redis | 127.0.0.1:6380->6379 | Redis 7 (sifreli) |
| typesettr-minio | typesettr-minio | 127.0.0.1:9010->9000, 9011 | MinIO object storage |
| frontend | typesettr-frontend | 127.0.0.1:8085->80 | Nginx (static + proxy) |

---

## API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint | Auth | Aciklama |
|--------|----------|------|----------|
| POST | /register | - | Kayit |
| POST | /login | - | Giris |
| POST | /verify-email | - | Email dogrulama |
| POST | /resend-verification | JWT | Dogrulama tekrar gonder |
| POST | /forgot-password | - | Sifre sifirlama talebi |
| POST | /reset-password | - | Sifre sifirla |
| GET | /profile | JWT | Profil bilgisi |
| PUT | /profile | JWT | Profil guncelle |

### Projects (`/api/projects`)
| Method | Endpoint | Auth | Aciklama |
|--------|----------|------|----------|
| POST | / | JWT | Yeni proje olustur |
| GET | / | JWT | Projeleri listele |
| GET | /:id | JWT | Proje detayi |
| GET | /:id/download/:type | JWT | PDF/LaTeX indir |
| DELETE | /:id | JWT | Proje sil |

### Files (`/api/files`)
| Method | Endpoint | Auth | Aciklama |
|--------|----------|------|----------|
| POST | /upload | JWT | DOCX yukle |
| GET | /:id/download | JWT | Dosya indir |

### Typeset (`/api/typeset`)
| Method | Endpoint | Auth | Aciklama |
|--------|----------|------|----------|
| POST | /start | JWT | Donusum baslat |
| GET | /:jobId/status | JWT | Is durumu |
| POST | /retry/:projectId | JWT | Tekrar dene |
| POST | /cancel/:projectId | JWT | Iptal et |

### Cover (`/api/cover`)
| Method | Endpoint | Auth | Aciklama |
|--------|----------|------|----------|
| GET | /templates | - | Sablon listesi |
| GET | /templates/:id | - | Sablon detayi |

### Admin (`/api/admin`) — Tumu JWT + Admin rolu gerektirir
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | /dashboard | Dashboard istatistikleri |
| GET | /stats/:period | Donemsel istatistikler |
| GET | /audit-logs | Denetim loglari |
| GET | /users | Kullanici listesi |
| GET | /users/:id | Kullanici detayi |
| PUT | /users/:id/role | Rol degistir (superadmin) |
| PUT | /users/:id/plan | Plan degistir |
| PUT | /users/:id/ban | Ban/unban |
| GET | /projects | Tum projeler |
| GET | /projects/:id | Proje detayi |
| DELETE | /projects/:id | Proje sil |
| GET | /queue/stats | Kuyruk istatistikleri |
| GET | /queue/jobs | Kuyruk isleri |
| POST | /queue/retry/:jobId | Is tekrar dene |
| POST | /queue/clean | Kuyruk temizle |
| GET | /settings | Site ayarlari |
| PUT | /settings | Ayarlari guncelle |
| GET | /system/health | Sistem saglik durumu |

---

## Frontend Routes

### Public Sayfalar
| Route | Sayfa | Aciklama |
|-------|-------|----------|
| `/` | LandingPage | Ana sayfa |
| `/about` | AboutPage | Hakkinda |
| `/faq` | FaqPage | SSS |
| `/contact` | ContactPage | Iletisim |
| `/privacy` | PrivacyPage | Gizlilik politikasi |

### Auth Sayfalar (AuthLayout)
| Route | Sayfa | Guard |
|-------|-------|-------|
| `/login` | LoginPage | GuestRoute |
| `/register` | RegisterPage | GuestRoute |
| `/forgot-password` | ForgotPasswordPage | GuestRoute |
| `/reset-password` | ResetPasswordPage | GuestRoute |

### Kullanici Sayfalari (MainLayout — ProtectedRoute)
| Route | Sayfa |
|-------|-------|
| `/dashboard` | DashboardPage |
| `/projects/new` | NewProjectPage |
| `/projects/:id` | ProjectDetailPage |
| `/profile` | ProfilePage |

### Admin Sayfalar (AdminLayout — AdminRoute)
| Route | Sayfa |
|-------|-------|
| `/admin` | AdminDashboardPage |
| `/admin/users` | AdminUsersPage |
| `/admin/users/:id` | AdminUserDetailPage |
| `/admin/projects` | AdminProjectsPage |
| `/admin/analytics` | AdminAnalyticsPage |
| `/admin/queue` | AdminQueuePage |
| `/admin/logs` | AdminLogsPage |
| `/admin/settings` | AdminSettingsPage |
| `/admin/system` | AdminSystemPage |

---

## Veritabani Modelleri

### User
- `id` (UUID, PK), `email`, `password_hash`, `name`
- `language` (tr/en), `plan` (free/pro/enterprise), `role` (user/admin/superadmin)
- `is_banned`, `projects_count`
- `email_verified`, `verification_token`, `verification_expires`
- `reset_token`, `reset_expires`

### Project
- `id` (UUID, PK), `user_id` (FK->User)
- `name`, `status` (pending/processing/completed/failed)
- Feature flags (JSONB): tableOfContents, coverPage, headerFooter, vb.

### File
- `id` (UUID, PK), `project_id` (FK->Project)
- `type` (source_docx/output_pdf/output_latex/cover_image)
- `filename`, `minio_key`, `size`, `mime_type`

### AuditLog
- Admin eylemlerinin kaydi (who, what, when)

### ProcessingLog
- Donusum islemlerinin adim adim kaydi

### SiteSetting
- Key-value site ayarlari (admin panelinden yonetilir)

---

## Deploy

```bash
# SSH baglantisi
ssh root@91.99.207.148

# Deploy (git pull + frontend build + docker restart)
cd /opt/typesettr && git pull origin main
cd frontend && npm ci --production=false && VITE_API_URL=/api npm run build
cd /opt/typesettr && docker compose up -d --build
```

---

## Environment Variables

### PostgreSQL
- `DB_PASSWORD`, `DATABASE_URL`

### Redis
- `REDIS_URL`, `REDIS_PASSWORD`

### MinIO
- `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`
- `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`

### Backend
- `PORT`, `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`

### CORS
- `CORS_ORIGINS`

### Email (SMTP)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

### LaTeX Compiler
- `LATEX_COMPILER_URL`

### AI (opsiyonel)
- `ANTHROPIC_API_KEY`

### Log
- `LOG_LEVEL`
