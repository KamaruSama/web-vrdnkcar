import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { requireAdmin } from '@/lib/auth';

const execFileAsync = promisify(execFile);

interface Check {
  status: 'ok' | 'warn' | 'error';
  label: string;
  note?: string;
  fixable?: boolean;   // auto-fix ได้ผ่านปุ่ม
  command?: string;    // ต้องรันเองบน host (แสดงเป็น code block)
}

interface CategoryResult {
  status: 'ok' | 'warn' | 'error';
  mode?: string;
  checks: Record<string, Check>;
  fixable: boolean;
}

interface DoctorResponse {
  status: 'ok' | 'warn' | 'error';
  categories: Record<string, CategoryResult>;
}

async function tryExec(cmd: string, args: string[]): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, { timeout: 5000 });
    return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (e: any) {
    return { ok: false, stdout: '', stderr: String(e.message || '') };
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function checkDeployment(): Promise<CategoryResult> {
  const checks: Record<string, Check> = {};
  let mode: 'k3s' | 'docker' | 'unknown' = 'unknown';

  // ตรวจก่อนว่ารันอยู่ข้างใน k3s pod หรือเปล่า (Kubernetes inject ให้ทุก pod)
  const insideK3s = !!process.env.KUBERNETES_SERVICE_HOST;

  if (insideK3s) {
    mode = 'k3s';
    const required = ['DATABASE_URL', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missing = required.filter(k => !process.env[k]);
    checks['Secrets (env)'] = missing.length === 0
      ? { status: 'ok', label: 'Secrets inject ครบ', note: required.join(', ') }
      : {
          status: 'error',
          label: 'Secrets ขาด',
          note: missing.join(', '),
          command: `bash deploy-k3s.sh`,
        };

    checks['Runtime'] = { status: 'ok', label: 'รันอยู่ใน k3s pod', note: `KUBERNETES_SERVICE_HOST: ${process.env.KUBERNETES_SERVICE_HOST}` };

    checks['pods'] = {
      status: 'ok',
      label: 'ดู pod status บน host',
      command: `sudo kubectl get pods -n web-vrdnkcar`,
    };
    checks['logs'] = {
      status: 'ok',
      label: 'ดู app logs',
      command: `sudo kubectl logs -n web-vrdnkcar -l app=web-vrdnkcar-app --tail=50`,
    };
    checks['redeploy'] = {
      status: 'ok',
      label: 'Deploy ใหม่',
      command: `bash deploy-k3s.sh`,
    };
  } else {
    const dockerCheck = await tryExec('docker', ['inspect', '--format', '{{.State.Status}}', 'web-vrdnkcar-app']);
    if (dockerCheck.ok) {
      mode = 'docker';

      const networkCheck = await tryExec('docker', ['network', 'inspect', 'traefik-public']);
      checks['Network'] = networkCheck.ok
        ? { status: 'ok', label: 'Network (traefik-public)' }
        : { status: 'error', label: 'Network (traefik-public)', note: 'ไม่พบ network', fixable: true };

      const appCheck = await tryExec('docker', ['inspect', '--format', '{{.State.Status}}', 'web-vrdnkcar-app']);
      checks['App Container'] = appCheck.ok && appCheck.stdout === 'running'
        ? { status: 'ok', label: 'App Container' }
        : { status: 'error', label: 'App Container', note: 'ไม่ได้รัน', fixable: true };

      const dbCheck = await tryExec('docker', ['inspect', '--format', '{{.State.Status}}', 'web-vrdnkcar-db']);
      checks['DB Container'] = dbCheck.ok && dbCheck.stdout === 'running'
        ? { status: 'ok', label: 'DB Container' }
        : { status: 'error', label: 'DB Container', note: 'ไม่ได้รัน', fixable: true };

      const envPath = path.join(process.cwd(), '.env');
      const envExists = await fileExists(envPath);
      if (envExists) {
        const envContent = await fs.readFile(envPath, 'utf-8');
        const hasKeys = ['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB', 'DB_HOST', 'DB_PORT'].every(
          k => envContent.includes(`${k}=`)
        );
        checks['.env'] = hasKeys
          ? { status: 'ok', label: '.env file' }
          : { status: 'warn', label: '.env file', note: 'ขาด key บางตัว' };
      } else {
        checks['.env'] = { status: 'error', label: '.env file', note: 'ไม่พบไฟล์' };
      }
    } else {
      mode = 'unknown';
      checks['Runtime'] = { status: 'warn', label: 'ไม่พบ Docker container', note: 'อาจเป็น dev mode หรือ container ยังไม่ได้รัน' };
    }
  }

  const status = Object.values(checks).some(c => c.status === 'error') ? 'error' : Object.values(checks).some(c => c.status === 'warn') ? 'warn' : 'ok';
  const fixable = Object.values(checks).some(c => c.fixable);

  return { status, mode, checks, fixable };
}

async function checkBackup(): Promise<CategoryResult> {
  const checks: Record<string, Check> = {};

  // backup รันบน host เสมอ — ถ้าอยู่ใน k3s pod ตรวจไม่ได้
  if (process.env.KUBERNETES_SERVICE_HOST) {
    checks['setup'] = {
      status: 'warn',
      label: 'ตั้งค่า backup ครั้งแรก',
      note: 'สร้าง dir + crontab + ทดสอบ backup (รันจาก project directory บน host)',
      command: `bash scripts/setup-backup.sh`,
    };
    checks['manual'] = {
      status: 'warn',
      label: 'สั่ง backup ด้วยมือ (ไม่ถูกลบอัตโนมัติ)',
      command: `bash scripts/backup-database.sh --manual`,
    };
    checks['crontab'] = {
      status: 'warn',
      label: 'ดู crontab ที่ตั้งไว้',
      command: `crontab -l`,
    };
    checks['log'] = {
      status: 'warn',
      label: 'ดู log backup ล่าสุด',
      command: `tail -30 backup-auto/backup.log`,
    };
    return { status: 'warn', checks, fixable: false };
  }

  const backupRoot = path.join(process.cwd(), 'backup-auto');

  const dirExists = await fileExists(backupRoot);
  checks['Directory'] = dirExists
    ? { status: 'ok', label: 'backup-auto directory' }
    : { status: 'error', label: 'backup-auto directory', note: 'ไม่พบ directory', fixable: true };

  const pgDumpCheck = await tryExec('pg_dump', ['--version']);
  checks['pg_dump'] = pgDumpCheck.ok
    ? { status: 'ok', label: 'pg_dump', note: pgDumpCheck.stdout.split('\n')[0] }
    : { status: 'error', label: 'pg_dump', note: 'ไม่ได้ติดตั้ง', command: 'sudo apt install postgresql-client' };

  const envPath = path.join(process.cwd(), '.env');
  const envExists = await fileExists(envPath);
  if (envExists) {
    const envContent = await fs.readFile(envPath, 'utf-8');
    const hasKeys = ['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB'].every(k => envContent.includes(`${k}=`));
    checks['Env vars'] = hasKeys
      ? { status: 'ok', label: '.env keys สำหรับ backup' }
      : { status: 'warn', label: '.env keys สำหรับ backup', note: 'ขาด key บางตัว' };
  } else {
    checks['Env vars'] = { status: 'warn', label: '.env keys สำหรับ backup', note: 'ไม่พบ .env' };
  }

  let lastBackupStatus: Check = { status: 'warn', label: 'Last backup', note: 'ยังไม่มี backup' };
  try {
    const dailyDir = path.join(backupRoot, 'daily');
    const entries = await fs.readdir(dailyDir, { recursive: true, withFileTypes: true });
    const dumpFiles = entries
      .filter(e => e.isFile() && e.name.endsWith('.dump'))
      .sort((a, b) => b.parentPath.localeCompare(a.parentPath));
    if (dumpFiles.length > 0) {
      const latestFile = dumpFiles[0];
      const fullPath = path.join(latestFile.parentPath, latestFile.name);
      const stat = await fs.stat(fullPath);
      const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
      lastBackupStatus = ageHours < 48
        ? { status: 'ok', label: 'Last backup', note: `${Math.floor(ageHours)}h ที่แล้ว` }
        : { status: 'warn', label: 'Last backup', note: `${Math.floor(ageHours)}h ที่แล้ว (เกิน 2 วัน)` };
    }
  } catch { }
  checks['Last backup'] = lastBackupStatus;

  const crontabCheck = await tryExec('crontab', ['-l']);
  if (crontabCheck.ok) {
    const hasJob = /0\s+1\s+\*\s+\*\s+\*/.test(crontabCheck.stdout) && /backup/.test(crontabCheck.stdout);
    checks['Cron job'] = hasJob
      ? { status: 'ok', label: 'Cron job (01:00)' }
      : {
          status: 'warn',
          label: 'Cron job (01:00)',
          note: 'ไม่พบ job backup — กดแก้ไขอัตโนมัติ หรือรัน setup-backup.sh',
          fixable: true,
        };
  } else {
    checks['Cron job'] = {
      status: 'warn',
      label: 'Cron job (01:00)',
      note: 'เข้าถึง crontab ไม่ได้',
      command: `bash scripts/setup-backup.sh`,
    };
  }

  const status = Object.values(checks).some(c => c.status === 'error') ? 'error' : Object.values(checks).some(c => c.status === 'warn') ? 'warn' : 'ok';
  const fixable = Object.values(checks).some(c => c.fixable);

  return { status, checks, fixable };
}

async function checkStorage(): Promise<CategoryResult> {
  const checks: Record<string, Check> = {};
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const originalsDir = path.join(uploadsDir, 'originals');

  const uploadsExists = await fileExists(uploadsDir);
  checks['Directory'] = uploadsExists
    ? { status: 'ok', label: 'public/uploads' }
    : { status: 'error', label: 'public/uploads', note: 'สร้างไม่ได้' };

  let writableStatus: Check = { status: 'error', label: 'สิทธิ์เขียนไฟล์', note: 'ตรวจสอบไม่ได้' };
  if (uploadsExists) {
    try {
      const testFile = path.join(uploadsDir, `.test-${Date.now()}`);
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      writableStatus = { status: 'ok', label: 'สิทธิ์เขียนไฟล์', note: 'เขียน/ลบได้ปกติ' };
    } catch {
      writableStatus = { status: 'error', label: 'สิทธิ์เขียนไฟล์', note: 'Permission denied' };
    }
  }
  checks['Writable'] = writableStatus;

  const originalsExists = await fileExists(originalsDir);
  checks['Originals dir'] = originalsExists
    ? { status: 'ok', label: 'public/uploads/originals' }
    : { status: 'error', label: 'public/uploads/originals', note: 'สร้างไม่ได้' };

  const status = Object.values(checks).some(c => c.status === 'error') ? 'error' : Object.values(checks).some(c => c.status === 'warn') ? 'warn' : 'ok';
  const fixable = false;

  return { status, checks, fixable };
}

async function checkScripts(): Promise<CategoryResult> {
  const checks: Record<string, Check> = {};
  const scripts = [
    'deploy-docker.sh',
    'deploy-k3s.sh',
    path.join('scripts', 'backup-database.sh'),
    path.join('scripts', 'setup-backup.sh'),
    path.join('scripts', 'cleanup-old-backups.sh'),
    path.join('scripts', 'db-pull-prod.sh'),
    path.join('scripts', 'db-reset.sh'),
  ];

  for (const script of scripts) {
    const fullPath = path.join(process.cwd(), script);
    const exists = await fileExists(fullPath);
    const executable = exists ? await isExecutable(fullPath) : false;

    if (!exists) {
      checks[script] = { status: 'error', label: script, note: 'Not found' };
    } else if (!executable) {
      checks[script] = { status: 'warn', label: script, note: 'Not executable', fixable: true };
    } else {
      checks[script] = { status: 'ok', label: script };
    }
  }

  const status = Object.values(checks).some(c => c.status === 'error') ? 'error' : Object.values(checks).some(c => c.status === 'warn') ? 'warn' : 'ok';
  const fixable = Object.values(checks).some(c => c.fixable);

  return { status, checks, fixable };
}

async function checkAuthProtection(): Promise<CategoryResult> {
  const checks: Record<string, Check> = {};
  const baseUrl = `http://127.0.0.1:${process.env.PORT || 3000}`;

  const tests = [
    { url: '/api/logs',           label: 'Logs (admin)',    method: 'GET' },
    { url: '/api/backup',         label: 'Backup (admin)',  method: 'GET' },
    { url: '/api/upload/cleanup', label: 'Cleanup (admin)', method: 'POST' },
  ];

  for (const t of tests) {
    try {
      const r = await fetch(`${baseUrl}${t.url}`, {
        method: t.method,
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (r.status === 401 || r.status === 403) {
        checks[t.label] = { status: 'ok', label: t.label, note: `${r.status} — ป้องกันถูกต้อง` };
      } else {
        checks[t.label] = { status: 'error', label: t.label, note: `${r.status} — ไม่ได้ป้องกัน! ควรได้ 401/403` };
      }
    } catch (e: any) {
      checks[t.label] = { status: 'warn', label: t.label, note: `ทดสอบไม่ได้: ${e.message}` };
    }
  }

  const status = Object.values(checks).some(c => c.status === 'error') ? 'error' : Object.values(checks).some(c => c.status === 'warn') ? 'warn' : 'ok';
  return { status, checks, fixable: false };
}

export async function GET(): Promise<NextResponse<DoctorResponse | { error: string }>> {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });
  }

  try {
    const [deployment, backup, storage, scripts, auth] = await Promise.all([
      checkDeployment(),
      checkBackup(),
      checkStorage(),
      checkScripts(),
      checkAuthProtection(),
    ]);

    const categories = { deployment, backup, storage, scripts, auth };
    const status = Object.values(categories).some(c => c.status === 'error') ? 'error' : Object.values(categories).some(c => c.status === 'warn') ? 'warn' : 'ok';

    return NextResponse.json({ status, categories });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<{ fixed: string[]; failed: string[]; message: string } | { error: string }>> {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });
  }

  try {
    const { category } = await req.json();
    const fixed: string[] = [];
    const failed: string[] = [];

    if (category === 'scripts') {
      const scripts = [
        'deploy-docker.sh',
        'deploy-k3s.sh',
        path.join('scripts', 'backup-database.sh'),
        path.join('scripts', 'setup-backup.sh'),
        path.join('scripts', 'cleanup-old-backups.sh'),
        path.join('scripts', 'db-pull-prod.sh'),
        path.join('scripts', 'db-reset.sh'),
      ];

      for (const script of scripts) {
        const fullPath = path.join(process.cwd(), script);
        if (await fileExists(fullPath)) {
          try {
            await fs.chmod(fullPath, 0o755);
            fixed.push(script);
          } catch (e: any) {
            failed.push(`${script}: ${e.message}`);
          }
        }
      }
    } else if (category === 'backup') {
      const backupRoot = path.join(process.cwd(), 'backup-auto');
      const dailyDir = path.join(backupRoot, 'daily');

      try {
        await fs.mkdir(dailyDir, { recursive: true });
        fixed.push('Backup directory created');
      } catch (e: any) {
        failed.push(`Backup dir: ${e.message}`);
      }

      try {
        const crontabCheck = await tryExec('crontab', ['-l']);
        let crontabContent = crontabCheck.ok ? crontabCheck.stdout : '';
        const scriptPath = path.join(process.cwd(), 'scripts', 'backup-database.sh');
        const newJob = `0 1 * * * bash ${scriptPath} >> ${backupRoot}/backup.log 2>&1`;

        if (!crontabContent.includes(newJob)) {
          crontabContent = crontabContent.trim() + '\n' + newJob + '\n';
          const tmpFile = path.join(os.tmpdir(), `crontab-${Date.now()}.txt`);
          await fs.writeFile(tmpFile, crontabContent);
          await execFileAsync('crontab', [tmpFile]);
          await fs.unlink(tmpFile).catch(() => {});
          fixed.push('Cron job added at 01:00');
        }
      } catch (e: any) {
        failed.push(`Cron job: ${e.message}`);
      }
    } else if (category === 'deployment') {
      const k3sCheck = await tryExec('kubectl', ['get', 'namespace', 'web-vrdnkcar']);
      const dockerCheck = await tryExec('docker', ['inspect', '--format', '{{.State.Status}}', 'web-vrdnkcar-app']);

      if (k3sCheck.ok) {
        failed.push('k3s deployment: cannot auto-fix, run deploy-k3s.sh manually');
      } else if (dockerCheck.ok) {
        try {
          const networkCheck = await tryExec('docker', ['network', 'inspect', 'traefik-public']);
          if (!networkCheck.ok) {
            await execFileAsync('docker', ['network', 'create', 'traefik-public']);
            fixed.push('Docker network created');
          }
        } catch (e: any) {
          failed.push(`Network: ${e.message}`);
        }

        try {
          const appCheck = await tryExec('docker', ['inspect', '--format', '{{.State.Status}}', 'web-vrdnkcar-app']);
          if (appCheck.ok && appCheck.stdout !== 'running') {
            await execFileAsync('docker', ['start', 'web-vrdnkcar-app']);
            fixed.push('App container started');
          }
        } catch (e: any) {
          failed.push(`App: ${e.message}`);
        }

        try {
          const dbCheck = await tryExec('docker', ['inspect', '--format', '{{.State.Status}}', 'web-vrdnkcar-db']);
          if (dbCheck.ok && dbCheck.stdout !== 'running') {
            await execFileAsync('docker', ['start', 'web-vrdnkcar-db']);
            fixed.push('DB container started');
          }
        } catch (e: any) {
          failed.push(`DB: ${e.message}`);
        }
      }
    }

    const message = fixed.length > 0
      ? `Fixed: ${fixed.join(', ')}`
      : failed.length > 0
      ? `Failed: ${failed.join(', ')}`
      : 'No changes needed';

    return NextResponse.json({ fixed, failed, message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
