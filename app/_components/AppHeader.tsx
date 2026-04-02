'use client'
import { useEffect, useState } from 'react'
import { SidebarTrigger } from './_ui/sidebar'
import { Button } from './_ui/button'

export function AppHeader () {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header className={`border-b w-full py-4 flex items-center gap-2 px-4 sticky top-0 bg-white transition-opacity duration-300 ${scrolled ? 'opacity-40' : 'opacity-100'}`}>
      <Button asChild variant='ghost' className='cursor-pointer'>
        <SidebarTrigger />
      </Button>
      <div className='h-6 w-px bg-border' />
      <h1 className='text-3xl font-semibold'>Tracer</h1>
    </header>
  )
}
