import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'ID ไม่ถูกต้อง' }, { status: 400 });
    }

    // ตรวจสอบสิทธิ์ผู้ใช้ (เฉพาะ admin เท่านั้น)
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์ในการลบข้อมูลการประเมิน' }, { status: 403 });
    }

    const bookingId = parseInt(id);

    // ตรวจสอบว่ามีการประเมินสำหรับการจองนี้หรือไม่
    const surveyCount = await prisma.survey.count({
      where: { bookingId },
    });

    if (surveyCount === 0) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลการประเมินสำหรับการจองนี้' }, { status: 404 });
    }

    // ดึงข้อมูลการจองเพื่อใช้ในการบันทึกกิจกรรม
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { bookingNumber: true },
    });

    // ลบข้อมูลการประเมิน
    await prisma.survey.deleteMany({
      where: { bookingId },
    });

    // บันทึกกิจกรรม
    const detailLabel = booking
      ? `ลบการประเมินสำหรับการจองรถหมายเลข ${booking.bookingNumber}`
      : `ลบการประเมินสำหรับการจองรถ ID ${id}`;

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'ลบการประเมิน',
        details: detailLabel,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'ลบข้อมูลการประเมินเรียบร้อยแล้ว',
    });
  } catch (error) {
    console.error('Error deleting survey:', error);
    return NextResponse.json({
      error: 'เกิดข้อผิดพลาดในการลบข้อมูลการประเมิน กรุณาลองใหม่อีกครั้ง',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
