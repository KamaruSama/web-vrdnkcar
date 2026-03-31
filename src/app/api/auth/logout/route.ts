import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id')?.value;

    if (sessionId) {
      // ดึง user_id จาก session ก่อนลบ
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { userId: true },
      });

      if (session) {
        await prisma.activityLog.create({
          data: { userId: session.userId, action: 'ออกจากระบบ', details: 'ผู้ใช้ออกจากระบบ' },
        });
      }

      // ลบ session ออกจาก DB
      await prisma.session.delete({ where: { id: sessionId } });
    }

    cookieStore.delete('session_id');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
