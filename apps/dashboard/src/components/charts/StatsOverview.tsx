'use client'

import React, { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  FolderOpenIcon,
} from '@heroicons/react/24/outline'

interface Stat {
  name: string
  value: string | number
  change?: string
  changeType?: 'increase' | 'decrease'
  icon: any
}

export function StatsOverview() {
  const [stats, setStats] = useState<Stat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for now - will be replaced with API call
    const mockStats: Stat[] = [
      {
        name: 'Total Tasks',
        value: 245,
        change: '+12%',
        changeType: 'increase',
        icon: ChartBarIcon,
      },
      {
        name: 'Completed',
        value: 89,
        change: '+5.4%',
        changeType: 'increase',
        icon: CheckCircleIcon,
      },
      {
        name: 'In Progress',
        value: 42,
        change: '-2.1%',
        changeType: 'decrease',
        icon: ClockIcon,
      },
      {
        name: 'Active Projects',
        value: 8,
        change: '+1',
        changeType: 'increase',
        icon: FolderOpenIcon,
      },
    ]

    setTimeout(() => {
      setStats(mockStats)
      setLoading(false)
    }, 500)
  }, [])

  if (loading) {
    return (
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {[...Array(4)].map((_, i) => (
          <div key={i} className='animate-pulse'>
            <div className='h-24 bg-gray-100 rounded-lg'></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      {stats.map(stat => {
        return (
          <div
            key={stat.name}
            className='bg-white rounded-lg shadow-sm border border-gray-200 p-6'
          >
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>{stat.name}</p>
                <p className='mt-1 text-2xl font-semibold text-gray-900'>
                  {stat.value}
                </p>
              </div>
              <div className='p-3 bg-taskmaster-50 rounded-full'>
                {React.createElement(stat.icon, {
                  className: 'w-6 h-6 text-taskmaster-600',
                })}
              </div>
            </div>
            {stat.change && (
              <div className='mt-4 flex items-center'>
                <span
                  className={`text-sm font-medium ${
                    stat.changeType === 'increase'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {stat.change}
                </span>
                <span className='ml-2 text-sm text-gray-500'>
                  from last week
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
