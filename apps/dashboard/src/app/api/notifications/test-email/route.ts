import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { emailService } from '@/lib/email/email-service';

// POST /api/notifications/test-email - Send a test email notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = session.user as any;

    // Send test email using the system notification template
    const result = await emailService.sendEmail({
      to: user.email,
      subject: 'Test Email from Task Master',
      template: 'SYSTEM_NOTIFICATION' as any,
      data: {
        userName: user.name || 'there',
        notificationTitle: 'Test Email Notification',
        notificationMessage: 'This is a test email notification from Task Master. If you received this email, your email notifications are working correctly!',
        actionUrl: `${process.env.NEXTAUTH_URL}/notifications`,
      },
      userId: user.id,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to send test email'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ 
      error: 'Failed to send test email',
      details: (error as Error).message 
    }, { status: 500 });
  }
}