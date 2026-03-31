import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

const execFileAsync = promisify(execFile);
const BACKUP_ROOT = path.join(process.cwd(), 'backup-auto');

async function restoreFile(filePath: string, userId: number) {
  const filename = path.basename(filePath);

  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5432';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbName = process.env.DB_NAME || 'car_booking';
  const dbPassword = process.env.DB_PASSWORD || '';
  const env = { ...process.env, PGPASSWORD: dbPassword };

  if (filename.endsWith('.dump')) {
    try {
      await execFileAsync('pg_restore', [
        '-h', dbHost, '-p', dbPort, '-U', dbUser, '-d', dbName,
        '--clean', '--if-exists', '--no-owner', '--no-acl', filePath,
      ], { env, timeout: 120000 });
    } catch (e: any) {
      // pg_restore exit 1 with warnings — ข้อมูล restore แล้วแต่มี warning
      if (!(e.stderr?.includes('warning') || e.stderr?.includes('errors ignored on restore'))) {
        throw e;
      }
    }
    await prisma.activityLog.create({
      data: { userId, action: 'restore database', details: `จาก ${filename}` },
    });
    return { type: 'db', filename };

  } else if (filename.endsWith('.tar.gz')) {
    const uploadsDir = path.join(process.cwd(), 'public');
    await execFileAsync('tar', ['-xzf', filePath, '-C', uploadsDir], { timeout: 60000 });
    await prisma.activityLog.create({
      data: { userId, action: 'restore uploads', details: `จาก ${filename}` },
    });
    return { type: 'uploads', filename };

  } else {
    throw new Error(`ไม่รองรับไฟล์: ${filename}`);
  }
}

// POST — restore จาก backup (รองรับทั้งไฟล์เดียวและหลายไฟล์)
export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });
  }

  try {
    const body = await req.json();

    // รองรับทั้ง relativePath (เดี่ยว) และ relativePaths (หลายไฟล์)
    const paths: string[] = body.relativePaths || (body.relativePath ? [body.relativePath] : []);

    if (paths.length === 0) {
      return NextResponse.json({ error: 'ไม่มีไฟล์ที่จะ restore' }, { status: 400 });
    }

    const results: Array<{ type: string; filename: string }> = [];

    // Restore DB ก่อน แล้วค่อย uploads (ลำดับสำคัญ)
    const sorted = paths
      .map(p => p.replace(/\.\./g, ''))
      .map(p => ({ safePath: p, filePath: path.join(BACKUP_ROOT, p) }))
      .filter(({ filePath }) => filePath.startsWith(BACKUP_ROOT))
      .sort((a, b) => {
        const aIsDb = a.safePath.endsWith('.dump') ? 0 : 1;
        const bIsDb = b.safePath.endsWith('.dump') ? 0 : 1;
        return aIsDb - bIsDb;
      });

    for (const { filePath } of sorted) {
      await fs.access(filePath);
      const result = await restoreFile(filePath, user.id);
      results.push(result);
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
