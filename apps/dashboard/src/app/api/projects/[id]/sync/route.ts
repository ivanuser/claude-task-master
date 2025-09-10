import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { NodeSSH } from 'node-ssh'

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
    
    // If still no local path and this is a server project, use SSH sync
    if (!localPath && project.server) {
      console.log(`🌐 Remote server project "${project.name}" - performing SSH sync`)
      
      try {
        // Connect to remote server via SSH
        const ssh = new NodeSSH()
        
        const connectionOptions: any = {
          host: project.server.host,
          port: project.server.port,
          username: project.server.username,
        }

        if (project.server.privateKey) {
          connectionOptions.privateKey = project.server.privateKey
        } else if (project.server.password) {
          connectionOptions.password = project.server.password
        } else {
          return NextResponse.json({ 
            error: 'No SSH authentication configured for server (missing both private key and password)' 
          }, { status: 400 })
        }

        console.log(`🔌 Connecting to ${project.server.host}:${project.server.port} as ${project.server.username}`)
        await ssh.connect(connectionOptions)

        // Check if .taskmaster directory exists
        const tasksFilePath = `${project.server.projectPath}/.taskmaster/tasks/tasks.json`
        console.log(`📂 Looking for tasks file at: ${tasksFilePath}`)
        
        const { stdout: fileExists } = await ssh.execCommand(`test -f ${tasksFilePath} && echo "exists" || echo "missing"`)

        if (fileExists.trim() !== 'exists') {
          ssh.dispose()
          return NextResponse.json({ 
            error: `Task Master not found at ${project.server.projectPath}/.taskmaster/` 
          }, { status: 404 })
        }

        // Read the remote tasks.json file
        const { stdout: tasksContent } = await ssh.execCommand(`cat ${tasksFilePath}`)
        ssh.dispose()
        
        if (!tasksContent) {
          return NextResponse.json({ 
            error: 'Failed to read tasks.json file from remote server' 
          }, { status: 500 })
        }

        const tasksData = JSON.parse(tasksContent)
        console.log(`📊 Found task data from remote server`)
        
        // Extract available tags for remote projects
        const availableTags = Object.keys(tasksData).filter(key => 
          typeof tasksData[key] === 'object' && 
          tasksData[key].tasks && 
          Array.isArray(tasksData[key].tasks)
        )
        
        // Import tasks using the same logic as local sync
        const result = await importTasksToDatabase(projectId, tasksData)
        
        // Update project's lastSyncAt and store available tags
        await prisma.project.update({
          where: { id: projectId },
          data: { 
            lastSyncAt: new Date(),
            settings: {
              ...(project.settings as any || {}),
              availableTags: availableTags.length > 0 ? availableTags : ['master']
            }
          }
        })

        console.log(`✅ Remote sync completed for project ${project.name}`, result)

        return NextResponse.json({
          success: true,
          message: `Tasks synced from remote server ${project.server.name}`,
          tasksImported: result.imported,
          tasksUpdated: result.updated,
          tasksSkipped: result.skipped,
          errors: result.errors
        })
        
      } catch (error: any) {
        console.error(`❌ SSH sync error for ${project.name}:`, error)
        return NextResponse.json({ 
          error: `SSH sync failed: ${error.message}` 
        }, { status: 500 })
      }
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

    // Extract available tags for local projects too
    const availableTags = Object.keys(tasksData).filter(key => 
      typeof tasksData[key] === 'object' && 
      tasksData[key].tasks && 
      Array.isArray(tasksData[key].tasks)
    )
    
    // Import tasks to database using the same logic as the file watcher
    const result = await importTasksToDatabase(projectId, tasksData)
    
    // Update project's lastSyncAt and store available tags
    await prisma.project.update({
      where: { id: projectId },
      data: { 
        lastSyncAt: new Date(),
        settings: {
          ...(project.settings as any || {}),
          availableTags: availableTags.length > 0 ? availableTags : ['master']
        }
      }
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

// Import tasks to database (handles both local and remote formats)
async function importTasksToDatabase(projectId: string, tasksData: any) {
  const result = {
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  }

  // Check if this is a tagged format (multiple tags)
  const isTaggedFormat = !Array.isArray(tasksData) && 
    Object.keys(tasksData).some(key => 
      typeof tasksData[key] === 'object' && 
      tasksData[key].tasks && 
      Array.isArray(tasksData[key].tasks)
    )

  let allTasks: any[] = []
  
  if (Array.isArray(tasksData)) {
    // Legacy format: direct array with no tags
    allTasks = tasksData.map(task => ({ ...task, tag: 'master' }))
  } else if (isTaggedFormat) {
    // Tagged format: process all tags
    const availableTags = Object.keys(tasksData).filter(key => 
      typeof tasksData[key] === 'object' && 
      tasksData[key].tasks && 
      Array.isArray(tasksData[key].tasks)
    )
    
    console.log(`📋 Found ${availableTags.length} tags: ${availableTags.join(', ')}`)
    
    // Process all tags and add tag information to each task
    for (const tagName of availableTags) {
      const tagTasks = tasksData[tagName].tasks || []
      console.log(`  - Processing tag "${tagName}" with ${tagTasks.length} tasks`)
      
      const tasksWithTag = tagTasks.map((task: any) => ({
        ...task,
        tag: tagName // Add tag to each task
      }))
      
      allTasks = allTasks.concat(tasksWithTag)
    }
  } else if (tasksData.tasks && Array.isArray(tasksData.tasks)) {
    // Legacy tagged format
    allTasks = tasksData.tasks.map((task: any) => ({ ...task, tag: 'master' }))
  } else {
    console.warn('Unknown tasks.json format:', Object.keys(tasksData))
    return result
  }

  console.log(`📊 Processing ${allTasks.length} total tasks for import`)

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
  for (const task of allTasks) {
    try {
      const dbStatus = mapStatus(task.status)
      
      // Prepare task data for storage (includes tag information)
      const taskData = {
        ...task,
        dependencies: task.dependencies || [],
        subtasks: task.subtasks || [],
        tag: task.tag || 'master' // Ensure tag is included
      }

      await prisma.task.create({
        data: {
          projectId,
          taskId: `${task.tag || 'master'}-${task.id}`, // Include tag in taskId for uniqueness
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