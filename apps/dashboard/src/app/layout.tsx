import type { Metadata } from 'next'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'

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
    <html lang='en'>
      <body className='bg-gray-50 text-gray-900'>
        <SessionProvider>
          <div id='root'>{children}</div>
        </SessionProvider>
      </body>
    </html>
  )
}
