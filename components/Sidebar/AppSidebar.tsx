'use client'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/app/_components/_ui/sidebar'
import { generateId } from '@/app/_components/_lib/utils'
import { normalizeAccessLevel } from '@/lib/accessLevel'
import { useSession } from 'next-auth/react'
import { AnimatedInfinityLogo } from '@/components/AnimatedLogo'
import { NavItemRenderer, SECTIONS } from './NavItems'
import NavGroups from './NavGroups'

export function AppSidebar() {
  const { setOpen } = useSidebar()
  const { data: session } = useSession()

  const perms = normalizeAccessLevel(session?.role?.access_level)

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
              size="lg"
              className='data-[slot=sidebar-menu-button]:p-1.5!'
            >
              <a href='/home'>
                <AnimatedInfinityLogo height={28} speed={3} />
                <span className='text-base font-semibold truncate flex-1'>
                  Tracer
                </span>
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
                  {group.items.map(item => <NavItemRenderer key={item.title} item={item} />)}
                </NavGroups>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

    </Sidebar>
  )
}
