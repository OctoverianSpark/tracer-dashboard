'use client'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/app/_components/_ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar
} from '@/app/_components/_ui/sidebar'
import Image from 'next/image'
import { renderNavItem, SECTIONS } from './NavItems'
import NavGroups from './NavGroups'
import Link from 'next/link'
import { Button } from '@/app/_components/_ui/button'
import { Cog } from 'lucide-react'
import { generateId } from '@/app/_components/_lib/utils'

export function AppSidebar () {
  const { setOpen } = useSidebar()

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className='flex gap-2'>
            <SidebarMenuButton
              asChild
              className='data-[slot=sidebar-menu-button]:!p-1.5'
            >
              <a href='#'>
                <Image src={'/logo.png'} alt='A' width={24} height={24} />

                <span className='text-base font-semibold'>Tracer</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className='px-1.5 md:px-0'>
            <SidebarMenu>
              {SECTIONS.map(group => (
                <NavGroups
                  section={group}
                  key={generateId('nav-group')}
                  onClick={() => setOpen(true)}
                >
                  {group.items.map(item => {
                    return renderNavItem(item)
                  })}
                </NavGroups>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter></SidebarFooter>
    </Sidebar>
  )
}
