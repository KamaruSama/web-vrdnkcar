import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { toEpochMs } from '@/lib/date-utils';

/**
 * API endpoint to mark a booking as evaluated (for self-driving scenario or admin usage)
 * POST /api/bookings/[id]/mark-evaluated
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'ID ไม่ถูกต้อง' }, { status: 400 });
    }

    const body = await request.json();
    const { hasBeenEvaluated = true } = body;

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 });
    }

    const bookingId = parseInt(id);

    // Check if booking exists and is approved
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, approvalStatus: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลการจอง' }, { status: 404 });
    }

    if (booking.approvalStatus !== 'approved') {
      return NextResponse.json({
        error: 'สามารถทำเครื่องหมายว่าประเมินได้เฉพาะการจองที่อนุมัติแล้วเท่านั้น'
      }, { status: 400 });
    }

    if (hasBeenEvaluated) {
      const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: { evaluatedAt: new Date() },
        select: { evaluatedAt: true },
      });

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'มีการประเมินการจองรถ',
          details: `ทำเครื่องหมายว่าประเมินแล้วสำหรับการจองรถ ID ${id} (ขับรถเอง)`,
        },
      });

      return NextResponse.json({
        success: true,
        bookingId,
        evaluatedTimestamp: toEpochMs(updated.evaluatedAt),
      });
    } else {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { evaluatedAt: null },
      });

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'ยกเลิกการประเมินการจองรถ',
          details: `ยกเลิกการทำเครื่องหมายว่าประเมินแล้วสำหรับการจองรถ ID ${id}`,
        },
      });

      return NextResponse.json({
        success: true,
        bookingId,
        evaluatedTimestamp: null,
      });
    }
  } catch (error) {
    console.error('Error updating evaluation status:', error);
    return NextResponse.json({
      error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะการประเมิน',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
