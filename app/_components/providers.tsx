'use client'
import { SessionProvider } from 'next-auth/react'
import { SidebarProvider } from './_ui/sidebar'
import { ThemeProvider } from 'next-themes'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <SessionProvider>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}
