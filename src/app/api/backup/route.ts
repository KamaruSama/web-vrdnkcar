import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

const execFileAsync = promisify(execFile);
const BACKUP_ROOT = path.join(process.cwd(), 'backup-auto');

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// GET — list backups หรือ download ไฟล์
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });
  }

  const download = req.nextUrl.searchParams.get('download');

  // Download mode — path relative to backup-auto/
  if (download) {
    // ป้องกัน path traversal
    const safePath = download.replace(/\.\./g, '');
    const filePath = path.join(BACKUP_ROOT, safePath);
    if (!filePath.startsWith(BACKUP_ROOT)) {
      return NextResponse.json({ error: 'invalid path' }, { status: 400 });
    }
    try {
      const data = await fs.readFile(filePath);
      const name = path.basename(filePath);
      return new NextResponse(data, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${name}"`,
        },
      });
    } catch {
      return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 404 });
    }
  }

  // List mode — scan backup-auto/daily/ recursively
  try {
    const backups: Array<{
      filename: string;
      relativePath: string;
      type: 'db' | 'uploads';
      source: 'auto' | 'manual';
      size: number;
      sizeText: string;
      date: string;
      createdAt: string;
    }> = [];

    for (const [dir, source] of [
      [path.join(BACKUP_ROOT, 'daily'), 'auto'],
      [path.join(BACKUP_ROOT, 'weekly'), 'auto'],
      [path.join(BACKUP_ROOT, 'monthly'), 'auto'],
      [path.join(BACKUP_ROOT, 'archive'), 'auto'],
      [path.join(BACKUP_ROOT, 'manual'), 'manual'],
    ] as const) {
      try { await scanDir(dir, BACKUP_ROOT, backups, source); } catch { }
    }

    backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    // สรุปข้อมูล
    let totalSize = 0;
    backups.forEach(b => totalSize += b.size);

    return NextResponse.json({
      backups,
      summary: {
        total: backups.length,
        dbCount: backups.filter(b => b.type === 'db').length,
        uploadsCount: backups.filter(b => b.type === 'uploads').length,
        totalSize,
        totalSizeText: formatSize(totalSize),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function scanDir(
  dir: string,
  root: string,
  results: Array<{ filename: string; relativePath: string; type: 'db' | 'uploads'; source: 'auto' | 'manual'; size: number; sizeText: string; date: string; createdAt: string }>,
  source: 'auto' | 'manual' = 'auto',
) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await scanDir(fullPath, root, results, source);
    } else if (entry.isFile() && (entry.name.endsWith('.dump') || entry.name.endsWith('.tar.gz'))) {
      const stat = await fs.stat(fullPath);
      if (stat.size === 0) continue; // ข้าม dump ว่าง
      const relativePath = path.relative(root, fullPath);
      // ดึงวันที่จาก path เช่น daily/2026/03/23/xxx
      const match = relativePath.match(/(\d{4})\/(\d{2})\/(\d{2})/);
      const date = match ? `${match[1]}-${match[2]}-${match[3]}` : '';
      results.push({
        filename: entry.name,
        relativePath,
        type: entry.name.endsWith('.dump') ? 'db' : 'uploads',
        source,
        size: stat.size,
        sizeText: formatSize(stat.size),
        date,
        createdAt: stat.mtime.toISOString(),
      });
    }
  }
}

// POST — สร้าง backup ด้วยมือ → เก็บใน manual/ (ไม่ถูก cleanup อัตโนมัติ)
export async function POST() {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });
  }

  try {
    const now = new Date();
    const ts = now.toISOString().replace(/[T:.]/g, m => m === 'T' ? '_' : '-').slice(0, 19);
    const manualDir = path.join(BACKUP_ROOT, 'manual');
    await fs.mkdir(manualDir, { recursive: true });

    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbName = process.env.DB_NAME || 'car_booking';
    const env = { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || '' };

    // DB dump
    const dbFile = path.join(manualDir, `manual_db_${ts}.dump`);
    await execFileAsync('pg_dump', [
      '-h', dbHost, '-p', dbPort, '-U', dbUser, '-d', dbName,
      '-Fc', '-Z', '9', '-f', dbFile,
    ], { env, timeout: 60000 });

    // Uploads tar
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    let uploadsFile: string | null = null;
    try {
      const entries = await fs.readdir(uploadsDir);
      if (entries.length > 0) {
        uploadsFile = path.join(manualDir, `manual_uploads_${ts}.tar.gz`);
        await execFileAsync('tar', ['-czf', uploadsFile, '-C', path.join(process.cwd(), 'public'), 'uploads'], { timeout: 30000 });
      }
    } catch { /* no uploads */ }

    const dbStat = await fs.stat(dbFile);

    await prisma.activityLog.create({
      data: { userId: user.id, action: 'สร้าง backup ด้วยมือ', details: `DB: ${formatSize(dbStat.size)}${uploadsFile ? ' + uploads' : ''}` },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT — อัปโหลด backup แล้ว restore ทันที (ไม่เก็บไฟล์)
export async function PUT(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const dbFile = formData.get('dbFile') as File | null;
    const uploadsFile = formData.get('uploadsFile') as File | null;

    if (!dbFile || !uploadsFile) {
      return NextResponse.json({ error: 'ต้องอัปโหลดทั้ง 2 ไฟล์: ฐานข้อมูล (.dump) และรูปภาพ (.tar.gz)' }, { status: 400 });
    }
    if (!dbFile.name.endsWith('.dump')) {
      return NextResponse.json({ error: 'ไฟล์ฐานข้อมูลต้องเป็น .dump' }, { status: 400 });
    }
    if (!uploadsFile.name.endsWith('.tar.gz')) {
      return NextResponse.json({ error: 'ไฟล์รูปภาพต้องเป็น .tar.gz' }, { status: 400 });
    }
    if (dbFile.size + uploadsFile.size > 500 * 1024 * 1024) {
      return NextResponse.json({ error: 'ไฟล์รวมใหญ่เกิน 500MB' }, { status: 400 });
    }

    const tmpDir = path.join(BACKUP_ROOT, '.tmp-restore');
    await fs.mkdir(tmpDir, { recursive: true });

    const tmpDb = path.join(tmpDir, 'restore.dump');
    const tmpUploads = path.join(tmpDir, 'restore.tar.gz');

    try {
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || '5432';
      const dbUser = process.env.DB_USER || 'postgres';
      const dbName = process.env.DB_NAME || 'car_booking';
      const env = { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || '' };

      // ── Backup ข้อมูลปัจจุบันก่อน restore ──
      const manualDir = path.join(BACKUP_ROOT, 'manual');
      await fs.mkdir(manualDir, { recursive: true });
      const ts = new Date().toISOString().replace(/[T:.]/g, m => m === 'T' ? '_' : '-').slice(0, 19);

      const preRestoreDb = path.join(manualDir, `before_restore_db_${ts}.dump`);
      await execFileAsync('pg_dump', [
        '-h', dbHost, '-p', dbPort, '-U', dbUser, '-d', dbName,
        '-Fc', '-Z', '9', '-f', preRestoreDb,
      ], { env, timeout: 60000 });

      const uploadsDir = path.join(process.cwd(), 'public');
      const preRestoreUploads = path.join(manualDir, `before_restore_uploads_${ts}.tar.gz`);
      try {
        await execFileAsync('tar', ['-czf', preRestoreUploads, '-C', uploadsDir, 'uploads'], { timeout: 30000 });
      } catch { /* uploads อาจว่าง */ }

      // ── เขียน temp files ──
      await fs.writeFile(tmpDb, Buffer.from(await dbFile.arrayBuffer()));
      await fs.writeFile(tmpUploads, Buffer.from(await uploadsFile.arrayBuffer()));

      // ── Restore DB (pg_restore exit 1 = warning ไม่ใช่ error จริง) ──
      let restoreWarning = '';
      try {
        await execFileAsync('pg_restore', [
          '-h', dbHost, '-p', dbPort, '-U', dbUser, '-d', dbName,
          '--clean', '--if-exists', '--no-owner', '--no-acl', tmpDb,
        ], { env, timeout: 120000 });
      } catch (e: any) {
        // pg_restore exit 1 with warnings — ข้อมูล restore แล้วแต่มี warning
        if (e.stderr?.includes('warning') || e.stderr?.includes('errors ignored on restore')) {
          restoreWarning = ' (มี warning แต่ข้อมูล restore แล้ว)';
        } else {
          throw e;
        }
      }

      // ── Restore uploads ──
      await execFileAsync('tar', ['-xzf', tmpUploads, '-C', uploadsDir], { timeout: 60000 });

      await prisma.activityLog.create({
        data: { userId: user.id, action: 'อัปโหลด & กู้คืน', details: `backup ก่อน restore: before_restore_*_${ts} · DB: ${formatSize(dbFile.size)} + Uploads: ${formatSize(uploadsFile.size)}` },
      });

      return NextResponse.json({ success: true, message: `กู้คืนสำเร็จ${restoreWarning} (backup ก่อน restore เก็บไว้ใน manual/)` });
    } finally {
      // ลบ temp files เสมอ
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — ลบ backup ไฟล์
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });
  }

  try {
    const { relativePath } = await req.json();
    const safePath = relativePath.replace(/\.\./g, '');
    const filePath = path.join(BACKUP_ROOT, safePath);
    if (!filePath.startsWith(BACKUP_ROOT)) {
      return NextResponse.json({ error: 'invalid path' }, { status: 400 });
    }

    await fs.unlink(filePath);

    await prisma.activityLog.create({
      data: { userId: user.id, action: 'ลบ backup', details: path.basename(safePath) },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
