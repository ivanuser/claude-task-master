import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Grid3x3,
  List,
  Archive,
  Trash2,
  Edit,
  Users,
  GitBranch,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Star,
  StarOff,
  FolderOpen,
  Activity,
  Settings,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Project, ProjectStatus } from '@/types/project'
import { projectService } from '@/services/project-service'
import { useAuth } from '@/hooks/useAuth'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

type ViewMode = 'grid' | 'list'
type SortField = 'name' | 'updatedAt' | 'createdAt' | 'status' | 'progress'
type FilterStatus = 'all' | ProjectStatus

export function ProjectsList() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [sortField, setSortField] = useState<SortField>('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showArchived, setShowArchived] = useState(false)
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  const [favoriteProjects, setFavoriteProjects] = useState<Set<string>>(new Set())

  // Load projects
  useEffect(() => {
    loadProjects()
    loadFavorites()
  }, [user])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        // Transform the API response to match the expected format
        const transformedProjects = (data.projects || []).map((project: any) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status?.toLowerCase() || 'active',
          visibility: project.visibility?.toLowerCase() || 'private',
          archived: project.status === 'ARCHIVED',
          tags: project.tag ? [project.tag] : [],
          updatedAt: new Date(project.updatedAt),
          createdAt: new Date(project.createdAt),
          totalTasks: project.totalTasks || 0,
          completedTasks: project.completedTasks || 0,
          memberCount: project.memberCount || 0,
          gitUrl: project.gitUrl,
          gitBranch: project.gitBranch
        }))
        setProjects(transformedProjects)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadFavorites = () => {
    const stored = localStorage.getItem('favoriteProjects')
    if (stored) {
      setFavoriteProjects(new Set(JSON.parse(stored)))
    }
  }

  const saveFavorites = (favorites: Set<string>) => {
    localStorage.setItem('favoriteProjects', JSON.stringify(Array.from(favorites)))
  }

  const toggleFavorite = (projectId: string) => {
    const newFavorites = new Set(favoriteProjects)
    if (newFavorites.has(projectId)) {
      newFavorites.delete(projectId)
    } else {
      newFavorites.add(projectId)
    }
    setFavoriteProjects(newFavorites)
    saveFavorites(newFavorites)
  }

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects.filter(project => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          project.name.toLowerCase().includes(query) ||
          project.description?.toLowerCase().includes(query) ||
          project.tags?.some(tag => tag.toLowerCase().includes(query))
        
        if (!matchesSearch) return false
      }

      // Status filter
      if (filterStatus !== 'all' && project.status !== filterStatus) {
        return false
      }

      // Archived filter
      if (!showArchived && project.archived) {
        return false
      }

      return true
    })

    // Sort projects
    filtered.sort((a, b) => {
      // Favorites always come first
      const aFav = favoriteProjects.has(a.id)
      const bFav = favoriteProjects.has(b.id)
      if (aFav && !bFav) return -1
      if (!aFav && bFav) return 1

      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'progress':
          const aProgress = a.totalTasks > 0 ? (a.completedTasks / a.totalTasks) * 100 : 0
          const bProgress = b.totalTasks > 0 ? (b.completedTasks / b.totalTasks) * 100 : 0
          comparison = aProgress - bProgress
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [projects, searchQuery, filterStatus, sortField, sortOrder, showArchived, favoriteProjects])

  const handleArchiveProject = async (projectId: string) => {
    try {
      await projectService.archiveProject(projectId)
      toast({
        title: 'Success',
        description: 'Project archived successfully',
      })
      loadProjects()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to archive project',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete project')
      }

      toast({
        title: 'Success',
        description: 'Project deleted successfully',
      })
      loadProjects()
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete project',
        variant: 'destructive',
      })
    }
  }

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'planning':
        return 'bg-gray-500'
      case 'active':
        return 'bg-blue-500'
      case 'on-hold':
        return 'bg-yellow-500'
      case 'completed':
        return 'bg-green-500'
      case 'archived':
        return 'bg-gray-400'
      default:
        return 'bg-gray-500'
    }
  }

  const getHealthIcon = (score: number) => {
    if (score >= 80) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (score >= 60) return <Activity className="h-4 w-4 text-yellow-500" />
    return <AlertCircle className="h-4 w-4 text-red-500" />
  }

  const ProjectCard = ({ project }: { project: Project }) => {
    const progress = project.totalTasks > 0 
      ? (project.completedTasks / project.totalTasks) * 100 
      : 0
    const isFavorite = favoriteProjects.has(project.id)

    return (
      <Card 
        className={cn(
          "hover:shadow-lg transition-all cursor-pointer",
          selectedProjects.has(project.id) && "ring-2 ring-primary"
        )}
        onClick={() => router.push(`/projects/${project.id}`)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {isFavorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                {project.name}
              </CardTitle>
              <CardDescription className="mt-1 line-clamp-2">
                {project.description || 'No description provided'}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  toggleFavorite(project.id)
                }}>
                  {isFavorite ? (
                    <>
                      <StarOff className="mr-2 h-4 w-4" />
                      Remove from favorites
                    </>
                  ) : (
                    <>
                      <Star className="mr-2 h-4 w-4" />
                      Add to favorites
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/projects/${project.id}/settings`)
                }}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  handleArchiveProject(project.id)
                }}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteProject(project.id)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Status and Git */}
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className={cn("capitalize", getStatusColor(project.status))}>
                {project.status}
              </Badge>
              {project.gitProvider && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <GitBranch className="h-3 w-3" />
                  <span className="text-xs">{project.gitBranch || 'main'}</span>
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{project.completedTasks} completed</span>
                <span>{project.totalTasks} total</span>
              </div>
            </div>

            {/* Team and Activity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{project.memberCount || 1}</span>
              </div>
              <div className="flex items-center gap-2">
                {getHealthIcon(project.metrics?.healthScore || 100)}
                <span className="text-sm text-muted-foreground">
                  {project.lastActivity 
                    ? formatDistanceToNow(new Date(project.lastActivity), { addSuffix: true })
                    : 'No activity'
                  }
                </span>
              </div>
            </div>

            {/* Tags */}
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {project.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {project.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{project.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const ProjectListItem = ({ project }: { project: Project }) => {
    const progress = project.totalTasks > 0 
      ? (project.completedTasks / project.totalTasks) * 100 
      : 0
    const isFavorite = favoriteProjects.has(project.id)

    return (
      <div 
        className={cn(
          "flex items-center gap-4 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer",
          selectedProjects.has(project.id) && "ring-2 ring-primary"
        )}
        onClick={() => router.push(`/projects/${project.id}`)}
      >
        {/* Favorite */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite(project.id)
          }}
        >
          <Star className={cn("h-4 w-4", isFavorite && "text-yellow-500 fill-yellow-500")} />
        </Button>

        {/* Project Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{project.name}</h3>
            <Badge variant="secondary" className={cn("capitalize", getStatusColor(project.status))}>
              {project.status}
            </Badge>
            {project.gitProvider && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <GitBranch className="h-3 w-3" />
                <span className="text-xs">{project.gitBranch || 'main'}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {project.description || 'No description'}
          </p>
        </div>

        {/* Progress */}
        <div className="w-32">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-center">
            {project.completedTasks}/{project.totalTasks} tasks
          </p>
        </div>

        {/* Team */}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{project.memberCount || 1}</span>
        </div>

        {/* Health */}
        <div className="flex items-center gap-1">
          {getHealthIcon(project.metrics?.healthScore || 100)}
        </div>

        {/* Last Activity */}
        <div className="text-sm text-muted-foreground w-32 text-right">
          {project.lastActivity 
            ? formatDistanceToNow(new Date(project.lastActivity), { addSuffix: true })
            : 'No activity'
          }
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation()
              router.push(`/projects/${project.id}/settings`)
            }}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation()
              handleArchiveProject(project.id)
            }}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteProject(project.id)
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage and track your development projects
          </p>
        </div>
        <Button onClick={() => router.push('/projects/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select value={filterStatus} onValueChange={(value: FilterStatus) => setFilterStatus(value)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Sort
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSortField('name')}>
              Name {sortField === 'name' && '✓'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortField('updatedAt')}>
              Last Updated {sortField === 'updatedAt' && '✓'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortField('createdAt')}>
              Date Created {sortField === 'createdAt' && '✓'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortField('status')}>
              Status {sortField === 'status' && '✓'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortField('progress')}>
              Progress {sortField === 'progress' && '✓'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Mode */}
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Show Archived */}
        <Button
          variant={showArchived ? 'default' : 'outline'}
          onClick={() => setShowArchived(!showArchived)}
        >
          <Archive className="mr-2 h-4 w-4" />
          {showArchived ? 'Hide' : 'Show'} Archived
        </Button>
      </div>

      {/* Projects */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3' : 'space-y-2'}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className={viewMode === 'grid' ? 'h-64' : 'h-20'} />
          ))}
        </div>
      ) : filteredAndSortedProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || filterStatus !== 'all' 
                ? "Try adjusting your filters or search query"
                : "Create your first project to get started"
              }
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <Button onClick={() => router.push('/projects/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            Showing {filteredAndSortedProjects.length} of {projects.length} projects
          </div>
          {viewMode === 'grid' ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedProjects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAndSortedProjects.map(project => (
                <ProjectListItem key={project.id} project={project} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}