import { 
  Project, 
  ProjectSettings, 
  ProjectMember, 
  ProjectMilestone,
  ProjectActivity,
  ProjectTemplate,
  ProjectStatistics,
  ProjectDeployment,
  ProjectActivityType,
  ProjectRole,
  hasProjectPermission
} from '@/types/project'
import { Team, TeamMember } from '@/types/team'
import { supabase } from '@/lib/supabase'
import { getIndexedDBService } from '@/lib/offline/indexed-db-service'
import { v4 as uuidv4 } from 'uuid'

export class ProjectService {
  private static instance: ProjectService
  private dbService = getIndexedDBService()

  private constructor() {}

  static getInstance(): ProjectService {
    if (!ProjectService.instance) {
      ProjectService.instance = new ProjectService()
    }
    return ProjectService.instance
  }

  // Project CRUD Operations
  async createProject(data: Partial<Project>, teamId: string, userId: string): Promise<Project> {
    try {
      const project: Project = {
        id: uuidv4(),
        name: data.name || 'Untitled Project',
        description: data.description,
        slug: this.generateSlug(data.name || 'untitled'),
        status: data.status || 'planning',
        visibility: data.visibility || 'team',
        priority: data.priority || 'medium',
        teamId,
        ownerId: userId,
        owner: {
          id: userId,
          name: '',
          email: '',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        gitProvider: data.gitProvider || null,
        gitUrl: data.gitUrl || null,
        gitBranch: data.gitBranch || null,
        isTaskMasterProject: data.isTaskMasterProject || false,
        hasCustomRules: data.hasCustomRules || false,
        syncEnabled: data.syncEnabled || true,
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        settings: data.settings || this.getDefaultSettings(),
        metrics: this.getDefaultMetrics(),
        tags: data.tags || [],
        archived: false,
        memberCount: 1,
        lastActivity: null,
        ...data,
      }

      // Try online first
      const { data: createdProject, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single()

      if (error) {
        console.error('Failed to create project online:', error)
        // Fall back to offline
        await this.dbService.cacheData('projects', project)
        await this.dbService.addToSyncQueue({
          type: 'create',
          entity: 'projects',
          data: project,
        })
        return project
      }

      // Cache for offline access
      await this.dbService.cacheData('projects', createdProject)
      
      // Log activity
      await this.logActivity(createdProject.id, userId, 'project_created', {
        projectName: createdProject.name
      })

      return createdProject
    } catch (error) {
      console.error('Error creating project:', error)
      throw new Error('Failed to create project')
    }
  }

  async getProject(projectId: string): Promise<Project | null> {
    try {
      // Try online first
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          owner:users!projects_owner_id_fkey(id, name, email, avatar),
          team:teams!projects_team_id_fkey(id, name, avatar)
        `)
        .eq('id', projectId)
        .single()

      if (!error && data) {
        // Update cache
        await this.dbService.cacheData('projects', data)
        return data
      }

      // Fall back to offline cache
      const cachedProject = await this.dbService.getCachedData('projects', projectId)
      return cachedProject as Project | null
    } catch (error) {
      console.error('Error fetching project:', error)
      
      // Try offline cache
      const cachedProject = await this.dbService.getCachedData('projects', projectId)
      return cachedProject as Project | null
    }
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    try {
      // Try online first
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          owner:users!projects_owner_id_fkey(id, name, email, avatar),
          team:teams!projects_team_id_fkey(id, name, avatar),
          project_members!inner(user_id)
        `)
        .or(`owner_id.eq.${userId},project_members.user_id.eq.${userId}`)
        .order('updated_at', { ascending: false })

      if (!error && data) {
        // Update cache
        for (const project of data) {
          await this.dbService.cacheData('projects', project)
        }
        return data
      }

      // Fall back to offline cache
      return await this.getOfflineProjects(userId)
    } catch (error) {
      console.error('Error fetching user projects:', error)
      return await this.getOfflineProjects(userId)
    }
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    try {
      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      // Try online first
      const { data, error } = await supabase
        .from('projects')
        .update(updatedData)
        .eq('id', projectId)
        .select()
        .single()

      if (error) {
        console.error('Failed to update project online:', error)
        // Queue for sync
        await this.dbService.addToSyncQueue({
          type: 'update',
          entity: 'projects',
          entityId: projectId,
          data: updatedData,
        })
        
        // Update local cache
        const cachedProject = await this.dbService.getCachedData('projects', projectId)
        if (cachedProject) {
          const updated = { ...cachedProject, ...updatedData }
          await this.dbService.cacheData('projects', updated)
          return updated as Project
        }
        throw error
      }

      // Update cache
      await this.dbService.cacheData('projects', data)
      
      // Log activity
      await this.logActivity(projectId, '', 'project_updated', { updates })

      return data
    } catch (error) {
      console.error('Error updating project:', error)
      throw new Error('Failed to update project')
    }
  }

  async deleteProject(projectId: string): Promise<boolean> {
    try {
      // Try online first
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) {
        console.error('Failed to delete project online:', error)
        // Queue for sync
        await this.dbService.addToSyncQueue({
          type: 'delete',
          entity: 'projects',
          entityId: projectId,
          data: { id: projectId },
        })
      }

      // Remove from cache
      await this.dbService.removeFromCache('projects', projectId)
      
      return true
    } catch (error) {
      console.error('Error deleting project:', error)
      return false
    }
  }

