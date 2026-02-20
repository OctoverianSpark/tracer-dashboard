import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from '@/app/_components/_ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/app/_components/_ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/app/_components/_ui/tooltip'
import { NavSection, NavItem, NavTypes } from '@/types/Navigation'
import { ChevronDown } from 'lucide-react'
import React, { JSX } from 'react'

interface NavGroupsProps {
  section: NavSection
  children: JSX.Element[]
  onClick: () => void
}

export default function NavGroups ({
  section,
  children,
  onClick
}: NavGroupsProps) {
  return (
    <SidebarMenu>
      <Collapsible asChild defaultOpen={true}>
        <SidebarMenuItem>
          <Tooltip>
            <TooltipTrigger asChild>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  className='cursor-pointer px-2.5 md:px-2'
                  onClick={onClick}
                >
                  <section.icon />
                  <span>{section.title}</span>
                  <ChevronDown className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180' />
                </SidebarMenuButton>
              </CollapsibleTrigger>
            </TooltipTrigger>
            <TooltipContent side='right' align='center'>
              <p>{section.title}</p>
            </TooltipContent>
          </Tooltip>

          <CollapsibleContent>
            <SidebarMenuSub>{children}</SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarMenu>
  )
}
