import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteUploadFiles } from '@/lib/upload-utils';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    if (!id) {
      return NextResponse.json({ error: 'กรุณาระบุ ID พนักงานขับรถ' }, { status: 400 });
    }

    const driver = await prisma.driver.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, name: true, photoUrl: true },
    });

    if (!driver) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงานขับรถ' }, { status: 404 });
    }

    return NextResponse.json({ driver });
  } catch (error) {
    console.error('Error fetching driver data:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลพนักงานขับรถ' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'กรุณาระบุ ID พนักงานขับรถ' }, { status: 400 });
    }

    const requestBody = await request.text();
    if (!requestBody) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลในคำขอ' }, { status: 400 });
    }

    let body;
    try {
      body = JSON.parse(requestBody);
    } catch {
      return NextResponse.json({ error: 'รูปแบบ JSON ไม่ถูกต้อง' }, { status: 400 });
    }

    if (!body.name) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อพนักงานขับรถ' }, { status: 400 });
    }

    const existingDriver = await prisma.driver.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingDriver) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงานขับรถ' }, { status: 404 });
    }

    // Delete old uploaded file if photo is being replaced
    if (body.photoUrl !== undefined) {
      const oldUrl = existingDriver.photoUrl;
      if (oldUrl && oldUrl.startsWith('/uploads/') && oldUrl !== (body.photoUrl || null)) {
        await deleteUploadFiles(oldUrl);
      }
    }

    const data: { name: string; photoUrl?: string | null } = { name: body.name };
    if (body.photoUrl !== undefined) {
      data.photoUrl = body.photoUrl || null;
    }

    const driver = await prisma.driver.update({
      where: { id: parseInt(id) },
      data,
      select: { id: true, name: true, photoUrl: true },
    });

    return NextResponse.json({
      message: 'อัพเดทข้อมูลพนักงานขับรถเรียบร้อยแล้ว',
      driver,
    });
  } catch (error) {
    console.error('Error updating driver data:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัพเดทข้อมูลพนักงานขับรถ' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'กรุณาระบุ ID พนักงานขับรถ' }, { status: 400 });
    }

    // ตรวจสอบว่ามีการอ้างอิงในตาราง bookings หรือไม่
    const driver = await prisma.driver.findUnique({
      where: { id: parseInt(id) },
      include: { bookings: { select: { id: true }, take: 1 } },
    });

    if (!driver) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงานขับรถ' }, { status: 404 });
    }

    if (driver.bookings.length > 0) {
      return NextResponse.json(
        { error: 'ไม่สามารถลบพนักงานขับรถได้เนื่องจากมีการใช้งานในระบบจองรถ' },
        { status: 400 }
      );
    }

    await prisma.driver.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ message: 'ลบข้อมูลพนักงานขับรถเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Error deleting driver data:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบข้อมูลพนักงานขับรถ' },
      { status: 500 }
    );
  }
}
