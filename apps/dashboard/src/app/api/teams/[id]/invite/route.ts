import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const teamId = params.id
    const { email, role, message } = await request.json()

    // In a real app, this would:
    // 1. Generate a secure invitation token
    // 2. Save the invitation to the database
    // 3. Send an email with the invitation link
    // 4. Return success response

    const invitation = {
      id: Math.random().toString(36).substr(2, 9),
      teamId,
      email,
      role,
      message,
      invitedBy: '1', // Get from auth
      status: 'pending',
      token: Math.random().toString(36).substr(2, 32),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    }

    // Mock: Simulate sending email
    console.log(`[MOCK EMAIL] Sending invitation to ${email} for team ${teamId}`)
    console.log(`Invitation link: https://app.example.com/invite/${invitation.token}`)

    return NextResponse.json({ 
      invitation,
      message: 'Invitation sent successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error sending invitation:', error)
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
  }
}