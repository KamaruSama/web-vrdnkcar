import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    console.log('Login API called');

    // ตรวจสอบว่าร่างกายคำขอมีหรือไม่
    const requestBody = await req.text();
    if (!requestBody || requestBody.trim() === '') {
      return NextResponse.json({ error: 'คำขอไม่มีข้อมูล' }, { status: 400 });
    }

    // แปลงข้อความเป็น JSON
    let body;
    try {
      body = JSON.parse(requestBody);
    } catch (parseError) {
      return NextResponse.json({ error: 'รูปแบบ JSON ไม่ถูกต้อง', details: String(parseError) }, { status: 400 });
    }

    const { username, test } = body;
    console.log('Login request body:', body);

    // ถ้าไม่มี username
    if (!username) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อผู้ใช้' }, { status: 400 });
    }

    // ถ้าเป็นการทดสอบ API ให้ตอบกลับทันที
    if (test) {
      return NextResponse.json({ message: 'API is working correctly', test: true });
    }

    // ตรวจสอบว่ามีผู้ใช้ในระบบหรือไม่
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { username },
        select: { id: true, username: true, name: true, position: true, role: true, profilePicture: true },
      });

      console.log('Found user:', user);
    } catch (dbError) {
      console.error('Database error when fetching user:', dbError);
      return NextResponse.json({
        error: 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้ในระบบ กรุณาตรวจสอบชื่อผู้ใช้' }, { status: 404 });
    }

    // สร้าง session token แบบ random
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 วัน

    // บันทึก session ลง DB
    await prisma.session.create({
      data: { id: sessionId, userId: user.id, expiresAt },
    });

    try {
      // บันทึกกิจกรรมการเข้าสู่ระบบ
      await prisma.activityLog.create({
        data: { userId: user.id, action: 'เข้าสู่ระบบ', details: `ผู้ใช้ ${user.name} เข้าสู่ระบบ` },
      });
    } catch (logError) {
      console.error('Error logging activity:', logError);
    }

    const useSecureCookies = process.env.USE_SECURE_COOKIES === 'true';

    try {
      const cookieStore = await cookies();
      cookieStore.set('session_id', sessionId, {
        httpOnly: true,
        secure: useSecureCookies,
        expires: expiresAt,
        path: '/',
        sameSite: 'lax',
      });
    } catch (cookieError) {
      console.error('Error setting cookies:', cookieError);
      return NextResponse.json({
        error: 'เกิดข้อผิดพลาดในการสร้าง session',
        details: cookieError instanceof Error ? cookieError.message : 'Unknown error'
      }, { status: 500 });
    }

    console.log('Login successful for user:', user.username);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({
      error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}