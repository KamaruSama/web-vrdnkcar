import { NextResponse } from 'next/server';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { getConfig } from '@/lib/config';

type CheckStatus = 'ok' | 'error' | 'warn';
type DeployMode = 'k3s' | 'docker' | 'local';

interface SubCheck {
  status: CheckStatus;
  value?: string;
  note?: string;
  ms?: number;
  optional?: boolean;
}

interface Category {
  status: CheckStatus;
  checks: Record<string, SubCheck>;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const t0 = Date.now();
  const result = await fn();
  return { result, ms: Date.now() - t0 };
}

function execCmd(cmd: string, args: string[]): Promise<{ ok: boolean; stdout: string; stderr: string; ms: number }> {
  return new Promise(resolve => {
    const t0 = Date.now();
    execFile(cmd, args, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout, stderr, ms: Date.now() - t0 });
    });
  });
}

function detectDeployMode(): DeployMode {
  if (process.env.KUBERNETES_SERVICE_HOST) return 'k3s';
  if (existsSync('/.dockerenv')) return 'docker';
  return 'local';
}

function hint(mode: DeployMode, k3s: string, docker: string, local: string): string {
  if (mode === 'k3s') return k3s;
  if (mode === 'docker') return docker;
  return local;
}

function catStatus(checks: Record<string, SubCheck>): CheckStatus {
  const vals = Object.values(checks).filter(c => !c.optional);
  if (vals.some(c => c.status === 'error')) return 'error';
  if (Object.values(checks).some(c => c.status === 'warn')) return 'warn';
  return 'ok';
}

