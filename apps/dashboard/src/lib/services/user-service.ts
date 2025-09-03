import { prisma } from "@/lib/database";
import { User, Account, Session } from "../../../generated/prisma";

export class UserService {
  // Get user by ID
  static async getUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: {
        accounts: true,
        sessions: true,
        projects: {
          include: {
            project: true,
          },
        },
      },
    });
  }

  // Get user by email
  static async getUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
      include: {
        accounts: true,
        sessions: true,
      },
    });
  }

  // Update user profile
  static async updateUser(
    id: string,
    data: {
      name?: string;
      email?: string;
      image?: string;
      settings?: any;
    }
  ): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
      include: {
        accounts: true,
        sessions: true,
      },
    });
  }

  // Get user's OAuth accounts
  static async getUserAccounts(userId: string): Promise<Account[]> {
    return prisma.account.findMany({
      where: { userId },
    });
  }

  // Get user's active sessions
  static async getUserSessions(userId: string): Promise<Session[]> {
    return prisma.session.findMany({
      where: { userId },
      orderBy: { expires: 'desc' },
    });
  }

  // Revoke user sessions (logout from all devices)
  static async revokeUserSessions(userId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { userId },
    });
  }

  // Delete user account
  static async deleteUser(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }

  // Get user statistics
  static async getUserStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        projects: {
          include: {
            project: {
              include: {
                _count: {
                  select: {
                    tasks: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            projects: true,
            sessions: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const totalTasks = user.projects.reduce(
      (acc, membership) => acc + membership.project._count.tasks,
      0
    );

    return {
      totalProjects: user._count.projects,
      totalTasks,
      totalSessions: user._count.sessions,
      memberSince: user.createdAt,
      lastUpdated: user.updatedAt,
    };
  }

  // Link OAuth account to user
  static async linkOAuthAccount(
    userId: string,
    provider: string,
    providerAccountId: string,
    accountData: Partial<Account>
  ): Promise<Account> {
    return prisma.account.create({
      data: {
        userId,
        provider,
        providerAccountId,
        type: 'oauth',
        ...accountData,
      },
    });
  }

  // Unlink OAuth account
  static async unlinkOAuthAccount(
    userId: string,
    provider: string
  ): Promise<void> {
    await prisma.account.deleteMany({
      where: {
        userId,
        provider,
      },
    });
  }

  // Search users
  static async searchUsers(
    query: string,
    limit: number = 10
  ): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}