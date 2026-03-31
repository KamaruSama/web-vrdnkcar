import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function POST() {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const originalsDir = path.join(uploadsDir, 'originals');

  // 1. หา URL รูปทั้งหมดที่ใช้อยู่ใน DB
  const [dbUsers, dbDrivers, dbCars] = await Promise.all([
    prisma.user.findMany({ select: { profilePicture: true }, where: { profilePicture: { not: null } } }),
    prisma.driver.findMany({ select: { photoUrl: true }, where: { photoUrl: { not: null } } }),
    prisma.car.findMany({ select: { photoUrl: true }, where: { photoUrl: { not: null } } }),
  ]);

  const usedUrls = new Set<string>();
  dbUsers.forEach(r => { if (r.profilePicture) usedUrls.add(r.profilePicture); });
  dbDrivers.forEach(r => { if (r.photoUrl) usedUrls.add(r.photoUrl); });
  dbCars.forEach(r => { if (r.photoUrl) usedUrls.add(r.photoUrl); });

  // แปลง URL เป็น filename เช่น /uploads/abc.webp → abc.webp
  const usedFiles = new Set(
    Array.from(usedUrls)
      .filter(u => u.startsWith('/uploads/'))
      .map(u => path.basename(u))
  );

  // แปลง UUID จากไฟล์ที่ใช้อยู่
  const usedUuids = new Set(
    Array.from(usedFiles).map(f => f.replace(/\.[^.]+$/, ''))
  );

  let deletedDisplay = 0;
  let deletedOriginals = 0;

  // 2. ลบไฟล์แสดงผลที่ไม่มีใน DB
  try {
    const entries = await fs.readdir(uploadsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (entry.name.startsWith('.')) continue;
      if (!usedFiles.has(entry.name)) {
        await fs.unlink(path.join(uploadsDir, entry.name));
        deletedDisplay++;
      }
    }
  } catch { /* dir may not exist */ }

  // 3. ลบต้นฉบับที่ UUID ไม่ตรงกับไฟล์ที่ใช้อยู่
  try {
    const entries = await fs.readdir(originalsDir);
    for (const entry of entries) {
      const uuid = entry.replace(/\.[^.]+$/, '');
      if (!usedUuids.has(uuid)) {
        await fs.unlink(path.join(originalsDir, entry));
        deletedOriginals++;
      }
    }
  } catch { /* dir may not exist */ }

  // 4. บันทึกกิจกรรม
  if (deletedDisplay + deletedOriginals > 0) {
    await prisma.activityLog.create({
      data: { userId: user.id, action: 'ล้างไฟล์อัปโหลด', details: `ลบ ${deletedDisplay} ไฟล์แสดงผล, ${deletedOriginals} ต้นฉบับ` },
    });
  }

  return NextResponse.json({
    success: true,
    deleted: { display: deletedDisplay, originals: deletedOriginals },
    kept: usedFiles.size,
  });
}

// DELETE = ล้างทุกอย่าง (ไฟล์ + DB references)
export async function DELETE() {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const originalsDir = path.join(uploadsDir, 'originals');

  let deletedDisplay = 0;
  let deletedOriginals = 0;

  // 1. ลบไฟล์ทั้งหมด
  try {
    const entries = await fs.readdir(uploadsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (entry.name.startsWith('.')) continue;
      await fs.unlink(path.join(uploadsDir, entry.name));
      deletedDisplay++;
    }
  } catch { /* */ }

  try {
    const entries = await fs.readdir(originalsDir);
    for (const entry of entries) {
      await fs.unlink(path.join(originalsDir, entry));
      deletedOriginals++;
    }
  } catch { /* */ }

  // 2. ล้าง DB references
  await Promise.all([
    prisma.user.updateMany({ where: { profilePicture: { startsWith: '/uploads/' } }, data: { profilePicture: null } }),
    prisma.driver.updateMany({ where: { photoUrl: { startsWith: '/uploads/' } }, data: { photoUrl: null } }),
    prisma.car.updateMany({ where: { photoUrl: { startsWith: '/uploads/' } }, data: { photoUrl: null } }),
  ]);

  // 3. บันทึกกิจกรรม
  await prisma.activityLog.create({
    data: { userId: user.id, action: 'รีเซ็ตรูปภาพทั้งหมด', details: `ลบ ${deletedDisplay} ไฟล์แสดงผล, ${deletedOriginals} ต้นฉบับ, ล้าง DB references` },
  });

  return NextResponse.json({
    success: true,
    deleted: { display: deletedDisplay, originals: deletedOriginals },
    dbCleared: true,
  });
}
