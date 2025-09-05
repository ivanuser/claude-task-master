const { PrismaClient } = require('../generated/prisma');

async function checkDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking database content...\n');
    
    // Check users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        settings: true,
      }
    });
    
    console.log('👥 Users in database:');
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Role: ${user.role} - Active: ${user.isActive}`);
      console.log(`    Settings: ${JSON.stringify(user.settings)}`);
    });
    
    // Check sessions
    const sessions = await prisma.session.findMany({
      include: {
        user: true
      }
    });
    
    console.log('\n🔐 Active sessions:');
    sessions.forEach(session => {
      console.log(`  - User: ${session.user.email} - Expires: ${session.expires}`);
    });
    
    // Check projects
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        tag: true,
        status: true,
        createdAt: true,
      }
    });
    
    console.log('\n📋 Projects in database:');
    projects.forEach(project => {
      console.log(`  - ${project.name} (${project.tag}) - Status: ${project.status}`);
    });
    
    // Check tasks
    const tasks = await prisma.task.findMany({
      select: {
        id: true,
        taskId: true,
        title: true,
        status: true,
        project: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log('\n✅ Tasks in database:');
    tasks.forEach(task => {
      console.log(`  - ${task.taskId}: ${task.title} - Status: ${task.status} (Project: ${task.project.name})`);
    });
    
    console.log('\n✅ Database check complete!');
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();