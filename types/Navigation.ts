import { LucideIcon } from "lucide-react"
import React, { JSX } from "react"

type BaseNavItem = {
  title: string
  desc: string
  icon: LucideIcon
  perm: string
}

type LinkNavItem = BaseNavItem & {
  type: NavTypes.LINK
  url: string
  component?: never
}

type ButtonNavItem = BaseNavItem & {
  type: NavTypes.BUTTON
  component: () => JSX.Element
  url?: never
}

export type NavItem = LinkNavItem | ButtonNavItem

export interface NavSection {
  title: string
  icon: LucideIcon
  items: NavItem[]


}



export enum NavTypes {
  LINK,
  BUTTON
}