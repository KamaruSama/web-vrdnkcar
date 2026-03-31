import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * API route สำหรับทดสอบการเชื่อมต่อฐานข้อมูล
 * ใช้เฉพาะในขั้นตอนการพัฒนาเท่านั้น ควรลบออกก่อนนำไปใช้งานจริง
 */
export async function GET() {
  try {
    console.log('Testing database connection...');

    // ทดสอบคำสั่ง SQL พื้นฐาน
    const serverInfo = await prisma.$queryRaw`SELECT version() as version`;

    // ทดสอบว่ามีตารางที่จำเป็นหรือไม่
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      serverInfo,
      tables,
      database: {
        host: process.env.DB_HOST || 'localhost',
        name: process.env.DB_NAME || 'car_booking',
        user: process.env.DB_USER || 'root',
      }
    });
  } catch (error: any) {
    console.error('Database connection test failed:', error);

    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      message: error.message,
      code: error.code || null,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
