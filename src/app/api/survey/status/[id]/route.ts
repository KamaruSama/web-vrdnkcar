// src/app/api/survey/status/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { toEpochMs } from '@/lib/date-utils';

// API Route for updating evaluation status (for self-driving case)
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

    // Get user ID for activity logging
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 });
    }

    const bookingId = parseInt(id);

    if (hasBeenEvaluated) {
      // Update evaluated_at timestamp
      const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: { evaluatedAt: new Date() },
        select: { evaluatedAt: true },
      });

      // Log activity
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
      // Clear evaluated_at timestamp
      await prisma.booking.update({
        where: { id: bookingId },
        data: { evaluatedAt: null },
      });

      // Log activity
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
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
