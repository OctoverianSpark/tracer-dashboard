import type { Metadata } from 'next'
import { Outfit, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { AppSidebar } from '@/components/Sidebar/AppSidebar'
import { AppHeader } from './_components/AppHeader'
import { SonnerToaster } from './_components/SonnerToaster'
import Providers from './_components/providers'
import { getServerSession } from 'next-auth'
import LavaLamp from '@/components/LavaLamp'
import { PageTransition } from './_components/PageTransition'

const outfit = Outfit({ variable: '--font-outfit', subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ variable: '--font-space-grotesk', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GoTracer',
  description: 'Gestión de computadores y reportes de actividad'
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession()
  
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={`${outfit.variable} ${spaceGrotesk.variable} antialiased`}>
        <LavaLamp />
        <SonnerToaster />
        <Providers>
          {session && <AppSidebar />}
          <div className='flex flex-col flex-1 min-w-0 h-full min-h-screen'>
            {session && <AppHeader />}
            <main className='flex-1 p-4 sm:p-6 w-full'>
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}