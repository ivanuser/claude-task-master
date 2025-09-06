import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import crypto from 'crypto';

// In production, you'd use a proper email service like SendGrid, AWS SES, etc.
async function sendVerificationEmail(email: string, token: string) {
  // This is a placeholder. In production, implement actual email sending
  console.log(`Sending verification email to ${email} with token: ${token}`);
  
  // Example verification URL
  const verificationUrl = `${process.env.NEXTAUTH_URL}/api/user/verify-email?token=${token}`;
  console.log(`Verification URL: ${verificationUrl}`);
  
  // TODO: Implement actual email sending
  // await emailService.send({
  //   to: email,
  //   subject: 'Verify your email address',
  //   html: `Click <a href="${verificationUrl}">here</a> to verify your email.`
  // });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if email is already verified
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { emailVerified: true },
    });

    if (user?.emailVerified) {
      return NextResponse.json(
        { message: 'Email is already verified' },
        { status: 200 }
      );
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    await prisma.verificationToken.create({
      data: {
        identifier: session.user.email,
        token,
        expires,
      },
    });

    // Send verification email
    await sendVerificationEmail(session.user.email, token);

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully',
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    );
  }
}