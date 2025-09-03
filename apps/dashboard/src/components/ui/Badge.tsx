import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { badgeVariants } from '@/lib/tailwind-utils'

interface BadgeProps {
  children: ReactNode
  className?: string
  variant?:
    | 'default'
    | 'secondary'
    | 'success'
    | 'destructive'
    | 'warning'
    | 'outline'
}

export function Badge({
  children,
  className,
  variant = 'default',
}: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      {children}
    </span>
  )
}
