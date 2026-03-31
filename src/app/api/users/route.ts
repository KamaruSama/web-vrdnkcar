// src/app/api/users/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ดึงข้อมูลผู้ใช้ทั้งหมด
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const requesterOnly = url.searchParams.get('requesterOnly') === 'true';

    const where = requesterOnly ? { showInRequesterList: 1 } : {};
    const users = await prisma.user.findMany({ where, orderBy: { name: 'asc' } });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// สร้างผู้ใช้ใหม่ (สำหรับ admin)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log('Received user data:', body);

    // ตรวจสอบว่ามี username ซ้ำหรือไม่
    const existing = await prisma.user.findUnique({ where: { username: body.username } });
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    // กำหนดค่าเริ่มต้นสำหรับ showInRequesterList ถ้าไม่ได้ระบุ
    const showInRequesterList = body.showInRequesterList !== undefined ? body.showInRequesterList : true;

    // บันทึกผู้ใช้ใหม่
    const user = await prisma.user.create({
      data: {
        username: body.username,
        name: body.name,
        position: body.position,
        role: body.role || 'user',
        showInRequesterList: showInRequesterList ? 1 : 0,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// ลบผู้ใช้ (สำหรับ admin)
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const id = parseInt(userId);

    // ตรวจสอบว่าผู้ใช้มีอยู่จริงหรือไม่
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ลบผู้ใช้
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
