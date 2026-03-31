import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramNotification, sendLineNotification } from '@/lib/notifications';

/**
 * API endpoint for sending notifications
 * POST /api/notifications
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { platform, bookingData } = body;

    if (!platform || !bookingData) {
      return NextResponse.json(
        { error: 'Platform and bookingData are required' },
        { status: 400 }
      );
    }

    let result;
    if (platform === 'telegram') {
      result = await sendTelegramNotification(bookingData);
    } else if (platform === 'line') {
      result = await sendLineNotification(bookingData);
    } else {
      return NextResponse.json(
        { error: 'Invalid platform. Use "telegram" or "line"' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error in notifications API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Test endpoint for notifications
 * GET /api/notifications/test
 */
export async function GET() {
  // This is just for testing purposes
  return NextResponse.json({
    message: 'Notifications API is working. Use POST to send notifications.'
  });
}