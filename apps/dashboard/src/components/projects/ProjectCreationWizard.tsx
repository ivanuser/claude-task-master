import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  Code,
  FileText,
  FolderOpen,
  GitBranch,
  Globe,
  Lock,
  Package,
  Plus,
  Settings,
  Sparkles,
  Target,
  Users,
  X,
  Zap,
  Github,
  Gitlab,
  FileCode,
  Briefcase,
  Palette,
  Database,
  Cloud,
  Smartphone,
  Monitor,
  ShoppingCart,
  BookOpen,
  Gamepad,
  Music,
  Heart,
} from 'lucide-react'
import { Project, ProjectTemplate, ProjectStatus } from '@/types/project'
import { projectService } from '@/services/project-service'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface WizardStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
}

const wizardSteps: WizardStep[] = [
  {
    id: 'template',
    title: 'Choose Template',
    description: 'Select a template or start from scratch',
    icon: <Package className="h-5 w-5" />,
  },
  {
    id: 'basics',
    title: 'Basic Information',
    description: 'Name and describe your project',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: 'repository',
    title: 'Repository Setup',
    description: 'Connect to your Git repository',
    icon: <GitBranch className="h-5 w-5" />,
  },
  {
    id: 'team',
    title: 'Team & Permissions',
    description: 'Configure team access',
    icon: <Users className="h-5 w-5" />,
  },
  {
    id: 'settings',
    title: 'Project Settings',
    description: 'Configure project preferences',
    icon: <Settings className="h-5 w-5" />,
  },
]

