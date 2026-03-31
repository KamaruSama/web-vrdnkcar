import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 });
    }

    const logs = await prisma.activityLog.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const mapped = logs.map(log => ({
      id: log.id,
      userId: log.userId,
      userName: log.user.name,
      action: log.action,
      details: log.details,
      createdAt: log.createdAt,
    }));

    return NextResponse.json({ logs: mapped });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลกิจกรรมผู้ใช้' },
      { status: 500 }
    );
  }
}