export async function GET() {
  const admin = await requireAdmin();

  // Liveness probe (no cookie) → ตอบแค่ db ping
  if (!admin) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return NextResponse.json({ status: 'ok' });
    } catch {
      return NextResponse.json({ status: 'degraded' }, { status: 503 });
    }
  }

  const startTime = Date.now();
  const categories: Record<string, Category> = {};
  const mode = detectDeployMode();
  const psqlHint = (sql: string) => hint(mode,
    `kubectl exec -n web-vrdnkcar postgres-0 -- psql -U vrdnkcar -d car_booking -c "${sql}"`,
    `docker exec -it web-vrdnkcar-db-dev psql -U vrdnkcar -d car_booking -c "${sql}"`,
    `psql -U vrdnkcar -d car_booking -c "${sql}"`,
  );

  // ── database ──────────────────────────────────────────
  {
    const checks: Record<string, SubCheck> = {};

    // Connection + version + size
    try {
      const { result, ms } = await timed(() =>
        prisma.$queryRaw<{ v: string; db: string; size: string }[]>`
          SELECT version() AS v, current_database() AS db,
                 pg_size_pretty(pg_database_size(current_database())) AS size
        `
      );
      const row = result[0];
      const ver = row?.v?.match(/PostgreSQL ([\d.]+)/)?.[1] ?? row?.v;
      checks.connection = {
        status: 'ok',
        value: `PostgreSQL ${ver}`,
        note: `DB: ${row?.db} · ${row?.size}`,
        ms,
      };
    } catch (err: any) {
      checks.connection = {
        status: 'error',
        value: err.message,
        note: hint(mode,
          'kubectl logs -n web-vrdnkcar postgres-0 | tail -20',
          'docker logs web-vrdnkcar-db-dev --tail 20',
          `pg_isready -h ${process.env.DB_HOST ?? 'localhost'} -p ${process.env.DB_PORT ?? '5432'}`,
        ),
      };
    }

    // Tables — ทุก model ใน schema
    const expectedTables = ['users', 'bookings', 'cars', 'drivers', 'surveys', 'activity_logs', 'system_config', 'sessions'];
    try {
      const { result, ms } = await timed(() =>
        prisma.$queryRaw<{ table_name: string; size: string }[]>`
          SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `
      );
      const found = new Map(result.map(r => [r.table_name, r.size]));
      const missing = expectedTables.filter(t => !found.has(t));
      checks.tables = {
        status: missing.length === 0 ? 'ok' : 'error',
        value: missing.length === 0 ? `${found.size} ตาราง` : `missing: ${missing.join(', ')}`,
        note: missing.length > 0
          ? hint(mode,
              'kubectl exec -n web-vrdnkcar <app-pod> -- npx prisma migrate deploy',
              'docker exec web-vrdnkcar-app-dev npx prisma migrate deploy',
              'npx prisma migrate deploy',
            )
          : expectedTables.map(t => `${t} (${found.get(t)})`).join(' · '),
        ms,
      };
    } catch (err: any) {
      checks.tables = { status: 'error', value: err.message };
    }

    // Admin exists
    try {
      const { result, ms } = await timed(() =>
        prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM users WHERE role = 'admin'`
      );
      const n = Number(result[0]?.n ?? 0);
      checks.adminExists = {
        status: n > 0 ? 'ok' : 'error',
        value: n > 0 ? `${n} admin` : 'ไม่มี admin — เข้าระบบจัดการไม่ได้',
        ms,
      };
    } catch (err: any) {
      checks.adminExists = { status: 'error', value: err.message };
    }

    // Config system
    try {
      const { result: config, ms } = await timed(() => getConfig());
      const timeout = config.successCardTimeout;
      const valid = typeof timeout === 'number' && !isNaN(timeout) && timeout >= 0 && timeout <= 1440;
      checks.systemConfig = {
        status: valid ? 'ok' : 'warn',
        value: valid ? `successCardTimeout=${timeout}m` : `ค่าไม่ถูกต้อง: ${timeout}`,
        note: valid ? undefined : 'ตรวจ system_config table หรือตั้งค่าใหม่ผ่านหน้า Admin',
        ms,
      };
    } catch (err: any) {
      checks.systemConfig = { status: 'error', value: err.message };
    }

    categories.database = { status: catStatus(checks), checks };
  }

  // ── dataIntegrity ─────────────────────────────────────
  // ตรวจ NULL, orphaned FK, ข้อมูลเสีย — รวมเป็น 1 query ใหญ่
  {
    const checks: Record<string, SubCheck> = {};

    try {
      const { result, ms } = await timed(() =>
        prisma.$queryRaw<{
          surveys_null_created: bigint;
          surveys_total: bigint;
          orphaned_survey_bookings: bigint;
          orphaned_booking_requesters: bigint;
          orphaned_booking_cars: bigint;
          orphaned_booking_drivers: bigint;
          orphaned_log_users: bigint;
          orphaned_session_users: bigint;
          stale_sessions: bigint;
        }[]>`
          SELECT
            (SELECT COUNT(*) FROM surveys WHERE created_at IS NULL) AS surveys_null_created,
            (SELECT COUNT(*) FROM surveys) AS surveys_total,
            (SELECT COUNT(*) FROM surveys s WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = s.booking_id)) AS orphaned_survey_bookings,
            (SELECT COUNT(*) FROM bookings b WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = b.requester_id)) AS orphaned_booking_requesters,
            (SELECT COUNT(*) FROM bookings WHERE car_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM cars c WHERE c.id = bookings.car_id)) AS orphaned_booking_cars,
            (SELECT COUNT(*) FROM bookings WHERE driver_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.id = bookings.driver_id)) AS orphaned_booking_drivers,
            (SELECT COUNT(*) FROM activity_logs l WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = l.user_id)) AS orphaned_log_users,
            (SELECT COUNT(*) FROM sessions s WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id)) AS orphaned_session_users,
            (SELECT COUNT(*) FROM sessions WHERE expires_at < NOW()) AS stale_sessions
        `
      );
      const r = result[0];

      // Surveys NULL created_at — ปัญหาที่เคยเจอ: ทำให้ API crash
      const nullCreated = Number(r.surveys_null_created);
      const total = Number(r.surveys_total);
      checks.surveysNullDates = {
        status: nullCreated === 0 ? 'ok' : 'error',
        value: nullCreated === 0 ? `${total} รายการ ผ่าน` : `created_at = NULL ${nullCreated}/${total}`,
        note: nullCreated > 0
          ? psqlHint('UPDATE surveys SET created_at = evaluated_at WHERE created_at IS NULL')
          : undefined,
      };

      // Surveys → Bookings FK
      const orphanSurvey = Number(r.orphaned_survey_bookings);
      checks.surveyBookingFK = {
        status: orphanSurvey === 0 ? 'ok' : 'error',
        value: orphanSurvey === 0 ? 'ผ่าน' : `${orphanSurvey} survey ชี้ booking ที่ไม่มี`,
        note: orphanSurvey > 0
          ? psqlHint('DELETE FROM surveys s WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = s.booking_id)')
          : undefined,
      };

      // Bookings → Users (requester) FK
      const orphanRequester = Number(r.orphaned_booking_requesters);
      checks.bookingRequesterFK = {
        status: orphanRequester === 0 ? 'ok' : 'error',
        value: orphanRequester === 0 ? 'ผ่าน' : `${orphanRequester} booking ชี้ user ที่ไม่มี`,
        note: orphanRequester > 0
          ? 'ข้อมูลเสียหาย — booking.requester_id ชี้ user ที่ถูกลบ ต้องแก้ด้วยมือ'
          : undefined,
      };

      // Bookings → Cars FK
      const orphanCars = Number(r.orphaned_booking_cars);
      checks.bookingCarFK = {
        status: orphanCars === 0 ? 'ok' : 'warn',
        value: orphanCars === 0 ? 'ผ่าน' : `${orphanCars} booking ชี้รถที่ถูกลบ`,
        note: orphanCars > 0
          ? psqlHint('UPDATE bookings SET car_id = NULL WHERE car_id IS NOT NULL AND car_id NOT IN (SELECT id FROM cars)')
          : undefined,
      };

      // Bookings → Drivers FK
      const orphanDrivers = Number(r.orphaned_booking_drivers);
      checks.bookingDriverFK = {
        status: orphanDrivers === 0 ? 'ok' : 'warn',
        value: orphanDrivers === 0 ? 'ผ่าน' : `${orphanDrivers} booking ชี้คนขับที่ถูกลบ`,
        note: orphanDrivers > 0
          ? psqlHint('UPDATE bookings SET driver_id = NULL WHERE driver_id IS NOT NULL AND driver_id NOT IN (SELECT id FROM drivers)')
          : undefined,
      };

      // Activity Logs → Users FK
      const orphanLogs = Number(r.orphaned_log_users);
      checks.activityLogUserFK = {
        status: orphanLogs === 0 ? 'ok' : 'warn',
        value: orphanLogs === 0 ? 'ผ่าน' : `${orphanLogs} log ชี้ user ที่ไม่มี`,
        note: orphanLogs > 0
          ? psqlHint('DELETE FROM activity_logs WHERE user_id NOT IN (SELECT id FROM users)')
          : undefined,
      };

      // Sessions → Users FK (orphaned = user ถูกลบแต่ session ยังอยู่)
      const orphanSessions = Number(r.orphaned_session_users);
      checks.sessionUserFK = {
        status: orphanSessions === 0 ? 'ok' : 'warn',
        value: orphanSessions === 0 ? 'ผ่าน' : `${orphanSessions} session ชี้ user ที่ไม่มี`,
        note: orphanSessions > 0
          ? psqlHint('DELETE FROM sessions WHERE user_id NOT IN (SELECT id FROM users)')
          : undefined,
      };

      // Stale sessions — แค่ warn ไม่กระทบ function
      const stale = Number(r.stale_sessions);
      checks.staleSessions = {
        status: stale > 1000 ? 'warn' : 'ok',
        value: `${stale} session หมดอายุ`,
        note: stale > 1000
          ? psqlHint('DELETE FROM sessions WHERE expires_at < NOW()')
          : undefined,
      };

      // ใช้ ms รวมของ query เดียว
      Object.values(checks).forEach(c => c.ms = c.ms ?? ms);
    } catch (err: any) {
      checks.query = { status: 'error', value: err.message };
    }

    categories.dataIntegrity = { status: catStatus(checks), checks };
  }

  // ── storage ───────────────────────────────────────────
  {
    const checks: Record<string, SubCheck> = {};
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const originalsDir = path.join(uploadsDir, 'originals');
    const backupRoot = path.join(process.cwd(), 'backup-auto');

    // Uploads dir — เขียนได้ไหม
    try {
      const t0 = Date.now();
      const testFile = path.join(uploadsDir, `.health-${Date.now()}`);
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(testFile, '1');
      await fs.unlink(testFile);
      const entries = await fs.readdir(uploadsDir, { withFileTypes: true });
      const fileCount = entries.filter(e => e.isFile()).length;
      checks.uploadsDir = { status: 'ok', value: `${fileCount} ไฟล์ · เขียนได้`, ms: Date.now() - t0 };
    } catch (err: any) {
      checks.uploadsDir = {
        status: 'error',
        value: err.message,
        note: hint(mode,
          'kubectl describe pvc uploads-data -n web-vrdnkcar',
          'docker inspect web-vrdnkcar-app-dev | grep Mounts -A 10',
          `chmod 755 ${uploadsDir}`,
        ),
      };
    }

    // Originals dir — เขียนได้ไหม (ไม่ใช่แค่ exist)
    try {
      const t0 = Date.now();
      await fs.mkdir(originalsDir, { recursive: true });
      const testFile = path.join(originalsDir, `.health-${Date.now()}`);
      await fs.writeFile(testFile, '1');
      await fs.unlink(testFile);
      const entries = await fs.readdir(originalsDir);
      checks.originalsDir = { status: 'ok', value: `${entries.length} ไฟล์ · เขียนได้`, ms: Date.now() - t0 };
    } catch (err: any) {
      checks.originalsDir = { status: 'error', value: err.message };
    }

    // Orphaned files — ไฟล์ที่ไม่มี DB reference
    try {
      const t0 = Date.now();
      const dbUrls = await prisma.$queryRaw<{ url: string }[]>`
        SELECT profile_picture AS url FROM users WHERE profile_picture IS NOT NULL
        UNION ALL SELECT photo_url FROM drivers WHERE photo_url IS NOT NULL
        UNION ALL SELECT photo_url FROM cars WHERE photo_url IS NOT NULL
      `;
      const usedFiles = new Set(dbUrls.map(r => path.basename(r.url)));
      const allFiles = await fs.readdir(uploadsDir, { withFileTypes: true });
      const displayFiles = allFiles.filter(e => e.isFile() && !e.name.startsWith('.'));
      const orphanCount = displayFiles.filter(f => !usedFiles.has(f.name)).length;
      checks.orphanedFiles = {
        status: orphanCount > 100 ? 'warn' : 'ok',
        value: orphanCount === 0 ? 'ไม่มี' : `${orphanCount} ไฟล์`,
        note: orphanCount > 100 ? 'รัน cleanup ผ่านหน้า Admin → จัดการข้อมูล → ล้างไฟล์' : undefined,
        ms: Date.now() - t0,
      };
    } catch (err: any) {
      checks.orphanedFiles = { status: 'warn', value: err.message };
    }

    // Backup dir
    try {
      await fs.access(backupRoot);
      checks.backupDir = { status: 'ok', value: 'เข้าถึงได้' };
    } catch {
      checks.backupDir = {
        status: 'error',
        value: 'เข้าถึงไม่ได้',
        note: hint(mode,
          'kubectl describe pvc backup-data -n web-vrdnkcar  →  ตรวจ PVC mount ใน deployment',
          'docker-compose.dev.yml ตรวจ volume backup-auto',
          'mkdir -p backup-auto',
        ),
      };
    }

    // Latest backup freshness
    try {
      const latestDump = path.join(backupRoot, 'latest.dump');
      const stat = await fs.stat(latestDump);
      const ageMs = Date.now() - stat.mtimeMs;
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
      const ageText = ageDays > 0 ? `${ageDays} วันที่แล้ว` : `${ageHours} ชั่วโมงที่แล้ว`;

      let status: CheckStatus = 'ok';
      if (ageDays >= 7) status = 'error';
      else if (ageDays >= 2) status = 'warn';

      const cronHint = hint(mode,
        'ตรวจ crontab บน host: crontab -l | grep vrdnkcar  →  ดู backup.log ใน PVC',
        'ตรวจ crontab บน host → ดู backup.log',
        'ตรวจ crontab: crontab -l → ดู backup-auto/backup.log',
      );
      checks.latestBackup = {
        status,
        value: ageText,
        note: status !== 'ok' ? cronHint : `อัพเดต ${new Date(stat.mtimeMs).toLocaleString('th-TH')}`,
      };
    } catch {
      checks.latestBackup = {
        status: 'error',
        value: 'ไม่พบ latest.dump',
        note: hint(mode,
          'รัน backup บน host: bash scripts/backup-database.sh  →  ตรวจ crontab: crontab -l | grep vrdnkcar',
          'รัน: bash scripts/backup-database.sh',
          'รัน: bash scripts/backup-database.sh',
        ),
      };
    }

    // Backup log errors
    try {
      const logFile = path.join(backupRoot, 'backup.log');
      const raw = await fs.readFile(logFile, 'utf8');
      const recent = raw.trim().split('\n').slice(-50);
      const errors = recent.filter(l => l.includes('ERROR:'));
      checks.backupLog = {
        status: errors.length === 0 ? 'ok' : 'warn',
        value: errors.length === 0 ? 'ไม่พบ error' : `${errors.length} error(s)`,
        note: errors.length > 0 ? errors[errors.length - 1] : undefined,
      };
    } catch {
      checks.backupLog = { status: 'warn', value: 'ไม่พบ backup.log' };
    }

    categories.storage = { status: catStatus(checks), checks };
  }

  // ── environment ───────────────────────────────────────
  {
    const checks: Record<string, SubCheck> = {};
    const secretHint = hint(mode,
      'kubectl get secret app-secrets -n web-vrdnkcar -o yaml',
      'ตรวจ .env หรือ docker-compose environment',
      'ตรวจ .env',
    );

    // Deploy mode
    checks.deployMode = {
      status: 'ok',
      value: mode,
      note: mode === 'k3s' ? 'K3s (KUBERNETES_SERVICE_HOST set)'
          : mode === 'docker' ? 'Docker (/.dockerenv detected)' : 'Local',
    };

    // Required env vars
    const required: Array<{ key: string; secret?: boolean }> = [
      { key: 'DATABASE_URL', secret: true },
      { key: 'DB_HOST' },
      { key: 'DB_PORT' },
      { key: 'DB_USER' },
      { key: 'DB_NAME' },
      { key: 'DB_PASSWORD', secret: true },
      { key: 'APP_URL' },
    ];
    for (const { key, secret } of required) {
      const val = process.env[key];
      checks[key] = val
        ? { status: 'ok', value: secret ? '••••••' : val }
        : { status: 'error', value: 'ไม่ได้ตั้งค่า', note: secretHint };
    }

    // APP_URL format
    const appUrl = process.env.APP_URL;
    if (appUrl && !/^https?:\/\/.+/.test(appUrl)) {
      checks.APP_URL = { status: 'warn', value: appUrl, note: 'ควรเริ่มด้วย http:// หรือ https://' };
    }

    // Secure cookies
    const secureOk = process.env.USE_SECURE_COOKIES === 'true';
    const isProd = process.env.NODE_ENV === 'production' || mode !== 'local';
    checks.USE_SECURE_COOKIES = {
      status: !secureOk && isProd ? 'warn' : 'ok',
      value: secureOk ? 'เปิดใช้งาน' : 'ปิดใช้งาน',
      note: !secureOk && isProd
        ? hint(mode, 'แก้ใน K3s Secret: USE_SECURE_COOKIES=true', 'แก้ใน .env', 'ปกติใน dev')
        : undefined,
    };

    categories.environment = { status: catStatus(checks), checks };
  }

  // ── tools ─────────────────────────────────────────────
  {
    const checks: Record<string, SubCheck> = {};

    // pg_dump
    const pgDump = await execCmd('pg_dump', ['--version']);
    checks.pgDump = {
      status: pgDump.ok ? 'ok' : mode === 'k3s' ? 'error' : 'warn',
      value: pgDump.ok ? pgDump.stdout.trim().split('\n')[0] : 'ไม่ได้ติดตั้ง',
      note: pgDump.ok ? undefined : hint(mode,
        'Dockerfile.k3s ตรวจว่ามี postgresql17-client → build image ใหม่',
        'Docker backup ใช้ pg_dump จาก host',
        'apt install postgresql-client',
      ),
      optional: mode === 'docker',
      ms: pgDump.ms,
    };

    // tar
    const tar = await execCmd('tar', ['--version']);
    checks.tar = {
      status: tar.ok ? 'ok' : 'error',
      value: tar.ok ? tar.stdout.trim().split('\n')[0] : 'ไม่ได้ติดตั้ง',
      ms: tar.ms,
    };

    // sharp (image processing)
    try {
      const t0 = Date.now();
      const sharp = (await import('sharp')).default;
      // สร้างรูป 1x1 px เพื่อทดสอบ
      await sharp({ create: { width: 1, height: 1, channels: 3, background: '#000' } })
        .webp()
        .toBuffer();
      checks.sharp = { status: 'ok', value: `sharp ${sharp.versions?.sharp ?? 'OK'}`, ms: Date.now() - t0 };
    } catch (err: any) {
      checks.sharp = {
        status: 'error',
        value: err.message,
        note: 'npm install sharp หรือ build image ใหม่',
      };
    }

    categories.tools = { status: catStatus(checks), checks };
  }

  // ── notifications ─────────────────────────────────────
  {
    const checks: Record<string, SubCheck> = {};
    const credHint = hint(mode, 'แก้ใน K3s Secret app-secrets', 'แก้ใน .env + docker-compose', 'แก้ใน .env');

    // Telegram
    const telegramEnabled = process.env.TELEGRAM_ENABLED === 'true';
    const telegramToken = process.env.TELEGRAM_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    if (!telegramToken || !telegramEnabled) {
      checks.telegram = {
        status: 'warn',
        value: !telegramToken ? 'ปิดใช้งาน' : 'มี token แต่ TELEGRAM_ENABLED=false',
        optional: true,
      };
    } else {
      try {
        const t0 = Date.now();
        const r = await fetch(`https://api.telegram.org/bot${telegramToken}/getMe`, { signal: AbortSignal.timeout(5000) });
        const data = await r.json();
        checks.telegram = data.ok
          ? { status: 'ok', value: `@${data.result?.username}`, ms: Date.now() - t0, optional: true }
          : { status: 'error', value: data.description ?? 'token ใช้ไม่ได้', note: credHint, optional: true };
      } catch (e: any) {
        checks.telegram = { status: 'error', value: 'เชื่อมต่อไม่ได้', note: e.message, optional: true };
      }
    }

    // Telegram Chat ID format
    if (telegramEnabled && telegramChatId) {
      const validChatId = /^-?\d+$/.test(telegramChatId);
      checks.telegramChatId = {
        status: validChatId ? 'ok' : 'error',
        value: validChatId ? telegramChatId : `format ผิด: "${telegramChatId}"`,
        note: validChatId ? undefined : 'TELEGRAM_CHAT_ID ต้องเป็นตัวเลข (อาจติดลบสำหรับ group)',
        optional: true,
      };
    }

    // LINE
    const lineEnabled = process.env.LINE_ENABLED === 'true';
    const lineToken = process.env.LINE_TOKEN;
    const lineId1 = process.env.LINE_USER_ID_1;
    const lineId2 = process.env.LINE_USER_ID_2;

    if (!lineToken || !lineEnabled) {
      checks.line = {
        status: 'warn',
        value: !lineToken ? 'ปิดใช้งาน' : 'มี token แต่ LINE_ENABLED=false',
        optional: true,
      };
    } else {
      try {
        const t0 = Date.now();
        const r = await fetch('https://api.line.me/v2/bot/info', {
          headers: { Authorization: `Bearer ${lineToken}` },
          signal: AbortSignal.timeout(5000),
        });
        const data = await r.json();
        checks.line = r.ok
          ? { status: 'ok', value: data.displayName ?? 'connected', ms: Date.now() - t0, optional: true }
          : { status: 'error', value: data.message ?? `HTTP ${r.status}`, note: credHint, optional: true };
      } catch (e: any) {
        checks.line = { status: 'error', value: 'เชื่อมต่อไม่ได้', note: e.message, optional: true };
      }
    }

    // LINE User IDs format — ต้องขึ้นต้นด้วย U หรือ C ตามด้วย hex 32 ตัว
    if (lineEnabled) {
      const lineIdRegex = /^[UC][a-f0-9]{32}$/;
      const ids = [
        { key: 'LINE_USER_ID_1', val: lineId1 },
        { key: 'LINE_USER_ID_2', val: lineId2 },
      ];
      for (const { key, val } of ids) {
        if (!val) {
          checks[key] = { status: 'warn', value: 'ไม่ได้ตั้งค่า', note: credHint, optional: true };
        } else {
          const valid = lineIdRegex.test(val);
          checks[key] = {
            status: valid ? 'ok' : 'error',
            value: valid ? `${val.slice(0, 6)}...` : `format ผิด: "${val.slice(0, 10)}..."`,
            note: valid ? undefined : 'ต้องขึ้นต้นด้วย U หรือ C ตามด้วย hex 32 ตัว',
            optional: true,
          };
        }
      }
    }

    const nonOptionalErrors = Object.values(checks).filter(c => !c.optional && c.status === 'error');
    categories.notifications = {
      status: nonOptionalErrors.length > 0 ? 'error' : Object.values(checks).some(c => c.status === 'warn') ? 'warn' : 'ok',
      checks,
    };
  }

  // ── security ──────────────────────────────────────────
  // ทดสอบว่า admin-only API ป้องกันจริง (เรียกไม่มี cookie ต้องได้ 403)
  {
    const checks: Record<string, SubCheck> = {};
    const baseUrl = `http://127.0.0.1:${process.env.PORT || 3000}`;
    const endpoints = [
      { path: '/api/logs', method: 'GET', label: 'logs' },
      { path: '/api/backup', method: 'GET', label: 'backup' },
      { path: '/api/config', method: 'POST', label: 'config (POST)' },
      { path: '/api/upload/cleanup', method: 'POST', label: 'cleanup' },
    ];

    const results = await Promise.allSettled(
      endpoints.map(async (ep) => {
        const t0 = Date.now();
        const r = await fetch(`${baseUrl}${ep.path}`, {
          method: ep.method,
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(3000),
        });
        return { ...ep, status: r.status, ms: Date.now() - t0 };
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        const { label, status, path: p, ms } = r.value;
        const protected_ = status === 401 || status === 403;
        checks[label] = {
          status: protected_ ? 'ok' : 'error',
          value: protected_ ? `${status} ป้องกันถูกต้อง` : `${status} — ไม่ได้ป้องกัน!`,
          note: protected_ ? undefined : `${p} เข้าถึงได้โดยไม่ต้อง login — ตรวจ requireAdmin() ใน route`,
          ms,
        };
      } else {
        const ep = endpoints[results.indexOf(r)];
        checks[ep.label] = { status: 'warn', value: 'ทดสอบไม่ได้', note: (r as PromiseRejectedResult).reason?.message };
      }
    }

    categories.security = { status: catStatus(checks), checks };
  }

  const allOk = Object.values(categories).every(c => c.status === 'ok');
  const anyError = Object.values(categories).some(c => c.status === 'error');

  return NextResponse.json({
    status: anyError ? 'degraded' : allOk ? 'ok' : 'degraded',
    deployMode: mode,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    totalMs: Date.now() - startTime,
    categories,
  });
}
