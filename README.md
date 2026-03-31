# ระบบจองรถยนต์

ระบบจองและบริหารจัดการรถยนต์สำหรับองค์กร พัฒนาด้วย Next.js 15 + PostgreSQL
รองรับการ Deploy ทั้งแบบ Docker Compose และ K3s (Kubernetes)

---

## Tech Stack

| ชั้น | เทคโนโลยี |
|------|-----------|
| Frontend / Backend | Next.js 15 App Router (Full-stack) |
| Database | PostgreSQL 16+ (via Prisma ORM) |
| Styling | Tailwind CSS |
| Container | Docker / K3s |
| Ingress / Reverse Proxy | Traefik |
| Backup | pg_dump + tar.gz (cron ทุกวัน 01:00) |

---

## ฟีเจอร์หลัก

- **จองรถ** — เลือกรถ คนขับ วันเดินทาง พร้อมตรวจสอบ conflict อัตโนมัติ
- **Admin Panel** — จัดการผู้ใช้ รถ คนขับ ดู log กิจกรรม
- **Analytics** — สถิติการจอง ประสิทธิภาพรถและคนขับ
- **ระบบ Backup** — backup DB + uploads อัตโนมัติ พร้อม restore ผ่าน UI
- **Health Check** — ตรวจสอบสถานะระบบ DB table endpoint ผ่าน `/api/health`
- **Doctor** — วินิจฉัยและแก้ไขปัญหาระบบอัตโนมัติ (backup dir, crontab, permissions)
- **แจ้งเตือน** — Telegram / LINE เมื่อมีการจองใหม่

---

## โครงสร้างโปรเจค

```
├── src/
│   ├── app/
│   │   ├── api/           # API routes (Next.js Route Handlers)
│   │   │   ├── auth/      # login, logout, me
│   │   │   ├── backup/    # backup list, download, restore
│   │   │   ├── doctor/    # ตรวจสอบและแก้ไขระบบ
│   │   │   ├── health/    # health check
│   │   │   └── ...
│   │   ├── admin/         # Admin panel
│   │   ├── booking/       # หน้าจองรถ
│   │   └── analytics/     # สถิติ
│   ├── components/
│   │   ├── admin/         # UsersSection, CarsSection, DoctorSection, BackupSection ...
│   │   └── ...
│   └── lib/
│       ├── prisma.ts      # Prisma ORM client (singleton)
│       ├── auth.ts        # getSessionUser(), requireAdmin()
│       ├── config.ts      # system config helpers
│       ├── date-utils.ts  # formatDate, formatTime, parseBEDate
│       ├── mappers.ts     # toBookingResponse() mapper
│       ├── upload-utils.ts
│       ├── utils.ts       # UI helpers
│       └── notifications.ts
├── prisma/
│   ├── schema.prisma      # Database schema (8 models)
│   └── seed.ts            # Admin user seeding
├── scripts/
│   ├── backup-database.sh      # pg_dump + uploads tar.gz
│   ├── cleanup-old-backups.sh  # ลบ backup เก่าเกิน 30 วัน
│   ├── db-pull-prod.sh         # ดึง DB จาก production
│   └── db-reset.sh             # reset DB สำหรับ dev
├── k3s-manifests/              # Kubernetes manifests
├── backup-auto/                # ที่เก็บ backup (gitignored)
├── deploy-docker.sh            # Deploy ผ่าน Docker Compose
├── deploy-k3s.sh               # Deploy ผ่าน K3s
└── docker-compose.prod.yml
```

---

## สภาพแวดล้อม

| Mode | URL | ใช้เมื่อ |
|------|-----|---------|
| Development | `http://localhost:3000` | พัฒนา code |
| Production Docker | `https://<domain>` | deploy ผ่าน Docker Compose |
| Production K3s | `https://<domain>` | deploy ผ่าน K3s cluster |

---

## 1. Development

**ความต้องการ:** Node.js 20+, PostgreSQL 16

```bash
# Clone
git clone https://github.com/KamaruSama/web-vrdnkcar.git
cd web-vrdnkcar

# ติดตั้ง dependencies
npm install

# ตั้งค่า environment
cp .env.example .env
# แก้ไขค่าใน .env

# รัน dev server
npm run dev
```

เปิด http://localhost:3000

---

## 2. Production — Docker Compose

**ความต้องการ:** Docker, Docker Compose plugin, `traefik-public` network

