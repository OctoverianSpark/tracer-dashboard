'use client'
import { SessionProvider } from 'next-auth/react'
import { SidebarProvider } from './_ui/sidebar'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SidebarProvider>
        {children}
      </SidebarProvider>
    </SessionProvider>
  )
}