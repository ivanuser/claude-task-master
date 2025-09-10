'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  UsersIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  CogIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import BackButton from '@/components/ui/BackButton'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalTeams: number
  totalProjects: number
  totalTasks: number
  recentSignups: number
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    fetchStats()
  }, [session, status, router])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      } else if (response.status === 403) {
        setError('Admin access required')
      } else {
        setError('Failed to load admin stats')
      }
    } catch (err) {
      setError('Failed to load admin stats')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <BackButton href="/dashboard" label="Back to Dashboard" />
          <div className="mt-8 text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <p className="text-sm text-muted-foreground">
              If you should have admin access, please contact your system administrator.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <BackButton href="/dashboard" label="Back to Dashboard" className="mb-4" />
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheckIcon className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground">Manage users, teams, and system settings</p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-card rounded-lg shadow border border-border p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                  <UsersIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-foreground">{stats.totalUsers}</h3>
                  <p className="text-muted-foreground">Total Users</p>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-green-600 dark:text-green-400">
                <CheckCircleIcon className="w-4 h-4 mr-1" />
                {stats.activeUsers} active
              </div>
            </div>

            <div className="bg-card rounded-lg shadow border border-border p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
                  <UserGroupIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-foreground">{stats.totalTeams}</h3>
                  <p className="text-muted-foreground">Teams</p>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-muted-foreground">
                <ChartBarIcon className="w-4 h-4 mr-1" />
                {stats.totalProjects} projects
              </div>
            </div>

            <div className="bg-card rounded-lg shadow border border-border p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                  <ChartBarIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-foreground">{stats.totalTasks}</h3>
                  <p className="text-muted-foreground">Total Tasks</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg shadow border border-border p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                  <ClockIcon className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-foreground">{stats.recentSignups}</h3>
                  <p className="text-muted-foreground">New This Month</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-card rounded-lg shadow border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer"
               onClick={() => router.push('/admin/users')}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Manage Users</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create, edit, and manage user accounts and permissions
                </p>
                <span className="text-primary font-medium">View Users →</span>
              </div>
              <UsersIcon className="w-8 h-8 text-primary" />
            </div>
          </div>

          <div className="bg-card rounded-lg shadow border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer"
               onClick={() => router.push('/admin/teams')}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Manage Teams</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create and manage teams, add members, set permissions
                </p>
                <span className="text-primary font-medium">View Teams →</span>
              </div>
              <UserGroupIcon className="w-8 h-8 text-primary" />
            </div>
          </div>

          <div className="bg-card rounded-lg shadow border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer"
               onClick={() => router.push('/admin/settings')}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">System Settings</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure system-wide settings and preferences
                </p>
                <span className="text-primary font-medium">Manage Settings →</span>
              </div>
              <CogIcon className="w-8 h-8 text-primary" />
            </div>
          </div>
        </div>

        {/* Make Admin Section */}
        <div className="mt-12 bg-card rounded-lg shadow border border-border p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">Quick Admin Setup</h3>
          <p className="text-sm text-muted-foreground mb-4">
            If you need to grant admin access to your account, use the button below:
          </p>
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/admin/make-admin', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: session?.user?.email })
                })
                
                if (response.ok) {
                  alert('Admin access granted! Please refresh the page.')
                  window.location.reload()
                } else {
                  const error = await response.json()
                  alert(error.error || 'Failed to grant admin access')
                }
              } catch (error) {
                alert('Failed to grant admin access')
              }
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Make Me Admin
          </button>
        </div>
      </div>
    </div>
  )
}