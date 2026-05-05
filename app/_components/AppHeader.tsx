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
    <header className={`border-b w-full py-4 flex items-center gap-2 px-4 sticky top-0 z-20 bg-background transition-opacity duration-300 ${scrolled ? 'opacity-40' : 'opacity-100'}`}>
      <Button asChild variant='ghost' className='cursor-pointer'>
        <SidebarTrigger />
      </Button>
      <div className='h-6 w-px bg-border ' />
      <div className="flex justify-between w-full">
        
      <h1 className='text-2xl font-semibold flex items-center gap-2'>
        {Icon && <Icon className='size-6' />}
        {actualItem?.title}
      </h1>
      <h3 className='flex justify-center items-center text-xl font-bold gap-2'>
        <span>{session?.user?.name}</span>
        <Button onClick={()=>signOut({callbackUrl: '/'})} variant='ghost' size='icon' className='ml-2 cursor-pointer'>
          <LogOut />
        </Button>
      </h3>
      </div>
    </header>
  )
}
