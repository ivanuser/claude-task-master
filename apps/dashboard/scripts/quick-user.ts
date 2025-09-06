import { PrismaClient } from '../generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function quickCreateUser() {
  try {
    // Hash the password - you can change this!
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await prisma.user.upsert({
      where: { email: 'admin@taskmaster.dev' },
      update: {
        password: hashedPassword,
        emailVerified: new Date(),
      },
      create: {
        email: 'admin@taskmaster.dev',
        name: 'Task Master Admin',
        password: hashedPassword,
        emailVerified: new Date(),
        role: 'ADMIN',
        isActive: true,
        settings: {
          theme: 'light',
          notifications: true,
          defaultView: 'dashboard'
        }
      }
    });

    console.log('\n✅ User created/updated successfully!');
    console.log('📧 Email:', user.email);
    console.log('🔑 Password:', password);
    console.log('👤 Name:', user.name);
    console.log('🛡️  Role:', user.role);
    console.log('\nYou can now login with these credentials.');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickCreateUser();