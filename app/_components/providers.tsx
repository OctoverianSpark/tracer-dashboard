'use client'
import { SessionProvider } from 'next-auth/react'
import { SidebarProvider } from './_ui/sidebar'
import { ThemeProvider } from 'next-themes'
import { FaviconSwitcher } from './FaviconSwitcher'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <FaviconSwitcher />
      <SessionProvider>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}
