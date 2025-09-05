import { NextResponse } from "next/server";
import { prisma } from "@/lib/database";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
      }
    });
    
    const sessions = await prisma.session.findMany({
      select: {
        id: true,
        userId: true,
        expires: true,
      }
    });
    
    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        userId: true,
        provider: true,
      }
    });
    
    return NextResponse.json({
      users,
      sessions,
      accounts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}