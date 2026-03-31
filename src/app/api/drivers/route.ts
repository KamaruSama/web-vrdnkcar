import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// ดึงข้อมูลพนักงานขับรถทั้งหมด
export async function GET() {
  try {
    const drivers = await prisma.driver.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, photoUrl: true },
    });

    return NextResponse.json({ drivers });
  } catch (error: any) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json({
      error: 'Failed to fetch drivers',
      message: error.message,
    }, { status: 500 });
  }
}

// สร้างข้อมูลพนักงานขับรถใหม่ (สำหรับ admin)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 });

    const driver = await prisma.driver.create({
      data: {
        name: body.name,
        photoUrl: body.photoUrl || null,
      },
      select: { id: true, name: true, photoUrl: true },
    });

    // บันทึกกิจกรรม
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'เพิ่มข้อมูลพนักงานขับรถ',
        details: `เพิ่มข้อมูลพนักงานขับรถ ${body.name}`,
      },
    });

    return NextResponse.json({ driver }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating driver:', error);
    return NextResponse.json({
      error: 'Failed to create driver',
      message: error.message,
    }, { status: 500 });
  }
}
