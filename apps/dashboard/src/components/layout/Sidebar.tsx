'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  HomeIcon,
  FolderIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BellIcon,
  UserGroupIcon,
  ServerIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

const navigation: Array<{
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon as any },
  { name: 'Projects', href: '/projects', icon: FolderIcon as any },
  { name: 'Servers', href: '/servers', icon: ServerIcon as any },
  { name: 'Tasks', href: '/tasks', icon: ClipboardDocumentListIcon as any },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon as any },
  { name: 'Team', href: '/team', icon: UserGroupIcon as any },
  { name: 'Notifications', href: '/notifications', icon: BellIcon as any },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon as any },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside className='w-64 bg-card shadow-sm border-r border-border h-screen sticky top-0'>
      <div className='flex flex-col h-full'>
        <div className='flex items-center h-16 px-4 border-b border-border'>
          <h1 className='text-xl font-bold text-primary'>Task Master</h1>
        </div>
        <nav className='flex-1 px-2 py-4 space-y-1'>
          {navigation.map(item => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {React.createElement(item.icon, {
                  className: cn(
                    'mr-3 h-5 w-5',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground group-hover:text-accent-foreground'
                  ),
                })}
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className='p-4 border-t border-border'>
          <div className='flex items-center'>
            <div className='h-8 w-8 rounded-full bg-muted flex items-center justify-center'>
              {session?.user?.name ? (
                <span className='text-sm font-medium text-muted-foreground'>
                  {session.user.name.charAt(0).toUpperCase()}
                </span>
              ) : null}
            </div>
            <div className='ml-3'>
              <p className='text-sm font-medium text-foreground'>
                {session?.user?.name || 'Loading...'}
              </p>
              <p className='text-xs text-muted-foreground'>
                {session?.user?.email || 'Loading...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
