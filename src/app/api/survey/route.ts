// src/app/api/survey/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ดึงข้อมูลแบบประเมินทั้งหมดพร้อมข้อมูลเพิ่มเติมสำหรับการวิเคราะห์
export async function GET() {
  try {
    const surveys = await prisma.survey.findMany({
      include: {
        booking: {
          include: { requester: true, driver: true, car: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // แปลงข้อมูลให้เป็นรูปแบบที่ต้องการ
    const formattedSurveys = surveys.map((survey: (typeof surveys)[number]) => ({
      id: survey.id,
      bookingId: survey.bookingId,
      bookingNumber: survey.booking.bookingNumber,
      requesterName: survey.booking.requester?.name ?? null,
      driverName: survey.booking.driver?.name ?? null,
      driverPhotoUrl: survey.booking.driver?.photoUrl ?? null,
      carLicensePlate: survey.booking.car?.licensePlate ?? null,
      createdAt: survey.createdAt?.toISOString() ?? null,
      drivingRules: survey.drivingRules,
      appropriateSpeed: survey.appropriateSpeed,
      politeDriving: survey.politeDriving,
      servicePoliteness: survey.servicePoliteness,
      missionUnderstanding: survey.missionUnderstanding,
      punctuality: survey.punctuality,
      travelPlanning: survey.travelPlanning,
      carSelection: survey.carSelection,
      carReadiness: survey.carReadiness,
      carCleanliness: survey.carCleanliness,
      suggestions: survey.suggestions,
    }));

    return NextResponse.json({ surveys: formattedSurveys });
  } catch (error) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json({ error: 'Failed to fetch surveys' }, { status: 500 });
  }
}

// สร้างแบบประเมินใหม่
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result = await prisma.$transaction(async (tx) => {
      // Insert survey record
      const bookingId = Number(body.bookingId);
      const survey = await tx.survey.create({
        data: {
          bookingId,
          drivingRules: Number(body.drivingRules),
          appropriateSpeed: Number(body.appropriateSpeed),
          politeDriving: Number(body.politeDriving),
          servicePoliteness: Number(body.servicePoliteness),
          missionUnderstanding: Number(body.missionUnderstanding),
          punctuality: Number(body.punctuality),
          travelPlanning: Number(body.travelPlanning),
          carSelection: Number(body.carSelection),
          carReadiness: Number(body.carReadiness),
          carCleanliness: Number(body.carCleanliness),
          suggestions: body.suggestions || '',
        },
      });

      // Update evaluated_at in bookings table
      await tx.booking.update({
        where: { id: bookingId },
        data: { evaluatedAt: new Date() },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: Number(body.userId || 1),
          action: 'ส่งแบบประเมินความพึงพอใจ',
          details: `ส่งแบบประเมินความพึงพอใจสำหรับการจองเลขที่ ${body.bookingNumber}`,
        },
      });

      return survey;
    });

    return NextResponse.json({ survey: result }, { status: 201 });
  } catch (error) {
    console.error('Error creating survey:', error);
    return NextResponse.json({ error: 'Failed to create survey' }, { status: 500 });
  }
}