  async archiveProject(projectId: string): Promise<Project> {
    return this.updateProject(projectId, { 
      archived: true,
      status: 'archived'
    })
  }

  // Project Members Management
  async addProjectMember(
    projectId: string, 
    userId: string, 
    role: ProjectRole = 'viewer'
  ): Promise<ProjectMember> {
    try {
      const member: Partial<ProjectMember> = {
        id: uuidv4(),
        projectId,
        userId,
        role,
        joinedAt: new Date().toISOString(),
        tasksAssigned: 0,
        tasksCompleted: 0,
        permissions: this.getRolePermissions(role),
      }

      const { data, error } = await supabase
        .from('project_members')
        .insert(member)
        .select(`
          *,
          user:users!project_members_user_id_fkey(*)
        `)
        .single()

      if (error) {
        console.error('Failed to add project member online:', error)
        // Queue for sync
        await this.dbService.addToSyncQueue({
          type: 'create',
          entity: 'project_members',
          data: member,
        })
        return member as ProjectMember
      }

      // Update project member count
      await this.updateProjectMemberCount(projectId)
      
      // Log activity
      await this.logActivity(projectId, userId, 'member_added', {
        memberId: userId,
        role
      })

      return data
    } catch (error) {
      console.error('Error adding project member:', error)
      throw new Error('Failed to add project member')
    }
  }

