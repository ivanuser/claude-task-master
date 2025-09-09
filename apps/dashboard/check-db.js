const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const projectId = 'cmfbx4qwd0000e9r2qihadf2g';
  
  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: {
      taskId: true,
      title: true,
      status: true
    }
  });
  
  console.log(`Found ${tasks.length} tasks for project ${projectId}:`);
  
  const statusCounts = {};
  tasks.forEach(task => {
    statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
  });
  
  console.log('Status counts:', statusCounts);
  console.log('\nTask list:');
  tasks.forEach(task => {
    console.log(`  ${task.taskId}: ${task.title} - ${task.status}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());