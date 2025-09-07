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
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'

const navigation: Array<{
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon as any },
  { name: 'Projects', href: '/projects', icon: FolderIcon as any },
  { name: 'Tasks', href: '/tasks', icon: ClipboardDocumentListIcon as any },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon as any },
  { name: 'API Docs', href: '/api-docs', icon: DocumentTextIcon as any },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon as any },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className='bg-white shadow-sm border-b border-gray-200'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between h-16'>
          <div className='flex'>
            <div className='flex-shrink-0 flex items-center'>
              <h1 className='text-xl font-bold text-taskmaster-600'>
                Task Master
              </h1>
            </div>
            <nav className='hidden sm:ml-8 sm:flex sm:space-x-8'>
              {navigation.map(item => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
                      isActive
                        ? 'border-taskmaster-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    )}
                  >
                    {React.createElement(item.icon, {
                      className: 'w-5 h-5 mr-2',
                    })}
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className='flex items-center space-x-3'>
            <NotificationDropdown />
            <button className='p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100'>
              <span className='sr-only'>User menu</span>
              <div className='h-8 w-8 rounded-full bg-gray-300'></div>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