  async updateProjectMember(
    projectId: string,
    userId: string,
    updates: { role?: ProjectRole; permissions?: any[] }
  ): Promise<ProjectMember> {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .update({
          ...updates,
          permissions: updates.role ? this.getRolePermissions(updates.role) : updates.permissions,
        })
        .match({ project_id: projectId, user_id: userId })
        .select()
        .single()

      if (error) {
        console.error('Failed to update project member online:', error)
        // Queue for sync
        await this.dbService.addToSyncQueue({
          type: 'update',
          entity: 'project_members',
          entityId: `${projectId}_${userId}`,
          data: updates,
        })
        throw error
      }

      // Log activity
      if (updates.role) {
        await this.logActivity(projectId, userId, 'member_role_changed', {
          newRole: updates.role
        })
      }

      return data
    } catch (error) {
      console.error('Error updating project member:', error)
      throw new Error('Failed to update project member')
    }
  }

  async removeProjectMember(projectId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .match({ project_id: projectId, user_id: userId })

      if (error) {
        console.error('Failed to remove project member online:', error)
        // Queue for sync
        await this.dbService.addToSyncQueue({
          type: 'delete',
          entity: 'project_members',
          entityId: `${projectId}_${userId}`,
          data: { projectId, userId },
        })
        return false
      }

      // Update project member count
      await this.updateProjectMemberCount(projectId)
      
      // Log activity
      await this.logActivity(projectId, userId, 'member_removed', {
        memberId: userId
      })

      return true
    } catch (error) {
      console.error('Error removing project member:', error)
      return false
    }
  }

  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          *,
          user:users!project_members_user_id_fkey(*)
        `)
        .eq('project_id', projectId)
        .order('joined_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch project members online:', error)
        // Return empty array or cached data
        return []
      }

      return data
    } catch (error) {
      console.error('Error fetching project members:', error)
      return []
    }
  }

  // Milestones Management
  async createMilestone(milestone: Partial<ProjectMilestone>): Promise<ProjectMilestone> {
    try {
      const newMilestone: ProjectMilestone = {
        id: uuidv4(),
        projectId: milestone.projectId!,
        name: milestone.name || 'New Milestone',
        description: milestone.description,
        dueDate: milestone.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        progress: 0,
        tasksTotal: 0,
        tasksCompleted: 0,
        status: 'upcoming',
        ...milestone,
      }

      const { data, error } = await supabase
        .from('project_milestones')
        .insert(newMilestone)
        .select()
        .single()

      if (error) {
        console.error('Failed to create milestone online:', error)
        // Queue for sync
        await this.dbService.addToSyncQueue({
          type: 'create',
          entity: 'project_milestones',
          data: newMilestone,
        })
        return newMilestone
      }

      // Log activity
      await this.logActivity(milestone.projectId!, '', 'milestone_created', {
        milestoneName: newMilestone.name
      })

      return data
    } catch (error) {
      console.error('Error creating milestone:', error)
      throw new Error('Failed to create milestone')
    }
  }

  async updateMilestone(milestoneId: string, updates: Partial<ProjectMilestone>): Promise<ProjectMilestone> {
    try {
      // Calculate status based on progress
      if (updates.tasksCompleted !== undefined && updates.tasksTotal !== undefined) {
        updates.progress = updates.tasksTotal > 0 
          ? (updates.tasksCompleted / updates.tasksTotal) * 100 
          : 0
        
        if (updates.progress >= 100) {
          updates.status = 'completed'
          updates.completedAt = new Date().toISOString()
        } else if (updates.progress > 0) {
          updates.status = 'in-progress'
        }
      }

      const { data, error } = await supabase
        .from('project_milestones')
        .update(updates)
        .eq('id', milestoneId)
        .select()
        .single()

      if (error) {
        console.error('Failed to update milestone online:', error)
        // Queue for sync
        await this.dbService.addToSyncQueue({
          type: 'update',
          entity: 'project_milestones',
          entityId: milestoneId,
          data: updates,
        })
        throw error
      }

      // Log activity if milestone completed
      if (updates.status === 'completed') {
        await this.logActivity(data.project_id, '', 'milestone_completed', {
          milestoneName: data.name
        })
      }

      return data
    } catch (error) {
      console.error('Error updating milestone:', error)
      throw new Error('Failed to update milestone')
    }
  }

  async getProjectMilestones(projectId: string): Promise<ProjectMilestone[]> {
    try {
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true })

      if (error) {
        console.error('Failed to fetch milestones online:', error)
        return []
      }

      return data
    } catch (error) {
      console.error('Error fetching milestones:', error)
      return []
    }
  }

  // Activity Logging
  async logActivity(
    projectId: string,
    userId: string,
    type: ProjectActivityType,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const activity = {
        id: uuidv4(),
        project_id: projectId,
        user_id: userId,
        type,
        action: this.getActivityAction(type),
        metadata,
        timestamp: new Date().toISOString(),
        is_important: this.isImportantActivity(type),
      }

      const { error } = await supabase
        .from('project_activities')
        .insert(activity)

      if (error) {
        console.error('Failed to log activity online:', error)
        // Queue for sync
        await this.dbService.addToSyncQueue({
          type: 'create',
          entity: 'project_activities',
          data: activity,
        })
      }

      // Update project's last activity
      await this.updateProject(projectId, { 
        lastActivity: activity.timestamp 
      })
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  }

  async getProjectActivities(
    projectId: string,
    limit: number = 50
  ): Promise<ProjectActivity[]> {
    try {
      const { data, error } = await supabase
        .from('project_activities')
        .select(`
          *,
          user:users!project_activities_user_id_fkey(id, name, email, avatar)
        `)
        .eq('project_id', projectId)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Failed to fetch activities online:', error)
        return []
      }

      return data
    } catch (error) {
      console.error('Error fetching activities:', error)
      return []
    }
  }

  // Statistics and Metrics
  async updateProjectMetrics(projectId: string): Promise<void> {
    try {
      // Fetch current project data
      const project = await this.getProject(projectId)
      if (!project) return

      // Calculate metrics
      const metrics = {
        completionRate: project.totalTasks > 0 
          ? (project.completedTasks / project.totalTasks) * 100 
          : 0,
        velocity: this.calculateVelocity(project),
        averageTaskTime: await this.calculateAverageTaskTime(projectId),
        burndownRate: this.calculateBurndownRate(project),
        healthScore: this.calculateHealthScore(project),
        lastCalculated: new Date().toISOString(),
      }

      // Update project metrics
      await this.updateProject(projectId, { metrics })
    } catch (error) {
      console.error('Error updating project metrics:', error)
    }
  }

  async getProjectStatistics(
    projectId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'weekly'
  ): Promise<ProjectStatistics> {
    try {
      // This would typically aggregate data from various sources
      // For now, returning mock data structure
      return {
        projectId,
        period,
        tasksCreated: 0,
        tasksCompleted: 0,
        averageCompletionTime: 0,
        teamProductivity: 0,
        activeMembers: 0,
        commits: 0,
        deployments: 0,
        issues: {
          opened: 0,
          closed: 0,
          averageResolutionTime: 0,
        },
      }
    } catch (error) {
      console.error('Error fetching project statistics:', error)
      throw error
    }
  }

  // Git Integration
  async connectGitRepository(
    projectId: string,
    provider: 'github' | 'gitlab' | 'bitbucket',
    url: string,
    accessToken?: string
  ): Promise<Project> {
    try {
      const repository = {
        provider,
        url,
        defaultBranch: 'main',
        connected: true,
        lastSync: new Date().toISOString(),
        accessToken,
      }

      const updated = await this.updateProject(projectId, {
        gitProvider: provider,
        gitUrl: url,
        gitBranch: 'main',
        repository,
      })

      // Log activity
      await this.logActivity(projectId, '', 'repository_connected', {
        provider,
        url
      })

      return updated
    } catch (error) {
      console.error('Error connecting Git repository:', error)
      throw new Error('Failed to connect Git repository')
    }
  }

  async syncWithGitRepository(projectId: string): Promise<boolean> {
    try {
      const project = await this.getProject(projectId)
      if (!project || !project.repository) {
        throw new Error('No repository connected')
      }

      // This would typically call the actual Git provider API
      // For now, just updating the last sync time
      await this.updateProject(projectId, {
        repository: {
          ...project.repository,
          lastSync: new Date().toISOString(),
        },
      })

      return true
    } catch (error) {
      console.error('Error syncing with Git repository:', error)
      return false
    }
  }

  // Template Management
  async getProjectTemplates(): Promise<ProjectTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .order('popularity', { ascending: false })

      if (error) {
        console.error('Failed to fetch templates online:', error)
        return this.getDefaultTemplates()
      }

      return data
    } catch (error) {
      console.error('Error fetching templates:', error)
      return this.getDefaultTemplates()
    }
  }

  async createProjectFromTemplate(
    templateId: string,
    projectData: Partial<Project>,
    teamId: string,
    userId: string
  ): Promise<Project> {
    try {
      const template = await this.getProjectTemplate(templateId)
      if (!template) {
        throw new Error('Template not found')
      }

      // Create project with template settings
      const project = await this.createProject({
        ...projectData,
        settings: {
          ...this.getDefaultSettings(),
          ...template.structure.defaultSettings,
          workflowStages: template.structure.workflowStages,
        },
      }, teamId, userId)

      // Create milestones from template
      for (const milestone of template.structure.milestones) {
        await this.createMilestone({
          ...milestone,
          projectId: project.id,
        })
      }

      return project
    } catch (error) {
      console.error('Error creating project from template:', error)
      throw error
    }
  }

  // Helper Methods
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  private getDefaultSettings(): ProjectSettings {
    return {
      autoAssignTasks: false,
      requireApproval: false,
      allowGuestAccess: false,
      workflowStages: [
        { id: '1', name: 'Backlog', color: '#6B7280', order: 1 },
        { id: '2', name: 'Todo', color: '#3B82F6', order: 2 },
        { id: '3', name: 'In Progress', color: '#F59E0B', order: 3 },
        { id: '4', name: 'Review', color: '#8B5CF6', order: 4 },
        { id: '5', name: 'Done', color: '#10B981', order: 5, isFinal: true },
      ],
      integrations: {},
      notifications: {
        onTaskCreated: true,
        onTaskCompleted: true,
        onMilestoneReached: true,
        onDeployment: false,
        onMemberJoined: true,
        onMemberLeft: true,
      },
    }
  }

  private getDefaultMetrics(): ProjectMetrics {
    return {
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      overdueTasks: 0,
      completionRate: 0,
      velocity: 0,
      averageTaskTime: 0,
      burndownRate: 0,
      healthScore: 100,
      lastCalculated: new Date().toISOString(),
    }
  }

  private getRolePermissions(role: ProjectRole) {
    const permissions = {
      owner: [
        { resource: 'tasks', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'members', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'settings', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'repository', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'deployments', actions: ['create', 'read', 'update', 'delete'] },
      ],
      admin: [
        { resource: 'tasks', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'members', actions: ['create', 'read', 'update'] },
        { resource: 'settings', actions: ['read', 'update'] },
        { resource: 'repository', actions: ['read', 'update'] },
        { resource: 'deployments', actions: ['create', 'read', 'update'] },
      ],
      developer: [
        { resource: 'tasks', actions: ['create', 'read', 'update'] },
        { resource: 'members', actions: ['read'] },
        { resource: 'settings', actions: ['read'] },
        { resource: 'repository', actions: ['read', 'update'] },
        { resource: 'deployments', actions: ['read'] },
      ],
      designer: [
        { resource: 'tasks', actions: ['create', 'read', 'update'] },
        { resource: 'members', actions: ['read'] },
        { resource: 'settings', actions: ['read'] },
        { resource: 'repository', actions: ['read'] },
        { resource: 'deployments', actions: ['read'] },
      ],
      tester: [
        { resource: 'tasks', actions: ['read', 'update'] },
        { resource: 'members', actions: ['read'] },
        { resource: 'settings', actions: ['read'] },
        { resource: 'repository', actions: ['read'] },
        { resource: 'deployments', actions: ['read'] },
      ],
      viewer: [
        { resource: 'tasks', actions: ['read'] },
        { resource: 'members', actions: ['read'] },
        { resource: 'settings', actions: ['read'] },
        { resource: 'repository', actions: ['read'] },
        { resource: 'deployments', actions: ['read'] },
      ],
    }
    
    return permissions[role] || permissions.viewer
  }

  private async getOfflineProjects(userId: string): Promise<Project[]> {
    // Get all cached projects and filter by user
    const cachedProjects = await this.dbService.getAllCachedData('projects')
    return cachedProjects.filter((project: any) => 
      project.ownerId === userId || 
      project.memberIds?.includes(userId)
    ) as Project[]
  }

  private async updateProjectMemberCount(projectId: string): Promise<void> {
    try {
      const members = await this.getProjectMembers(projectId)
      await this.updateProject(projectId, { memberCount: members.length })
    } catch (error) {
      console.error('Error updating member count:', error)
    }
  }

  private getActivityAction(type: ProjectActivityType): string {
    const actions: Record<ProjectActivityType, string> = {
      project_created: 'created the project',
      project_updated: 'updated the project',
      task_created: 'created a task',
      task_completed: 'completed a task',
      task_assigned: 'assigned a task',
      milestone_created: 'created a milestone',
      milestone_completed: 'completed a milestone',
      member_added: 'added a member',
      member_removed: 'removed a member',
      member_role_changed: 'changed member role',
      repository_connected: 'connected a repository',
      deployment_triggered: 'triggered a deployment',
      setting_changed: 'changed settings',
    }
    return actions[type] || 'performed an action'
  }

  private isImportantActivity(type: ProjectActivityType): boolean {
    const importantTypes: ProjectActivityType[] = [
      'project_created',
      'milestone_completed',
      'member_added',
      'member_removed',
      'repository_connected',
      'deployment_triggered',
    ]
    return importantTypes.includes(type)
  }

  private calculateVelocity(project: Project): number {
    // Simple velocity calculation based on completion rate over time
    const daysSinceCreation = Math.max(1, 
      (Date.now() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    return project.completedTasks / daysSinceCreation
  }

  private async calculateAverageTaskTime(projectId: string): Promise<number> {
    // This would typically query task completion times
    // For now, returning a default value
    return 24 // hours
  }

  private calculateBurndownRate(project: Project): number {
    // Calculate how quickly tasks are being completed
    if (project.totalTasks === 0) return 0
    return (project.completedTasks / project.totalTasks) * 100
  }

  private calculateHealthScore(project: Project): number {
    let score = 100
    
    // Deduct points for overdue tasks
    if (project.overdueTasks && project.overdueTasks > 0) {
      score -= Math.min(30, project.overdueTasks * 5)
    }
    
    // Deduct points for low velocity
    const velocity = this.calculateVelocity(project)
    if (velocity < 0.5) {
      score -= 20
    }
    
    // Deduct points for stale project
    if (project.lastActivity) {
      const daysSinceActivity = (Date.now() - new Date(project.lastActivity).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceActivity > 7) {
        score -= Math.min(20, daysSinceActivity)
      }
    }
    
    return Math.max(0, score)
  }

  private async getProjectTemplate(templateId: string): Promise<ProjectTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (error) {
        const templates = this.getDefaultTemplates()
        return templates.find(t => t.id === templateId) || null
      }

      return data
    } catch (error) {
      console.error('Error fetching template:', error)
      return null
    }
  }

  private getDefaultTemplates(): ProjectTemplate[] {
    return [
      {
        id: 'software-dev',
        name: 'Software Development',
        description: 'Standard software development project with agile workflow',
        category: 'software',
        icon: '💻',
        color: '#3B82F6',
        structure: {
          milestones: [
            { name: 'MVP Release', dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
            { name: 'Beta Release', dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() },
            { name: 'Production Release', dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() },
          ],
          workflowStages: [
            { id: '1', name: 'Backlog', color: '#6B7280', order: 1 },
            { id: '2', name: 'Sprint Planning', color: '#3B82F6', order: 2 },
            { id: '3', name: 'In Development', color: '#F59E0B', order: 3 },
            { id: '4', name: 'Code Review', color: '#8B5CF6', order: 4 },
            { id: '5', name: 'Testing', color: '#EC4899', order: 5 },
            { id: '6', name: 'Done', color: '#10B981', order: 6, isFinal: true },
          ],
          defaultSettings: {
            autoAssignTasks: true,
            requireApproval: true,
          },
          taskTemplates: [],
        },
        popularity: 100,
        isRecommended: true,
      },
    ]
  }
}

export const projectService = ProjectService.getInstance()