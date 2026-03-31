import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toBookingResponse, bookingInclude } from '@/lib/mappers';

// ดึงข้อมูลการจองทั้งหมดสำหรับการวิเคราะห์
export async function GET() {
  try {
    // ดึงข้อมูลการจองทั้งหมดพร้อมข้อมูลที่เกี่ยวข้อง
    const bookings = await prisma.booking.findMany({
      include: bookingInclude,
      orderBy: { createdAt: 'desc' },
    });

    // ดึงข้อมูลผู้ขอใช้รถ top 10
    let requesters: { id: number; requesterName: string; bookingCount: number }[] = [];
    try {
      const grouped = await prisma.booking.groupBy({
        by: ['requesterId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });

      if (grouped.length > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: grouped.map((g) => g.requesterId) } },
          select: { id: true, name: true },
        });
        const userMap = new Map(users.map((u) => [u.id, u.name]));
        requesters = grouped.map((g) => ({
          id: g.requesterId,
          requesterName: userMap.get(g.requesterId) ?? '',
          bookingCount: g._count.id,
        }));
      }
    } catch (error) {
      console.warn('Could not fetch user data:', error instanceof Error ? error.message : String(error));
    }

    return NextResponse.json({
      bookings: bookings.map(toBookingResponse),
      requesters,
      message: 'Successfully retrieved data',
    });
  } catch (error: unknown) {
    console.error('Database error when fetching bookings:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');

    return NextResponse.json(
      {
        error: 'Failed to fetch bookings',
        details: error instanceof Error ? error.message : 'Unknown database error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
        bookings: [],
      },
      { status: 500 },
    );
  }
}
