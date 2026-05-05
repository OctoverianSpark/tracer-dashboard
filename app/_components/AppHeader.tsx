'use client'
import { useEffect, useState } from 'react'
import { SidebarTrigger } from './_ui/sidebar'
import { Button } from './_ui/button'
import { SECTIONS } from '@/components/Sidebar/NavItems'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { LogOut } from 'lucide-react'

export function AppHeader () {
  const [scrolled, setScrolled] = useState(false)
  const sections = SECTIONS.map(s => s.items).flat()
  const pathname = usePathname()
  const actualItem = sections.find(i => i.url === pathname)
  const Icon = actualItem?.icon
  const {data: session} =useSession()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header className={`border-b w-full py-3 sm:py-4 flex items-center gap-2 px-3 sm:px-4 sticky top-0 z-20 bg-background transition-opacity duration-300 ${scrolled ? 'opacity-40' : 'opacity-100'}`}>
      <Button asChild variant='ghost' className='cursor-pointer'>
        <SidebarTrigger />
      </Button>
      <div className='h-6 w-px bg-border' />
      <div className="flex justify-between items-center w-full min-w-0">
        <h1 className='text-lg sm:text-2xl font-semibold flex items-center gap-2 truncate'>
          {Icon && <Icon className='size-5 sm:size-6 shrink-0' />}
          <span className='truncate'>{actualItem?.title}</span>
        </h1>
        <h3 className='flex items-center text-sm sm:text-base font-semibold gap-1 sm:gap-2 shrink-0 ml-2'>
          <span className='hidden sm:block'>{session?.user?.name}</span>
          <Button onClick={()=>signOut({callbackUrl: '/'})} variant='ghost' size='icon' className='cursor-pointer'>
            <LogOut />
          </Button>
        </h3>
      </div>
    </header>
  )
}
