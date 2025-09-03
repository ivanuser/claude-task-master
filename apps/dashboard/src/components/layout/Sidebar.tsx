'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  FolderIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BellIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

const navigation: Array<{
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon as any },
  { name: 'Projects', href: '/projects', icon: FolderIcon as any },
  { name: 'Tasks', href: '/tasks', icon: ClipboardDocumentListIcon as any },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon as any },
  { name: 'Team', href: '/team', icon: UserGroupIcon as any },
  { name: 'Notifications', href: '/notifications', icon: BellIcon as any },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon as any },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className='w-64 bg-white shadow-sm border-r border-gray-200 h-screen sticky top-0'>
      <div className='flex flex-col h-full'>
        <div className='flex items-center h-16 px-4 border-b border-gray-200'>
          <h1 className='text-xl font-bold text-taskmaster-600'>Task Master</h1>
        </div>
        <nav className='flex-1 px-2 py-4 space-y-1'>
          {navigation.map(item => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                  isActive
                    ? 'bg-taskmaster-100 text-taskmaster-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                {React.createElement(item.icon, {
                  className: cn(
                    'mr-3 h-5 w-5',
                    isActive
                      ? 'text-taskmaster-500'
                      : 'text-gray-400 group-hover:text-gray-500'
                  ),
                })}
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className='p-4 border-t border-gray-200'>
          <div className='flex items-center'>
            <div className='h-8 w-8 rounded-full bg-gray-300'></div>
            <div className='ml-3'>
              <p className='text-sm font-medium text-gray-700'>User Name</p>
              <p className='text-xs text-gray-500'>user@example.com</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
