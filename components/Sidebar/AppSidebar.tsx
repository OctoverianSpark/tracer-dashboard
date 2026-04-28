'use client'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/app/_components/_ui/sidebar'
import { Button } from '@/app/_components/_ui/button'
import { generateId } from '@/app/_components/_lib/utils'
import { LogOut } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import { renderNavItem, SECTIONS } from './NavItems'
import NavGroups from './NavGroups'

export function AppSidebar() {
  const { setOpen } = useSidebar()
  const { data: session } = useSession()

  const perms = JSON.parse(session?.role?.access_level ?? '{}')

  const allowedSections = SECTIONS
    .map(section => ({
      ...section,
      items: section.items.filter(item => perms[item.perm])
    }))
    .filter(section => section.items.length > 0)

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className='flex gap-2'>
            <SidebarMenuButton
              asChild
              className='data-[slot=sidebar-menu-button]:!p-1.5'
            >
              <a href='/home'>
                <Image width={28} height={28} alt='Tracer logo' src='/logo.png' />
                <span className='text-base font-semibold truncate flex-1'>
                  Actimetrics
                </span>
                <Button
                  variant='ghost'
                  size='icon'
                  className='cursor-pointer size-6 shrink-0 ml-auto'
                  onClick={e => { e.preventDefault(); signOut({ callbackUrl: '/' }) }}
                >
                  <LogOut className='size-4' />
                </Button>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className='px-1.5 md:px-0'>
            <SidebarMenu>
              {allowedSections.map(group => (
                <NavGroups
                  section={group}
                  key={generateId('nav-group')}
                  onClick={() => setOpen(true)}
                >
                  {group.items.map(item => renderNavItem(item))}
                </NavGroups>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  )
}