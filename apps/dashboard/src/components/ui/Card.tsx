import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { cardVariants } from '@/lib/tailwind-utils'

interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'elevated' | 'ghost'
  padding?: 'default' | 'sm' | 'lg' | 'none'
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

interface CardTitleProps {
  children: ReactNode
  className?: string
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function Card({
  children,
  className,
  variant = 'default',
  padding = 'default',
}: CardProps) {
  return (
    <div className={cn(cardVariants({ variant, padding }), className)}>
      {children}
    </div>
  )
}

Card.Header = function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('border-b border-gray-200 pb-4 mb-4', className)}>
      {children}
    </div>
  )
}

Card.Title = function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn('text-lg font-semibold text-gray-900', className)}>
      {children}
    </h3>
  )
}

Card.Content = function CardContent({ children, className }: CardContentProps) {
  return <div className={cn('', className)}>{children}</div>
}

Card.Footer = function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('border-t border-gray-200 pt-4 mt-4', className)}>
      {children}
    </div>
  )
}
