import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toBookingResponse, bookingInclude } from '@/lib/mappers';
import { sendLineNotification } from '@/lib/notifications';

// ดึงข้อมูลการจองตาม ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'ID ไม่ถูกต้อง' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: bookingInclude,
    });

    if (!booking) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลการจอง' }, { status: 404 });
    }

    return NextResponse.json({ booking: toBookingResponse(booking) });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json({
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// อัปเดตข้อมูลการจอง
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'ID ไม่ถูกต้อง' }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }

    const userId = Number(body.userId || 1);
    const bookingId = parseInt(id);

    // Build dynamic update data
    const data: any = {};
    if (body.carId !== undefined) data.carId = body.carId !== null && body.carId !== '' ? Number(body.carId) || null : null;
    if (body.driverId !== undefined) data.driverId = body.driverId !== null && body.driverId !== '' ? Number(body.driverId) || null : null;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.approvalStatus !== undefined) data.approvalStatus = body.approvalStatus;
    if (body.approvalNotes !== undefined) data.approvalNotes = body.approvalNotes;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'ไม่มีข้อมูลที่ต้องการอัปเดต' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Check previous car/driver for LINE notification logic
      const existing = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { carId: true, driverId: true },
      });

      if (!existing) {
        throw new Error('not found');
      }

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data,
        include: bookingInclude,
      });

      // Activity log for car/driver assignment
      if (body.carId !== undefined || body.driverId !== undefined) {
        await tx.activityLog.create({
          data: {
            userId,
            action: 'กำหนดรถและพนักงานขับรถ',
            details: `กำหนดรถและพนักงานขับรถสำหรับการจองเลขที่ ${body.bookingNumber}`,
          },
        });
      }

      // Activity log for approval status change
      if (body.approvalStatus !== undefined) {
        const statusText =
          body.approvalStatus === 'approved' ? 'อนุมัติการจองรถ' :
          body.approvalStatus === 'rejected' ? 'ไม่อนุมัติการจองรถ' : 'แก้ไขสถานะการจองรถ';

        await tx.activityLog.create({
          data: {
            userId,
            action: statusText,
            details: `${statusText}เลขที่ ${body.bookingNumber}`,
          },
        });
      }

      const shouldSendLineNotification =
        (body.carId !== undefined && body.carId !== null && Number(body.carId) !== existing.carId) ||
        (body.driverId !== undefined && body.driverId !== null && Number(body.driverId) !== existing.driverId);

      return { updated, shouldSendLineNotification };
    });

    // Send LINE notification outside the transaction
    if (result.shouldSendLineNotification && result.updated.carId && result.updated.driverId) {
      try {
        await sendLineNotification(toBookingResponse(result.updated));
      } catch (notificationError) {
        console.error('Error sending Line notification:', notificationError);
      }
    }

    return NextResponse.json({ booking: toBookingResponse(result.updated) });
  } catch (error) {
    if (error instanceof Error && error.message === 'not found') {
      return NextResponse.json({ error: 'ไม่พบข้อมูลการจอง' }, { status: 404 });
    }
    console.error('Error in update booking API:', error);
    return NextResponse.json({
      error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล กรุณาลองใหม่อีกครั้ง',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// ลบข้อมูลการจองตาม ID
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'ID ไม่ถูกต้อง' }, { status: 400 });
    }

    const bookingId = parseInt(id);

    // ดึง user ที่ login เพื่อบันทึกว่าใครลบ
    const { getSessionUser } = await import('@/lib/auth');
    const currentUser = await getSessionUser();

    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { bookingNumber: true },
      });

      if (!booking) {
        throw new Error('not found');
      }

      await tx.survey.deleteMany({ where: { bookingId } });
      await tx.booking.delete({ where: { id: bookingId } });
      await tx.activityLog.create({
        data: {
          userId: currentUser?.id ?? 1,
          action: 'ลบการจองรถ',
          details: `ลบการจองรถหมายเลข ${booking.bookingNumber}`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'ลบข้อมูลการจองและการประเมินที่เกี่ยวข้องเรียบร้อยแล้ว'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'not found') {
      return NextResponse.json({ error: 'ไม่พบข้อมูลการจอง' }, { status: 404 });
    }
    console.error('Error in delete booking API:', error);
    return NextResponse.json({
      error: 'เกิดข้อผิดพลาดในการลบข้อมูล กรุณาลองใหม่อีกครั้ง',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
