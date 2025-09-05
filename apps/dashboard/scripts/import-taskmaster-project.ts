#!/usr/bin/env tsx
/**
 * Script to import Task Master AI project and tasks into the dashboard database
 */

import { prisma } from '../src/lib/database';
import fs from 'fs/promises';
import path from 'path';

async function importTaskMasterProject() {
  console.log('🚀 Starting Task Master AI project import...');

  try {
    // 1. Read the Task Master tasks.json file
    const tasksPath = path.resolve('/home/ihoner/claude-task-master/.taskmaster/tasks/tasks.json');
    const tasksData = await fs.readFile(tasksPath, 'utf-8');
    const tasksJson = JSON.parse(tasksData);

    // Handle both legacy and new format
    // Check for the web-dashboard tag first, then fall back to master or root tasks
    const tasks = tasksJson['web-dashboard']?.tasks || tasksJson.master?.tasks || tasksJson.tasks || [];
    console.log(`📋 Found ${tasks.length} tasks to import from tag: ${tasksJson['web-dashboard'] ? 'web-dashboard' : 'master/root'}`);

    // 2. Find or create a user (use the first user in the database for now)
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ No user found. Please create an account first.');
      process.exit(1);
    }
    console.log(`👤 Using user: ${user.email}`);

    // 3. Create the project
    const project = await prisma.project.upsert({
      where: {
        tag: 'web-dashboard'
      },
      update: {
        name: 'Web Dashboard',
        description: 'Task Master AI Web Dashboard - Full-stack application for managing Task Master projects through a web interface',
        updatedAt: new Date()
      },
      create: {
        name: 'Web Dashboard',
        description: 'Task Master AI Web Dashboard - Full-stack application for managing Task Master projects through a web interface',
        tag: 'web-dashboard',
        status: 'ACTIVE',
        visibility: 'PRIVATE',
        gitUrl: 'https://github.com/ihoner/claude-task-master',
        gitProvider: 'GITHUB',
        gitBranch: 'main',
        settings: {
          notifications: true,
          autoSync: true
        },
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
            permissions: {}
          }
        }
      }
    });
    console.log(`✅ Project created/updated: ${project.name}`);

    // 4. Delete existing tasks for clean import
    await prisma.task.deleteMany({
      where: { projectId: project.id }
    });
    console.log('🗑️  Cleared existing tasks');

    // 5. Import all tasks
    let importedCount = 0;
    
    for (const task of tasks) {
      try {
        // Map task status
        let status = 'PENDING';
        if (task.status === 'done' || task.status === 'completed') status = 'DONE';
        else if (task.status === 'in-progress' || task.status === 'in_progress') status = 'IN_PROGRESS';
        else if (task.status === 'blocked') status = 'BLOCKED';
        else if (task.status === 'review') status = 'REVIEW';
        else if (task.status === 'cancelled') status = 'CANCELLED';

        // Map priority
        let priority = 'MEDIUM';
        if (task.priority === 'high' || task.priority === 'critical') priority = 'HIGH';
        else if (task.priority === 'low') priority = 'LOW';

        // Create the task (store full task data in the data field)
        await prisma.task.create({
          data: {
            projectId: project.id,
            taskId: String(task.id), // Original Task Master ID
            title: task.title || `Task ${task.id}`,
            description: task.description || '',
            status: status as any,
            priority: priority as any,
            complexity: task.complexity || null,
            details: task.details || null,
            testStrategy: task.testStrategy || null,
            data: task // Store complete task object including subtasks
          }
        });

        importedCount++;
        if (importedCount % 10 === 0) {
          console.log(`  📥 Imported ${importedCount} tasks...`);
        }
      } catch (error) {
        console.error(`  ⚠️  Failed to import task ${task.id}:`, error);
      }
    }

    console.log(`\n✅ Successfully imported ${importedCount} tasks!`);
    console.log('📊 Summary:');
    
    const taskCounts = await prisma.task.groupBy({
      by: ['status'],
      where: { projectId: project.id },
      _count: true
    });

    taskCounts.forEach(count => {
      console.log(`  - ${count.status}: ${count._count}`);
    });

    console.log('\n🎉 Import complete! You can now view the project in the dashboard.');

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importTaskMasterProject();