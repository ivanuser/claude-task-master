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
      console.log('❌ No session found')
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
      console.log('❌ Project not found or access denied')
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    console.log(`📋 Project found: ${project.name} (has server: ${!!project.server})`)
    console.log(`📋 Project settings:`, project.settings)

    // First check if there's a local path configured (even for server projects, they might have local copies)
    let localPath = project.settings?.localPath
    
    // If no local path configured, try to auto-detect for known projects
    if (!localPath) {
      console.log(`🔍 No local path configured, checking if this is a local Task Master project...`)
      console.log(`🔍 Project name: "${project.name}"`)
      
      // Check for various Task Master project naming patterns
      const projectNameLower = project.name.toLowerCase()
      const isTaskMasterProject = 
        projectNameLower.includes('task-master') || 
        projectNameLower.includes('taskmaster') ||
        projectNameLower.includes('tag-master') ||  // Your specific project
        projectNameLower.includes('task master')
      
      if (isTaskMasterProject && !project.server) {
        // This is a local Task Master project
        const currentProjectPath = '/home/ihoner/claude-task-master'
        try {
          const testPath = join(currentProjectPath, '.taskmaster/tasks/tasks.json')
          await readFile(testPath, 'utf-8')
          localPath = currentProjectPath
          console.log(`✅ Auto-detected Task Master project at: ${localPath}`)
        } catch (error) {
          console.log(`⚠️ Could not auto-detect at ${currentProjectPath}:`, error.message)
        }
      } else if (!project.server) {
        console.log(`❌ Not a recognized Task Master project name: "${project.name}"`)
      }
    }
    
    // If still no local path and this is a server project, use server sync
    if (!localPath && project.server) {
      console.log(`🌐 Remote server project "${project.name}" - redirecting to server sync`)
      
      // Redirect to the server sync endpoint
      const serverSyncUrl = `/api/servers/${project.serverId}/sync`
      const serverSyncResponse = await fetch(`${request.nextUrl.origin}${serverSyncUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: request.headers.get('cookie') || '',
        },
      })
      
      if (!serverSyncResponse.ok) {
        const error = await serverSyncResponse.json()
        return NextResponse.json({ 
          error: error.error || `Failed to sync from remote server: ${project.server.name}` 
        }, { status: serverSyncResponse.status })
      }
      
      const syncResult = await serverSyncResponse.json()
      console.log(`✅ Remote sync completed for project ${project.name}`, syncResult)
      
      // Update project's lastSyncAt
      await prisma.project.update({
        where: { id: projectId },
        data: { lastSyncAt: new Date() }
      })
      
      return NextResponse.json({
        success: true,
        message: `Tasks synced from remote server ${project.server.name}`,
        ...syncResult
      })
    }
    
    // If still no local path, return error
    if (!localPath) {
      console.log(`❌ Local project "${project.name}" without configured path`)
      return NextResponse.json({ 
        error: `No local path configured for "${project.name}". This appears to be a local project but needs a path configured in settings.` 
      }, { status: 400 })
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