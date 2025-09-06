'use client';

import { ReactNode } from 'react';
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from '@/providers/theme-provider';
import { Toaster } from 'sonner';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      <SessionProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </SessionProvider>
      <Toaster position="top-right" />
    </>
  );
}