```bash
# ตั้งค่า environment
cp .env.example .env
# แก้ไขค่า POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, DOMAIN ฯลฯ

# Build + Deploy (ครั้งเดียวจบ)
bash deploy-docker.sh
```

`deploy-docker.sh` จะทำ:
1. หยุด app container ชั่วคราว
2. `npm run build` → standalone output
3. `docker compose -f docker-compose.prod.yml up -d`
4. ตรวจสอบว่า container ขึ้นมาแล้ว

**ดู logs:**
```bash
docker compose -f docker-compose.prod.yml logs -f app
```

> **Note:** PostgreSQL expose ที่ port `5438` บน host (ไม่ชนกับ postgres อื่น)

---

## 3. Production — K3s

**ความต้องการ:** K3s cluster พร้อม Traefik, `kubectl` ที่ตั้งค่า context แล้ว, Docker

```bash
# ตั้งค่า environment variables
export DOMAIN=example.com
export DB_USER=myuser
export DB_PASSWORD=$(openssl rand -hex 16)
export DB_NAME=mydb
export SITE_NAME="ระบบจองรถ"
export ORGANIZATION="ชื่อหน่วยงาน"
export TELEGRAM_ENABLED=false
export TELEGRAM_TOKEN=""
export TELEGRAM_CHAT_ID=""
export LINE_ENABLED=false
export LINE_TOKEN=""
export LINE_USER_ID_1=""
export LINE_USER_ID_2=""

# Build + Deploy (ครั้งเดียวจบ)
bash deploy-k3s.sh
```

`deploy-k3s.sh` จะทำ:
1. `npm run build`
2. `docker build -f Dockerfile.k3s -t web-vrdnkcar:latest .`
3. Import image เข้า k3s containerd
4. Apply manifests ทั้งหมด (namespace, secrets, PVC, deployment, service, ingressroute)
5. `kubectl rollout restart` และรอจนพร้อม

**ตรวจสอบหลัง deploy:**
```bash
kubectl get pods -n web-vrdnkcar
kubectl logs -n web-vrdnkcar -l app=web-vrdnkcar-app -f
```

---

## 4. Environment Variables

```bash
cp .env.example .env
```

| Variable | คำอธิบาย | Docker | K3s |
|----------|----------|--------|-----|
| `POSTGRES_USER` | ชื่อ user PostgreSQL | ✓ | template |
| `POSTGRES_PASSWORD` | รหัสผ่าน PostgreSQL | ✓ | template |
| `POSTGRES_DB` | ชื่อ database | ✓ | template |
| `DB_HOST` | host database (`db` สำหรับ Docker) | ✓ | — |
| `DB_PORT` | port database | ✓ | — |
| `DATABASE_URL` | Prisma connection string | ✓ | template |
| `DOMAIN` | domain name | ✓ | template |
| `NEXT_PUBLIC_SITE_NAME` | ชื่อระบบที่แสดงในเว็บ | ✓ | template |
| `NEXT_PUBLIC_ORGANIZATION` | ชื่อหน่วยงาน | ✓ | template |
| `APP_URL` | URL เต็มของแอป (`https://...`) | ✓ | template |
| `USE_SECURE_COOKIES` | `true` สำหรับ HTTPS production | ✓ | template |
| `TELEGRAM_ENABLED` | `true/false` | ✓ | template |
| `TELEGRAM_TOKEN` | Bot token | ✓ | template |
| `TELEGRAM_CHAT_ID` | Chat ID | ✓ | template |
| `LINE_ENABLED` | `true/false` | ✓ | template |
| `LINE_TOKEN` | LINE Notify token | ✓ | template |
| `LINE_USER_ID_1/2` | LINE User ID | ✓ | template |

> **K3s:** ไม่ใช้ `.env` โดยตรง — ค่าถูก inject ผ่าน `envsubst` เข้า Kubernetes Secret แทน
> **Backup script:** ใช้ `.env` บน host เพื่อดึง DB credentials

---

## 5. ระบบ Backup

Backup ทำงานอัตโนมัติทุกวัน **01:00** ผ่าน crontab

**ไฟล์ที่ backup:**
- Database → `pg_dump -Fc` (compressed, สามารถ restore ได้เลย)
- Uploads → `tar.gz` ของ `public/uploads/`

**ที่เก็บ:** `backup-auto/daily/YYYY/MM/DD/`

