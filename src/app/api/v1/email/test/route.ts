import type { NextRequest} from 'next/server';

import { NextResponse } from 'next/server';

import { sendTestEmail, checkEmailServiceHealth } from '../../../../../lib/email';

export async function GET() {
  try {
    console.log('🧪 Testing email service health...');
    const health = await checkEmailServiceHealth();

    return NextResponse.json({
      success: true,
      data: health,
    });
  } catch (error: any) {
    console.error('❌ Email service health check failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to } = body;

    console.log(`🧪 Sending test email to: ${to || 'default'}`);
    const result = await sendTestEmail(to);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('❌ Test email failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
