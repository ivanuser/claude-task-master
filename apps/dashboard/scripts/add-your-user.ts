import { PrismaClient } from '../generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function addYourUser() {
  try {
    // CHANGE THESE VALUES TO YOUR PREFERENCES
    const email = 'your-email@example.com';  // Change this to your email
    const password = 'your-password';        // Change this to your password
    const name = 'Your Name';               // Change this to your name
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        name,
        emailVerified: new Date(),
      },
      create: {
        email,
        name,
        password: hashedPassword,
        emailVerified: new Date(),
        role: 'ADMIN',  // You can change to 'USER' if you prefer
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
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.error('\n⚠️  Note: User already exists, updated password.');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Instructions
console.log('📝 To use this script:');
console.log('1. Edit this file and change the email, password, and name variables');
console.log('2. Run: npx tsx scripts/add-your-user.ts');
console.log('\nOR run the interactive version: npx tsx scripts/create-user.ts\n');

// Uncomment the line below after editing the variables above
// addYourUser();