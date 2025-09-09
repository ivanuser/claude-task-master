import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { readFile } from 'fs/promises'
import { join } from 'path'

// Manual sync endpoint to sync tasks from filesystem to database
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🔄 Manual sync request for project ${params.id}`)

    // Get session to authenticate the user
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = params.id
    const userId = session.user.id

    // Get project and verify user has access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          // User is a member
          { members: { some: { userId } } },
          // User has access through visibility settings (if needed)
        ]
      },
      include: {
        server: true,
        members: {
          where: { userId },
          select: { role: true, permissions: true }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Check if this is a remote server project or local project
    if (project.server) {
      return NextResponse.json({ 
        error: 'This is a remote server project. Sync from remote servers is not yet implemented.' 
      }, { status: 400 })
    }
    
    // For local projects, check if path is configured
    let localPath = project.settings?.localPath
    
    if (!localPath) {
      // Only try auto-detect for local projects without configured path
      // Try current Task Master project first (most likely case)
      const currentProjectPath = '/home/ihoner/claude-task-master'
      try {
        const testPath = join(currentProjectPath, '.taskmaster/tasks/tasks.json')
        await readFile(testPath, 'utf-8')
        localPath = currentProjectPath
        console.log(`🔍 Auto-detected current Task Master project at: ${localPath}`)
      } catch {
        return NextResponse.json({ 
          error: 'No local path configured for this project. Please configure it in project settings.' 
        }, { status: 400 })
      }
    }

    console.log(`📁 Syncing tasks from ${localPath}`)

    // Try to read the tasks.json file
    const tasksJsonPath = join(localPath, '.taskmaster/tasks/tasks.json')
    
    let tasksData
    try {
      const tasksContent = await readFile(tasksJsonPath, 'utf-8')
      tasksData = JSON.parse(tasksContent)
    } catch (error: any) {
      console.error(`❌ Failed to read tasks file: ${error.message}`)
      return NextResponse.json({ 
        error: `Failed to read tasks file: ${error.message}. Make sure the project has Task Master initialized.` 
      }, { status: 400 })
    }

    // Import tasks to database using the same logic as the file watcher
    const result = await importTasksToDatabase(projectId, tasksData)
    
    // Update project's lastSyncAt
    await prisma.project.update({
      where: { id: projectId },
      data: { lastSyncAt: new Date() }
    })

    console.log(`✅ Manual sync completed for project ${projectId}`, result)

    return NextResponse.json({
      success: true,
      message: 'Tasks synced successfully',
      tasksImported: result.imported,
      tasksUpdated: result.updated,
      tasksSkipped: result.skipped,
      errors: result.errors
    })

  } catch (error: any) {
    console.error('❌ Manual sync error:', error)
    return NextResponse.json({ 
      error: `Sync failed: ${error.message}` 
    }, { status: 500 })
  }
}

// Import tasks to database (same logic as file watcher)
async function importTasksToDatabase(projectId: string, tasksData: any) {
  const result = {
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  }

  // Handle both legacy format and tagged format
  let tasks: any[] = []
  
  if (Array.isArray(tasksData)) {
    // Legacy format: direct array
    tasks = tasksData
  } else if (tasksData.master && Array.isArray(tasksData.master.tasks)) {
    // Tagged format: use master tag
    tasks = tasksData.master.tasks
  } else if (tasksData.tasks && Array.isArray(tasksData.tasks)) {
    // Legacy tagged format
    tasks = tasksData.tasks
  } else {
    console.warn('Unknown tasks.json format:', Object.keys(tasksData))
    return result
  }

  console.log(`📊 Processing ${tasks.length} tasks for import`)

  // Helper function to map status
  const mapStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'PENDING',
      'in-progress': 'IN_PROGRESS',
      'done': 'DONE',
      'cancelled': 'CANCELLED',
      'blocked': 'BLOCKED',
      'deferred': 'DEFERRED',
      'review': 'REVIEW'
    }
    return statusMap[status?.toLowerCase()] || 'PENDING'
  }

  // Helper function to map priority
  const mapPriority = (priority: string) => {
    const priorityMap: Record<string, string> = {
      'low': 'LOW',
      'medium': 'MEDIUM', 
      'high': 'HIGH',
      'critical': 'CRITICAL'
    }
    return priorityMap[priority?.toLowerCase()] || 'MEDIUM'
  }

  // Clear existing tasks for this project
  await prisma.task.deleteMany({
    where: { projectId }
  })

  // Import all tasks
  for (const task of tasks) {
    try {
      const dbStatus = mapStatus(task.status)
      
      // Prepare task data for storage
      const taskData = {
        ...task,
        dependencies: task.dependencies || [],
        subtasks: task.subtasks || []
      }

      await prisma.task.create({
        data: {
          projectId,
          taskId: String(task.id),
          title: task.title || `Task ${task.id}`,
          description: task.description || '',
          status: dbStatus,
          priority: mapPriority(task.priority),
          complexity: task.complexity || null,
          details: task.details || null,
          testStrategy: task.testStrategy || null,
          data: taskData // Store complete task data as JSON
        }
      })

      result.imported++
    } catch (error: any) {
      console.error(`❌ Failed to import task ${task.id}:`, error.message)
      result.errors++
    }
  }

  return result
}