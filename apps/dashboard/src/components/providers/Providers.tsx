'use client';

import { ReactNode } from 'react';
import SessionProvider from './SessionProvider';
import { ThemeProvider } from '@/providers/theme-provider';
import { Toaster } from 'sonner';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
        <Toaster position="top-right" />
      </ThemeProvider>
    </SessionProvider>
  );
}