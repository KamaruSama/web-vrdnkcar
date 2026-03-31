// src/app/api/config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, requireAdmin } from '@/lib/auth';
import { getConfig, setConfigValue } from '@/lib/config';

// GET /api/config - Fetch all config values
export async function GET() {
  try {
    const config = await getConfig();

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ config, isAdmin: false });
    }

    const isAdmin = user.role === 'admin';
    return NextResponse.json({ config, isAdmin });
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json({
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า'
    }, { status: 500 });
  }
}

// POST /api/config - Update config values (admin only)
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 });
    }

    const body = await req.json();

    // Update successCardTimeout if provided
    if (body.successCardTimeout !== undefined) {
      const timeout = parseInt(body.successCardTimeout);

      if (isNaN(timeout) || timeout < 0) {
        return NextResponse.json({
          error: 'ค่าเวลาแสดงการ์ด Success ต้องเป็นตัวเลขและไม่น้อยกว่า 0'
        }, { status: 400 });
      }

      await setConfigValue('successCardTimeout', timeout);
    }

    const updatedConfig = await getConfig();

    // Log activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: admin.id,
          action: 'แก้ไขการตั้งค่าระบบ',
          details: `แก้ไขการตั้งค่าระยะเวลาแสดงการ์ดสถานะ Success เป็น ${updatedConfig.successCardTimeout} นาที`,
        },
      });
    } catch (logError) {
      console.error('Error logging activity:', logError);
    }

    return NextResponse.json({
      success: true,
      config: updatedConfig,
      message: 'บันทึกการตั้งค่าเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json({
      error: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า'
    }, { status: 500 });
  }
}