const projectTemplates: ProjectTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start with a clean slate',
    category: 'general',
    icon: '📄',
    color: '#6B7280',
    structure: {
      milestones: [],
      workflowStages: [],
      defaultSettings: {},
      taskTemplates: [],
    },
    popularity: 0,
    isRecommended: false,
  },
  {
    id: 'software-dev',
    name: 'Software Development',
    description: 'Agile software development workflow',
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
  {
    id: 'web-design',
    name: 'Web Design',
    description: 'Design and UX workflow',
    category: 'design',
    icon: '🎨',
    color: '#EC4899',
    structure: {
      milestones: [
        { name: 'Wireframes', dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() },
        { name: 'Design System', dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
        { name: 'Final Mockups', dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString() },
      ],
      workflowStages: [
        { id: '1', name: 'Research', color: '#6B7280', order: 1 },
        { id: '2', name: 'Wireframing', color: '#3B82F6', order: 2 },
        { id: '3', name: 'Design', color: '#F59E0B', order: 3 },
        { id: '4', name: 'Review', color: '#8B5CF6', order: 4 },
        { id: '5', name: 'Approved', color: '#10B981', order: 5, isFinal: true },
      ],
      defaultSettings: {
        autoAssignTasks: false,
        requireApproval: true,
      },
      taskTemplates: [],
    },
    popularity: 85,
    isRecommended: false,
  },
  {
    id: 'mobile-app',
    name: 'Mobile App',
    description: 'iOS and Android app development',
    category: 'mobile',
    icon: '📱',
    color: '#10B981',
    structure: {
      milestones: [
        { name: 'Alpha Release', dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString() },
        { name: 'Beta Testing', dueDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString() },
        { name: 'App Store Launch', dueDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString() },
      ],
      workflowStages: [
        { id: '1', name: 'Planning', color: '#6B7280', order: 1 },
        { id: '2', name: 'Development', color: '#3B82F6', order: 2 },
        { id: '3', name: 'Testing', color: '#F59E0B', order: 3 },
        { id: '4', name: 'Deployment', color: '#8B5CF6', order: 4 },
        { id: '5', name: 'Released', color: '#10B981', order: 5, isFinal: true },
      ],
      defaultSettings: {
        autoAssignTasks: true,
        requireApproval: false,
      },
      taskTemplates: [],
    },
    popularity: 75,
    isRecommended: false,
  },
  {
    id: 'marketing',
    name: 'Marketing Campaign',
    description: 'Marketing and content workflow',
    category: 'marketing',
    icon: '📢',
    color: '#F59E0B',
    structure: {
      milestones: [
        { name: 'Campaign Planning', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
        { name: 'Content Creation', dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString() },
        { name: 'Launch', dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
      ],
      workflowStages: [
        { id: '1', name: 'Ideas', color: '#6B7280', order: 1 },
        { id: '2', name: 'Planning', color: '#3B82F6', order: 2 },
        { id: '3', name: 'Creating', color: '#F59E0B', order: 3 },
        { id: '4', name: 'Review', color: '#8B5CF6', order: 4 },
        { id: '5', name: 'Published', color: '#10B981', order: 5, isFinal: true },
      ],
      defaultSettings: {
        autoAssignTasks: false,
        requireApproval: true,
      },
      taskTemplates: [],
    },
    popularity: 70,
    isRecommended: false,
  },
]

export function ProjectCreationWizard() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [isCreating, setIsCreating] = useState(false)

  // Form data
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank')
  const [projectData, setProjectData] = useState<Partial<Project>>({
    name: '',
    description: '',
    status: 'planning',
    visibility: 'team',
    priority: 'medium',
    tags: [],
    gitProvider: null,
    gitUrl: null,
    gitBranch: 'main',
    isTaskMasterProject: false,
    hasCustomRules: false,
    syncEnabled: true,
    settings: {
      autoAssignTasks: false,
      requireApproval: false,
      allowGuestAccess: false,
      workflowStages: [],
      integrations: {},
      notifications: {
        onTaskCreated: true,
        onTaskCompleted: true,
        onMilestoneReached: true,
        onDeployment: false,
        onMemberJoined: true,
        onMemberLeft: true,
      },
    },
  })

  const [newTag, setNewTag] = useState('')
  const [teamId, setTeamId] = useState('')
  const [inviteEmails, setInviteEmails] = useState<string[]>([])
  const [newInviteEmail, setNewInviteEmail] = useState('')

  const handleNext = () => {
    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleAddTag = () => {
    if (newTag && !projectData.tags?.includes(newTag)) {
      setProjectData({
        ...projectData,
        tags: [...(projectData.tags || []), newTag],
      })
      setNewTag('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setProjectData({
      ...projectData,
      tags: projectData.tags?.filter(t => t !== tag) || [],
    })
  }

  const handleAddInvite = () => {
    if (newInviteEmail && !inviteEmails.includes(newInviteEmail)) {
      setInviteEmails([...inviteEmails, newInviteEmail])
      setNewInviteEmail('')
    }
  }

  const handleRemoveInvite = (email: string) => {
    setInviteEmails(inviteEmails.filter(e => e !== email))
  }

  const handleCreateProject = async () => {
    if (!user || !projectData.name || !teamId) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsCreating(true)

      // Create project
      let project: Project
      if (selectedTemplate !== 'blank') {
        project = await projectService.createProjectFromTemplate(
          selectedTemplate,
          projectData,
          teamId,
          user.id
        )
      } else {
        project = await projectService.createProject(projectData, teamId, user.id)
      }

      // Send invites
      for (const email of inviteEmails) {
        // This would typically send actual invites
        console.log('Sending invite to:', email)
      }

      toast({
        title: 'Success',
        description: 'Project created successfully!',
      })

      router.push(`/projects/${project.id}`)
    } catch (error) {
      console.error('Error creating project:', error)
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const progressPercentage = ((currentStep + 1) / wizardSteps.length) * 100

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/projects')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
        
        <h1 className="text-3xl font-bold">Create New Project</h1>
        
        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progressPercentage} />
          <div className="flex justify-between">
            {wizardSteps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  index <= currentStep ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2",
                    index < currentStep
                      ? "bg-primary border-primary text-primary-foreground"
                      : index === currentStep
                      ? "border-primary"
                      : "border-muted"
                  )}
                >
                  {index < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span className="hidden md:inline">{step.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {wizardSteps[currentStep].icon}
            {wizardSteps[currentStep].title}
          </CardTitle>
          <CardDescription>
            {wizardSteps[currentStep].description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Selection */}
          {currentStep === 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projectTemplates.map(template => (
                <Card
                  key={template.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedTemplate === template.id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="text-3xl">{template.icon}</div>
                      {template.isRecommended && (
                        <Badge variant="secondary">
                          <Sparkles className="mr-1 h-3 w-3" />
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  {template.id !== 'blank' && (
                    <CardContent>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {template.structure.milestones.length} Milestones
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {template.structure.workflowStages.length} Workflow Stages
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter project name"
                  value={projectData.name}
                  onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your project..."
                  rows={4}
                  value={projectData.description}
                  onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">Initial Status</Label>
                  <Select
                    value={projectData.status}
                    onValueChange={(value: ProjectStatus) => 
                      setProjectData({ ...projectData, status: value })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={projectData.priority}
                    onValueChange={(value) => 
                      setProjectData({ ...projectData, priority: value as any })
                    }
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Visibility</Label>
                <RadioGroup
                  value={projectData.visibility}
                  onValueChange={(value) => 
                    setProjectData({ ...projectData, visibility: value as any })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="public" id="public" />
                    <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer">
                      <Globe className="h-4 w-4" />
                      Public - Anyone can view
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="team" id="team" />
                    <Label htmlFor="team" className="flex items-center gap-2 cursor-pointer">
                      <Users className="h-4 w-4" />
                      Team - Only team members can view
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="private" id="private" />
                    <Label htmlFor="private" className="flex items-center gap-2 cursor-pointer">
                      <Lock className="h-4 w-4" />
                      Private - Only invited members can view
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button type="button" onClick={handleAddTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {projectData.tags && projectData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {projectData.tags.map(tag => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Repository Setup */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                <GitBranch className="h-5 w-5" />
                <div className="flex-1">
                  <p className="font-medium">Connect Git Repository</p>
                  <p className="text-sm text-muted-foreground">
                    Link your project to a Git repository for version control
                  </p>
                </div>
                <Switch
                  checked={!!projectData.gitProvider}
                  onCheckedChange={(checked) => {
                    if (!checked) {
                      setProjectData({
                        ...projectData,
                        gitProvider: null,
                        gitUrl: null,
                        gitBranch: 'main',
                      })
                    }
                  }}
                />
              </div>

              {projectData.gitProvider !== null && (
                <>
                  <div className="space-y-2">
                    <Label>Git Provider</Label>
                    <RadioGroup
                      value={projectData.gitProvider || 'github'}
                      onValueChange={(value) => 
                        setProjectData({ ...projectData, gitProvider: value as any })
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="github" id="github" />
                        <Label htmlFor="github" className="flex items-center gap-2 cursor-pointer">
                          <Github className="h-4 w-4" />
                          GitHub
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="gitlab" id="gitlab" />
                        <Label htmlFor="gitlab" className="flex items-center gap-2 cursor-pointer">
                          <Gitlab className="h-4 w-4" />
                          GitLab
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="bitbucket" id="bitbucket" />
                        <Label htmlFor="bitbucket" className="flex items-center gap-2 cursor-pointer">
                          <FileCode className="h-4 w-4" />
                          Bitbucket
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gitUrl">Repository URL</Label>
                    <Input
                      id="gitUrl"
                      placeholder="https://github.com/username/repository"
                      value={projectData.gitUrl || ''}
                      onChange={(e) => setProjectData({ ...projectData, gitUrl: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gitBranch">Default Branch</Label>
                    <Input
                      id="gitBranch"
                      placeholder="main"
                      value={projectData.gitBranch || 'main'}
                      onChange={(e) => setProjectData({ ...projectData, gitBranch: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="taskmaster">Task Master Integration</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable Task Master AI for intelligent task management
                    </p>
                  </div>
                  <Switch
                    id="taskmaster"
                    checked={projectData.isTaskMasterProject}
                    onCheckedChange={(checked) => 
                      setProjectData({ ...projectData, isTaskMasterProject: checked })
                    }
                  />
                </div>

                {projectData.isTaskMasterProject && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="customrules">Custom Rules</Label>
                      <p className="text-sm text-muted-foreground">
                        Use custom CLAUDE.md rules for this project
                      </p>
                    </div>
                    <Switch
                      id="customrules"
                      checked={projectData.hasCustomRules}
                      onCheckedChange={(checked) => 
                        setProjectData({ ...projectData, hasCustomRules: checked })
                      }
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="sync">Auto Sync</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync with repository changes
                    </p>
                  </div>
                  <Switch
                    id="sync"
                    checked={projectData.syncEnabled}
                    onCheckedChange={(checked) => 
                      setProjectData({ ...projectData, syncEnabled: checked })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Team & Permissions */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team">Select Team *</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger id="team">
                    <SelectValue placeholder="Choose a team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team-1">My Team</SelectItem>
                    <SelectItem value="team-2">Development Team</SelectItem>
                    <SelectItem value="team-3">Design Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Invite Team Members</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter email address..."
                    value={newInviteEmail}
                    onChange={(e) => setNewInviteEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddInvite()}
                  />
                  <Button type="button" onClick={handleAddInvite}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
                {inviteEmails.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {inviteEmails.map(email => (
                      <div key={email} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{email}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveInvite(email)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Default Permissions</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">Allow Guest Access</p>
                      <p className="text-sm text-muted-foreground">
                        Non-members can view project in read-only mode
                      </p>
                    </div>
                    <Switch
                      checked={projectData.settings?.allowGuestAccess}
                      onCheckedChange={(checked) => 
                        setProjectData({
                          ...projectData,
                          settings: {
                            ...projectData.settings!,
                            allowGuestAccess: checked,
                          }
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Project Settings */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Workflow Settings</h3>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">Auto-assign Tasks</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically assign tasks based on availability
                    </p>
                  </div>
                  <Switch
                    checked={projectData.settings?.autoAssignTasks}
                    onCheckedChange={(checked) => 
                      setProjectData({
                        ...projectData,
                        settings: {
                          ...projectData.settings!,
                          autoAssignTasks: checked,
                        }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">Require Approval</p>
                    <p className="text-sm text-muted-foreground">
                      Tasks need approval before marking as complete
                    </p>
                  </div>
                  <Switch
                    checked={projectData.settings?.requireApproval}
                    onCheckedChange={(checked) => 
                      setProjectData({
                        ...projectData,
                        settings: {
                          ...projectData.settings!,
                          requireApproval: checked,
                        }
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notifications</h3>
                
                <div className="space-y-2">
                  {[
                    { key: 'onTaskCreated', label: 'Task Created' },
                    { key: 'onTaskCompleted', label: 'Task Completed' },
                    { key: 'onMilestoneReached', label: 'Milestone Reached' },
                    { key: 'onDeployment', label: 'Deployment Triggered' },
                    { key: 'onMemberJoined', label: 'Member Joined' },
                    { key: 'onMemberLeft', label: 'Member Left' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between p-2">
                      <Label htmlFor={key}>{label}</Label>
                      <Switch
                        id={key}
                        checked={projectData.settings?.notifications?.[key as keyof typeof projectData.settings.notifications]}
                        onCheckedChange={(checked) => 
                          setProjectData({
                            ...projectData,
                            settings: {
                              ...projectData.settings!,
                              notifications: {
                                ...projectData.settings!.notifications!,
                                [key]: checked,
                              }
                            }
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        
        {currentStep === wizardSteps.length - 1 ? (
          <Button onClick={handleCreateProject} disabled={isCreating}>
            {isCreating ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Create Project
              </>
            )}
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}