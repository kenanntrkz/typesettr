#!/bin/bash
# ============================================
# TYPESETTR — Production Deploy Script
# Hetzner sunucusunda calistirilacak
# ============================================
set -e

echo "=========================================="
echo "  TYPESETTR DEPLOY SCRIPT"
echo "=========================================="

# --- 1. Docker Kurulumu (yoksa) ---
if ! command -v docker &> /dev/null; then
    echo "[1/7] Docker kuruluyor..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "Docker kuruldu."
else
    echo "[1/7] Docker zaten kurulu: $(docker --version)"
fi

# --- 2. Docker Compose kontrolu ---
if ! docker compose version &> /dev/null; then
    echo "[2/7] Docker Compose plugin kuruluyor..."
    apt-get update && apt-get install -y docker-compose-plugin
    echo "Docker Compose kuruldu."
else
    echo "[2/7] Docker Compose zaten kurulu: $(docker compose version)"
fi

# --- 3. Proje dizinine git ---
PROJECT_DIR="/opt/typesettr"
echo "[3/7] Proje dizini hazirlaniyor: $PROJECT_DIR"

if [ -d "$PROJECT_DIR/.git" ]; then
    echo "  Mevcut repo guncelleniyor..."
    cd "$PROJECT_DIR"
    git pull origin master
else
    echo "  Repo klonlaniyor..."
    git clone https://github.com/kenanntrkz/typesettr.git "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

# --- 4. .env dosyasi kontrolu ---
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo ""
    echo "=========================================="
    echo "  UYARI: .env dosyasi bulunamadi!"
    echo "=========================================="
    echo ""
    echo "  .env.example dosyasini kopyalayip doldurun:"
    echo ""
    echo "    cp .env.example .env"
    echo "    nano .env"
    echo ""
    echo "  Sonra bu scripti tekrar calistirin."
    echo ""
    exit 1
fi

echo "[4/7] .env dosyasi mevcut."

# --- 5. Frontend build ---
echo "[5/7] Frontend build ediliyor..."
cd "$PROJECT_DIR/frontend"

# Node.js kontrolu (frontend build icin)
if ! command -v node &> /dev/null; then
    echo "  Node.js kuruluyor..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

npm ci --production=false
VITE_API_URL=/api npm run build
echo "  Frontend build tamamlandi -> frontend/dist/"

# --- 6. Docker Compose ile servisleri baslat ---
cd "$PROJECT_DIR"
echo "[6/7] Docker container'lar baslatiliyor..."
docker compose down --remove-orphans 2>/dev/null || true
docker compose up -d --build

echo ""
echo "  Container durumu:"
docker compose ps
echo ""

# --- 7. Saglik kontrolu ---
echo "[7/7] Saglik kontrolu yapiliyor..."
sleep 10

if curl -sf http://localhost:3100/health > /dev/null 2>&1; then
    echo "  Backend: OK"
else
    echo "  Backend: BASARISIZ - loglar kontrol ediliyor..."
    docker compose logs --tail=20 backend
fi

if curl -sf http://localhost:8080 > /dev/null 2>&1; then
    echo "  Frontend: OK"
else
    echo "  Frontend: BASARISIZ - loglar kontrol ediliyor..."
    docker compose logs --tail=20 frontend
fi

echo ""
echo "=========================================="
echo "  DEPLOY TAMAMLANDI!"
echo "=========================================="
echo ""
echo "  Servisler:"
echo "    Frontend:      http://localhost:8080"
echo "    Backend API:   http://localhost:3100/api"
echo "    MinIO Console: http://localhost:9011"
echo "    Health Check:  http://localhost:3100/health"
echo ""
echo "  Simdi Nginx Proxy ayarlayarak"
echo "  typesettr.kenanturkoz.cloud -> localhost:8080"
echo "  yonlendirmesi yapin."
echo ""
echo "  Loglari izlemek icin:"
echo "    docker compose logs -f"
echo ""
