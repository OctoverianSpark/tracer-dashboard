'use client'
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
import { useSpringHeight } from '@/lib/animation'
import { ChevronDown } from 'lucide-react'
import React, { JSX, useRef, useState } from 'react'

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
  const [open, setOpen] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)
  useSpringHeight(contentRef, open)

  return (
    <SidebarMenu>
      <Collapsible asChild open={open} onOpenChange={setOpen}>
        <SidebarMenuItem>
          <Tooltip>
            <TooltipTrigger asChild>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  className={`cursor-pointer px-2.5 md:px-2`}
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

          {/* forceMount: se queda montado siempre — useSpringHeight anima su altura real al
              abrir/cerrar en vez de que Radix lo saque del DOM de un salto. El ref va en el div
              interno (no en CollapsibleContent) porque el wrapper de _ui/collapsible.tsx no
              reenvía ref. */}
          <CollapsibleContent forceMount>
            <div ref={contentRef}>
              <SidebarMenuSub>{children}</SidebarMenuSub>
            </div>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarMenu>
  )
}
