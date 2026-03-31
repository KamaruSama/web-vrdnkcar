import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { deleteUploadFiles } from '@/lib/upload-utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (before processing)
const DISPLAY_SIZE = 400;               // px — square display version
const ORIGINAL_MAX = 1500;             // px — max side of original

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const ORIGINALS_DIR = path.join(UPLOADS_DIR, 'originals');

async function ensureDirs() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.mkdir(ORIGINALS_DIR, { recursive: true });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 });
    }
    const userId = user.id;

    if (!req.headers.get('content-type')?.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'ต้องส่งข้อมูลในรูปแบบ FormData' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'ไม่พบไฟล์ในคำขอ' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)' }, { status: 400 });
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'ประเภทไฟล์ไม่ถูกต้อง (รองรับเฉพาะ JPEG, PNG, GIF, WEBP)' }, { status: 400 });
    }

    await ensureDirs();

    const buffer = Buffer.from(await file.arrayBuffer());
    const uuid = uuidv4();
    const origExt = file.type.split('/')[1].replace('jpeg', 'jpg');

    // Save original (cropped by client, full resolution up to ORIGINAL_MAX)
    const originalFileName = `${uuid}.${origExt}`;
    await sharp(buffer)
      .resize(ORIGINAL_MAX, ORIGINAL_MAX, { fit: 'inside', withoutEnlargement: true })
      .toFormat(origExt as any, { quality: 90 })
      .toFile(path.join(ORIGINALS_DIR, originalFileName));

    // Save display version (smaller, webp — preserve aspect ratio from client crop)
    const displayFileName = `${uuid}.webp`;
    await sharp(buffer)
      .resize(DISPLAY_SIZE, DISPLAY_SIZE, { fit: 'inside', withoutEnlargement: true })
      .toFormat('webp', { quality: 85 })
      .toFile(path.join(UPLOADS_DIR, displayFileName));

    const fileUrl = `/uploads/${displayFileName}`;

    await prisma.activityLog.create({
      data: { userId, action: 'อัปโหลดรูปภาพ', details: `อัปโหลด: ${fileUrl}` },
    });

    return NextResponse.json({ success: true, url: fileUrl });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({
      error: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 });
    }

    const { fileUrl } = await req.json();
    if (!fileUrl || !fileUrl.startsWith('/uploads/')) {
      return NextResponse.json({ error: 'path ไม่ถูกต้อง' }, { status: 400 });
    }

    await deleteUploadFiles(fileUrl);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    if (error.code === 'ENOENT') return NextResponse.json({ success: true });
    return NextResponse.json({ error: 'ลบไฟล์ไม่สำเร็จ' }, { status: 500 });
  }
}
