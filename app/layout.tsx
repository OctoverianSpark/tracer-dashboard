import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AppSidebar } from '@/components/Sidebar/AppSidebar'
import { Toaster } from 'sonner'
import { AppHeader } from './_components/AppHeader'
import Providers from './_components/providers'
import { getServerSession } from 'next-auth'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ActiMetrics',
  description: 'Gestión de computadores y reportes de actividad'
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession()
  
  return (
    <html lang='en'>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Toaster position='top-right' />
        <Providers>
          {session && <AppSidebar />}
          <div className='flex flex-col w-full h-full min-h-screen'>
            {session && <AppHeader />}
            <main className='flex-1 p-6 w-full'>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  )
}