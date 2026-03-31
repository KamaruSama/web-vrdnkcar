// src/app/api/users/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteUploadFiles } from '@/lib/upload-utils';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await context.params;

    if (!idStr) {
      return NextResponse.json({ error: 'กรุณาระบุ ID ผู้ใช้' }, { status: 400 });
    }

    const id = parseInt(idStr);

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'รูปแบบ JSON ไม่ถูกต้อง' }, { status: 400 });
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่หรือไม่
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ใช้' }, { status: 404 });
    }

    // สร้าง data object สำหรับอัพเดท
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      data.name = body.name;
    }

    if (body.position !== undefined) {
      data.position = body.position;
    }

    if (body.profilePicture !== undefined) {
      if (body.profilePicture === null) {
        data.profilePicture = null;
      } else if (body.profilePicture.startsWith('/uploads/')) {
        data.profilePicture = body.profilePicture;
      } else if (body.profilePicture.startsWith('http')) {
        if (body.profilePicture.length > 2048) {
          return NextResponse.json({ error: 'URL รูปภาพยาวเกินไป (สูงสุด 2048 ตัวอักษร)' }, { status: 400 });
        }
        data.profilePicture = body.profilePicture;
      } else {
        return NextResponse.json({ error: 'รูปแบบรูปภาพไม่ถูกต้อง' }, { status: 400 });
      }

      // Delete old uploaded file if it's being replaced
      const oldUrl = existingUser.profilePicture;
      if (oldUrl && oldUrl.startsWith('/uploads/') && oldUrl !== body.profilePicture) {
        await deleteUploadFiles(oldUrl);
      }
    }

    if (body.showInRequesterList !== undefined) {
      data.showInRequesterList = body.showInRequesterList ? 1 : 0;
    }

    if (body.role !== undefined) {
      data.role = body.role;
    }

    // ถ้าไม่มีข้อมูลที่จะอัพเดท
    if (Object.keys(data).length === 0) {
      return NextResponse.json({
        message: 'ไม่มีข้อมูลที่จะอัพเดท',
        user: existingUser,
      });
    }

    // อัพเดทข้อมูลผู้ใช้
    const updatedUser = await prisma.user.update({
      where: { id },
      data,
    });

    // บันทึกกิจกรรม
    try {
      await prisma.activityLog.create({
        data: {
          userId: id,
          action: 'แก้ไขโปรไฟล์',
          details: `ผู้ใช้ ${updatedUser.name} แก้ไขข้อมูลโปรไฟล์`,
        },
      });
    } catch (logError) {
      console.warn('Failed to log user activity:', logError);
    }

    return NextResponse.json({
      message: 'อัพเดทข้อมูลผู้ใช้เรียบร้อยแล้ว',
      user: updatedUser,
    });
  } catch (error: unknown) {
    console.error('Error updating user data:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัพเดทข้อมูลผู้ใช้', details: message },
      { status: 500 }
    );
  }
}

// ลบผู้ใช้
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await context.params;

    if (!idStr) {
      return NextResponse.json({ error: 'กรุณาระบุ ID ผู้ใช้' }, { status: 400 });
    }

    const id = parseInt(idStr);

    // ตรวจสอบว่าผู้ใช้มีอยู่หรือไม่
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!existingUser) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ใช้' }, { status: 404 });
    }

    console.log('Deleting user with ID:', id);

    // ลบข้อมูลที่เกี่ยวข้องทั้งหมดใน transaction
    await prisma.$transaction(async (tx) => {
      // ลบ surveys ที่เกี่ยวข้องกับ bookings ของผู้ใช้
      const bookings = await tx.booking.findMany({
        where: { requesterId: id },
        select: { id: true },
      });
      const ids = bookings.map((b: { id: number }) => b.id);
      if (ids.length > 0) {
        await tx.survey.deleteMany({
          where: { bookingId: { in: ids } },
        });
      }

      // ลบ bookings ของผู้ใช้
      await tx.booking.deleteMany({ where: { requesterId: id } });

      // ลบ activity_logs ของผู้ใช้
      await tx.activityLog.deleteMany({ where: { userId: id } });

      // ลบผู้ใช้
      await tx.user.delete({ where: { id } });
    });

    console.log('User deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'ลบผู้ใช้เรียบร้อยแล้ว',
    });
  } catch (error: unknown) {
    console.error('Error deleting user:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบผู้ใช้', details: message },
      { status: 500 }
    );
  }
}
