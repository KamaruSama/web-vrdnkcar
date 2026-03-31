// src/app/api/survey/status/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toEpochMs } from '@/lib/date-utils';

// API Route for checking survey status and timestamps
export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      where: { evaluatedAt: { not: null } },
      select: { id: true, evaluatedAt: true },
    });

    const evaluatedBookingIds = bookings.map((b: (typeof bookings)[number]) => b.id);

    const evaluatedTimestamps: Record<number, number> = {};
    for (const b of bookings) {
      evaluatedTimestamps[b.id] = toEpochMs(b.evaluatedAt)!;
    }

    return NextResponse.json({
      evaluatedBookings: evaluatedBookingIds,
      evaluatedTimestamps,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting survey status:', error);
    return NextResponse.json({
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถานะการประเมิน',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
