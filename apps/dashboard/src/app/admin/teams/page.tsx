'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Plus, 
  Users, 
  Settings, 
  Trash2, 
  Edit,
  Eye,
  MoreHorizontal,
  Calendar,
  Hash
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  tag: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  visibility: 'PUBLIC' | 'PRIVATE' | 'INTERNAL';
  createdAt: string;
  updatedAt: string;
  _count: {
    members: number;
    tasks: number;
  };
  owner: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  members: TeamMember[];
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tag: '',
    ownerId: '',
    visibility: 'PRIVATE',
    members: [] as string[]
  });

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/admin/teams');
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch teams",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: "Error",
        description: "Failed to fetch teams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?limit=100');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Team created successfully",
        });
        setIsCreateModalOpen(false);
        setFormData({
          name: '',
          description: '',
          tag: '',
          ownerId: '',
          visibility: 'PRIVATE',
          members: []
        });
        fetchTeams();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to create team",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/teams/${teamId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Team deleted successfully",
        });
        fetchTeams();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to delete team",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: "Error",
        description: "Failed to delete team",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'INACTIVE': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'ARCHIVED': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getVisibilityBadgeColor = (visibility: string) => {
    switch (visibility) {
      case 'PUBLIC': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'PRIVATE': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'INTERNAL': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generateTag = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage teams and team memberships across the platform
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a new team and invite members to collaborate.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Team Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        name: e.target.value,
                        tag: generateTag(e.target.value)
                      }));
                    }}
                    placeholder="Enter team name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tag">Team Tag</Label>
                  <Input
                    id="tag"
                    value={formData.tag}
                    onChange={(e) => setFormData(prev => ({ ...prev, tag: e.target.value }))}
                    placeholder="team-tag"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this team does..."
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="owner">Team Owner *</Label>
                  <Select
                    value={formData.ownerId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, ownerId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select
                    value={formData.visibility}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, visibility: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRIVATE">Private</SelectItem>
                      <SelectItem value="INTERNAL">Internal</SelectItem>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Team</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{teams.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {teams.filter(t => t.status === 'ACTIVE').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {teams.reduce((sum, team) => sum + team._count.members, 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {teams.reduce((sum, team) => sum + team._count.tasks, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Teams Table */}
      <Card>
        <CardHeader>
          <CardTitle>Teams ({filteredTeams.length})</CardTitle>
          <CardDescription>
            Manage all teams and their settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground">{team.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {team.tag}
                      </div>
                      {team.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-xs mt-1">
                          {team.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground">
                        {team.owner?.name || 'Unknown'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {team.owner?.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(team.status)}>
                      {team.status.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getVisibilityBadgeColor(team.visibility)}>
                      {team.visibility.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      {team._count.members}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      {team._count.tasks}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(team.createdAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedTeam(team);
                            setIsViewModalOpen(true);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Team
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="mr-2 h-4 w-4" />
                          Manage Members
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteTeam(team.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Team
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTeams.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No teams match your search.' : 'No teams found.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Team Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Team Details</DialogTitle>
            <DialogDescription>
              View detailed information about this team
            </DialogDescription>
          </DialogHeader>
          
          {selectedTeam && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Team Name</Label>
                  <div className="text-foreground">{selectedTeam.name}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tag</Label>
                  <div className="text-foreground">{selectedTeam.tag}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div>
                    <Badge className={getStatusBadgeColor(selectedTeam.status)}>
                      {selectedTeam.status.toLowerCase()}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Visibility</Label>
                  <div>
                    <Badge className={getVisibilityBadgeColor(selectedTeam.visibility)}>
                      {selectedTeam.visibility.toLowerCase()}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                  <div className="text-foreground">
                    {new Date(selectedTeam.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                  <div className="text-foreground">
                    {new Date(selectedTeam.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {selectedTeam.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <div className="text-foreground mt-1">{selectedTeam.description}</div>
                </div>
              )}

              {/* Owner Info */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Team Owner</Label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="text-foreground">{selectedTeam.owner?.name || 'Unknown'}</div>
                  <div className="text-sm text-muted-foreground">({selectedTeam.owner?.email})</div>
                </div>
              </div>

              {/* Members */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Team Members ({selectedTeam._count.members})
                </Label>
                <div className="mt-2 space-y-2">
                  {selectedTeam.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2 border border-border rounded-md">
                      <div>
                        <div className="text-foreground">{member.user.name || member.user.email}</div>
                        <div className="text-sm text-muted-foreground">{member.user.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{member.role.toLowerCase()}</Badge>
                        <div className="text-xs text-muted-foreground">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Total Members</Label>
                  <div className="text-2xl font-bold text-foreground">{selectedTeam._count.members}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Total Tasks</Label>
                  <div className="text-2xl font-bold text-foreground">{selectedTeam._count.tasks}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}