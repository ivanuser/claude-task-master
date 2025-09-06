import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function testProfile() {
  try {
    // Find the admin user
    const user = await prisma.user.findUnique({
      where: { email: 'admin@taskmaster.dev' },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        bio: true,
        location: true,
        timezone: true,
        emailVerified: true,
      }
    });

    console.log('Current user profile:', user);

    if (user) {
      // Try to update the profile
      const updated = await prisma.user.update({
        where: { email: 'admin@taskmaster.dev' },
        data: {
          username: 'admin',
          bio: 'Task Master Administrator',
          location: 'Remote',
          timezone: 'America/Los_Angeles',
        },
      });

      console.log('\n✅ Profile updated successfully:', updated);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

testProfile();