import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// ดึงข้อมูลรถทั้งหมด
export async function GET() {
  try {
    const cars = await prisma.car.findMany({ orderBy: { licensePlate: 'asc' } });
    return NextResponse.json({ cars });
  } catch (error: any) {
    console.error('Error fetching cars:', error);
    return NextResponse.json({ error: 'Failed to fetch cars', message: error.message }, { status: 500 });
  }
}

// สร้างข้อมูลรถใหม่ (สำหรับ admin)
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 });

    const body = await req.json();

    // ตรวจสอบว่ามีทะเบียนรถซ้ำหรือไม่
    const existing = await prisma.car.findUnique({ where: { licensePlate: body.licensePlate } });
    if (existing) {
      return NextResponse.json({ error: 'License plate already exists' }, { status: 400 });
    }

    // บันทึกข้อมูลรถใหม่
    const car = await prisma.car.create({
      data: {
        licensePlate: body.licensePlate,
        photoUrl: body.photoUrl || null,
      },
    });

    // บันทึกกิจกรรม
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'เพิ่มข้อมูลรถ',
        details: `เพิ่มข้อมูลรถทะเบียน ${body.licensePlate}`,
      },
    });

    return NextResponse.json({ car }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating car:', error);
    return NextResponse.json({ error: 'Failed to create car', message: error.message }, { status: 500 });
  }
}
