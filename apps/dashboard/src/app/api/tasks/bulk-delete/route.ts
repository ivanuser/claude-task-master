import { NextRequest, NextResponse } from 'next/server'

// Mock tasks storage - in a real app this would be a database
let mockTasks: any[] = []

export async function POST(request: NextRequest) {
  try {
    const { taskIds } = await request.json()
    
    if (!taskIds || !Array.isArray(taskIds)) {
      return NextResponse.json({ error: 'Invalid task IDs' }, { status: 400 })
    }
    
    // Remove tasks with matching IDs
    const initialLength = mockTasks.length
    mockTasks = mockTasks.filter(task => !taskIds.includes(task.id))
    const deletedCount = initialLength - mockTasks.length
    
    return NextResponse.json({ 
      message: `Successfully deleted ${deletedCount} tasks`,
      deletedCount 
    })
  } catch (error) {
    console.error('Error bulk deleting tasks:', error)
    return NextResponse.json({ error: 'Failed to delete tasks' }, { status: 500 })
  }
}