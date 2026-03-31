import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toBookingResponse, bookingInclude } from '@/lib/mappers';
import { parseBEDate, parseTime } from '@/lib/date-utils';
import { sendTelegramNotification } from '@/lib/notifications';

// ดึงข้อมูลการจอง — รองรับ pagination + filter ฝั่ง server
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const page = parseInt(url.searchParams.get('page') || '0'); // 0 = ส่งทั้งหมด (backward compat)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    const where: any = {};
    if (status && status !== 'all') where.approvalStatus = status;
    if (search) {
      where.OR = [
        { bookingNumber: { contains: search, mode: 'insensitive' } },
        { requester: { name: { contains: search, mode: 'insensitive' } } },
        { destination: { contains: search, mode: 'insensitive' } },
      ];
    }

    // ถ้า page = 0 ส่งทั้งหมด (backward compatible กับ client เดิม)
    if (page === 0) {
      const bookings = await prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ bookings: bookings.map(toBookingResponse) });
    }

    // Server-side pagination
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({
      bookings: bookings.map(toBookingResponse),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // สร้างเลขที่ใบขอใช้รถใหม่
    const yearThai = new Date().getFullYear() + 543;
    const agg = await prisma.booking.aggregate({ _max: { id: true } });
    const nextId = (agg._max.id ?? 0) + 1;
    const bookingNumber = `CAR-${yearThai}-${String(nextId).padStart(4, '0')}`;

    // บันทึกการจองใหม่
    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        submissionDate: parseBEDate(body.submissionDate),
        requesterId: Number(body.requesterId),
        destination: body.destination,
        purpose: body.purpose,
        travelers: Number(body.travelers),
        departureDate: parseBEDate(body.departureDate),
        departureTime: parseTime(body.departureTime),
        returnDate: parseBEDate(body.returnDate),
        returnTime: parseTime(body.returnTime),
        approvalStatus: 'pending',
      },
      include: bookingInclude,
    });

    // บันทึกประวัติกิจกรรม
    await prisma.activityLog.create({
      data: {
        userId: Number(body.requesterId),
        action: 'สร้างการจองรถใหม่',
        details: `สร้างการจองรถใหม่เลขที่ ${bookingNumber}`,
      },
    });

    const response = toBookingResponse(booking);

    // ส่งการแจ้งเตือนไปยัง Telegram
    try {
      await sendTelegramNotification(response);
    } catch (notificationError) {
      console.error('Error sending Telegram notification:', notificationError);
    }

    return NextResponse.json({ booking: response }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
