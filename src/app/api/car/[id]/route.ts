import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { deleteUploadFiles } from '@/lib/upload-utils';

// ดึงข้อมูลรถตาม ID
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const car = await prisma.car.findUnique({ where: { id: parseInt(id) } });

    if (!car) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    }

    return NextResponse.json({ car });
  } catch (error: any) {
    console.error('Error fetching car:', error);
    return NextResponse.json({ error: 'Failed to fetch car', message: error.message }, { status: 500 });
  }
}

// อัปเดตข้อมูลรถ
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 });

    const body = await req.json();
    const carId = parseInt(id);

    // ตรวจสอบว่าทะเบียนรถซ้ำหรือไม่ (ถ้ามีการเปลี่ยนทะเบียน)
    if (body.licensePlate) {
      const existing = await prisma.car.findFirst({
        where: { licensePlate: body.licensePlate, NOT: { id: carId } },
      });
      if (existing) {
        return NextResponse.json({ error: 'License plate already exists' }, { status: 400 });
      }
    }

    // ลบรูปเก่าถ้ามีการเปลี่ยนรูป
    if (body.photoUrl !== undefined) {
      const oldCar = await prisma.car.findUnique({ where: { id: carId }, select: { photoUrl: true } });
      if (oldCar?.photoUrl && oldCar.photoUrl.startsWith('/uploads/') && oldCar.photoUrl !== body.photoUrl) {
        await deleteUploadFiles(oldCar.photoUrl);
      }
    }

    // อัปเดตข้อมูลรถ
    const car = await prisma.car.update({
      where: { id: carId },
      data: {
        licensePlate: body.licensePlate,
        photoUrl: body.photoUrl || null,
      },
    });

    // บันทึกกิจกรรม
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'แก้ไขข้อมูลรถ',
        details: `แก้ไขข้อมูลรถทะเบียน ${body.licensePlate}`,
      },
    });

    return NextResponse.json({ car });
  } catch (error: any) {
    console.error('Error updating car:', error);
    return NextResponse.json({ error: 'Failed to update car', message: error.message }, { status: 500 });
  }
}

// ลบข้อมูลรถ
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 });

    const carId = parseInt(id);

    // ตรวจสอบว่ารถนี้มีการใช้งานในการจองหรือไม่
    const bookingCount = await prisma.booking.count({ where: { carId } });
    if (bookingCount > 0) {
      return NextResponse.json({
        error: 'Cannot delete car that is in use. Please reassign or delete the bookings first.',
      }, { status: 400 });
    }

    // ดึงข้อมูลรถก่อนลบ (เพื่อใช้บันทึกในกิจกรรมและลบรูป)
    const car = await prisma.car.findUnique({ where: { id: carId } });
    if (!car) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    }

    // ลบรูปภาพถ้ามี
    if (car.photoUrl && car.photoUrl.startsWith('/uploads/')) {
      await deleteUploadFiles(car.photoUrl);
    }

    // ลบข้อมูลรถ
    await prisma.car.delete({ where: { id: carId } });

    // บันทึกกิจกรรม
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'ลบข้อมูลรถ',
        details: `ลบข้อมูลรถทะเบียน ${car.licensePlate}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting car:', error);
    return NextResponse.json({ error: 'Failed to delete car', message: error.message }, { status: 500 });
  }
}
