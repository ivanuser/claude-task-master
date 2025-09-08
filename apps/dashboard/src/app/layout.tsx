import type { Metadata } from 'next'
import './globals.css'
import '../styles/theme.css'
import Providers from '@/components/providers/Providers'

export const metadata: Metadata = {
  title: 'Task Master Dashboard',
  description:
    'Centralized web dashboard for Task Master multi-project management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className='bg-background text-foreground' suppressHydrationWarning>
        <Providers>
          <div id='root'>{children}</div>
        </Providers>
      </body>
    </html>
  )
}
