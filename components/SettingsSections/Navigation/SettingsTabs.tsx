'use client'
import { cn } from '@/app/_components/_lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/app/_components/_ui/tabs'
import { Database, LucideIcon, User } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import React from 'react'


interface Tab {
  value: string
  href: string
  label: string
  icon: LucideIcon
}

const SETTINGS_TABS : Tab[]= [
  {value: 'user', href:'/settings/user', label:'Usuario', icon: User},
  {value: 'data', href:'/settings/data', label:'Datos', icon: Database}
]


export default function SettingsTabs() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className='border-b px-6 flex gap-1'>
      {SETTINGS_TABS.map(({ value, href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href)
        return (
          <button
            key={value}
            onClick={() => router.push(href)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
              'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5',
              'after:bg-primary after:transition-transform after:duration-200',
              isActive
                ? 'text-foreground after:scale-x-100'
                : 'text-muted-foreground hover:text-foreground after:scale-x-0'
            )}
          >
            <Icon className='w-4 h-4' />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
