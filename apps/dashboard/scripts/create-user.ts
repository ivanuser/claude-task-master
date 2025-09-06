import { PrismaClient } from '../generated/prisma';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function createUser() {
  console.log('🔐 Create a new user for Task Master Dashboard\n');

  const email = await question('Email: ');
  const name = await question('Name: ');
  const password = await question('Password: ');
  const isAdmin = (await question('Make admin? (y/n): ')).toLowerCase() === 'y';

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        emailVerified: new Date(),
        role: isAdmin ? 'ADMIN' : 'USER',
        isActive: true,
        settings: {
          theme: 'light',
          notifications: true,
          defaultView: 'dashboard'
        }
      }
    });

    console.log('\n✅ User created successfully!');
    console.log('Email:', user.email);
    console.log('Name:', user.name);
    console.log('Role:', user.role);
    console.log('\nYou can now login with these credentials.');
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.error('\n❌ Error: A user with this email already exists.');
    } else {
      console.error('\n❌ Error creating user:', error.message);
    }
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

// Run if called directly
if (require.main === module) {
  createUser().catch(console.error);
}

export { createUser };