**ตั้ง crontab ด้วยมือ (ถ้ายังไม่มี):**
```bash
crontab -e
# เพิ่มบรรทัดนี้:
0 1 * * * bash /path/to/project/scripts/backup-database.sh >> /path/to/project/backup-auto/backup.log 2>&1
```

**หรือใช้ Doctor panel** ใน Admin → ตรวจสอบระบบ → ระบบ Backup → แก้ไขอัตโนมัติ

**Restore ผ่าน UI:** Admin → สำรองข้อมูล → เลือกไฟล์ → ดึงข้อมูล

---

## 6. Health Check & Doctor

### Health Check
```
GET /api/health
```
ตรวจสอบ: Database connection, Tables, Bookings, Fleet, Users, Storage, Backup (backupDir, pg_dump, crontab)

### Doctor Panel
Admin → ตรวจสอบระบบ — วินิจฉัย 4 หมวด:

| หมวด | ตรวจสอบ | Auto-fix |
|------|---------|---------|
| การ Deploy | k3s/Docker mode, Secret, Container status | Docker: start container, create network |
| ระบบ Backup | backup-auto/, pg_dump, crontab, อายุ backup | สร้าง directory, เพิ่ม crontab |
| ที่เก็บไฟล์ | uploads/, originals/, writable | mkdir, chmod |
| Script Permissions | execute permission ทุก .sh | chmod +x |

---

## 7. API Endpoints หลัก

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/health` | สถานะระบบ |
| GET | `/api/doctor` | ตรวจสอบระบบ |
| POST | `/api/doctor` | แก้ไขปัญหา `{ category }` |
| POST | `/api/auth/login` | เข้าสู่ระบบ |
| GET | `/api/auth/me` | ข้อมูล session ปัจจุบัน |
| POST | `/api/auth/logout` | ออกจากระบบ |
| GET/POST | `/api/bookings` | รายการ / สร้างการจอง |
| GET/PUT/DELETE | `/api/bookings/[id]` | จัดการการจอง |
| GET/POST | `/api/car` | รายการ / เพิ่มรถ |
| GET/POST | `/api/drivers` | รายการ / เพิ่มคนขับ |
| GET/POST | `/api/users` | รายการ / เพิ่มผู้ใช้ |
| GET/POST/DELETE | `/api/backup` | list / สร้าง / ลบ backup |
| POST | `/api/backup/restore` | restore backup |
| GET | `/api/logs` | กิจกรรมผู้ใช้ (admin) |

---

## 8. Scripts

| Script | คำอธิบาย |
|--------|----------|
| `deploy-docker.sh` | Build + deploy ผ่าน Docker Compose |
| `deploy-k3s.sh` | Build + deploy ผ่าน K3s |
| `scripts/backup-database.sh` | Backup DB + uploads (รันผ่าน cron) |
| `scripts/cleanup-old-backups.sh` | ลบ backup เก่าเกิน 30 วัน |
| `scripts/db-pull-prod.sh` | ดึง DB snapshot จาก production มาใช้ใน dev |
| `scripts/db-reset.sh` | Reset DB (dev เท่านั้น) |

---

## 9. K3s Manifests

```
k3s-manifests/
├── 00-namespace.yaml           # Namespace: web-vrdnkcar
├── 01-secrets.yaml.template    # Secret template (envsubst)
├── 02-pvc.yaml                 # PersistentVolumeClaim สำหรับ uploads
├── 03-postgres-statefulset.yaml
├── 04-postgres-service.yaml
├── 05-app-deployment.yaml      # App deployment (imagePullPolicy: Never)
├── 06-app-service.yaml
└── 07-ingressroute.yaml.template  # Traefik IngressRoute (envsubst)
```

> ไฟล์ที่ generate จาก template (`*.generated`, `01-secrets.yaml`) อยู่ใน `.gitignore`

---

## 10. การดูแลรักษา

**ดู backup log:**
```bash
tail -f backup-auto/backup.log
```

**ทดสอบ backup ด้วยมือ:**
```bash
bash scripts/backup-database.sh
```

**ดึง DB จาก production (สำหรับ dev):**
```bash
bash scripts/db-pull-prod.sh
```

**ตรวจสอบ Docker containers:**
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

**ตรวจสอบ K3s pods:**
```bash
kubectl get pods -n web-vrdnkcar
kubectl describe pod -n web-vrdnkcar <pod-name>
```
