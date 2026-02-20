import { NavItem, NavSection, NavTypes } from '@/types/Navigation'
import {
  Cog,
  Computer,
  FileImageIcon,
  FileUser,
  FileWarning,
  FrameIcon,
  LayoutDashboard,
  LucideIcon,
  PlusIcon,
  Send,
  Table,
  Table2,
  Table2Icon,
  TimerIcon
} from 'lucide-react'
import { join } from 'path'
import EmployeeForm from '../PersonalManager/EmployeeForm'
import { FormActions } from '@/types/Global'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/app/_components/_ui/sidebar'
import { JSX } from 'react'

enum Actions {
  INDEX,
  SAVE,
  GET,
  DASHBOARD,
  CONTROL,
  ACCESS,
  NULL
}

const UriGenerator = (prefix: string, action: Actions) => {
  let result = ''
  switch (action) {
    case Actions.SAVE:
      result = 'save'
      break
    case Actions.GET:
      result = 'get'
      break
    case Actions.DASHBOARD:
      result = 'dashboard'
      break
    case Actions.CONTROL:
      result = 'control'
      break
    case Actions.INDEX:
      result = ''
      break

    default:
      result = ''
      break
  }

  const url: string = '/' + prefix + '/' + result

  console.log(url)

  return url
}

const TIME_MESH: NavSection = {
  title: 'Malla horaria',
  icon: TimerIcon,
  items: [
    {
      title: 'Ver mallas',
      icon: Table2Icon,
      url: UriGenerator('time', Actions.GET),

      type: NavTypes.LINK,
      desc: 'Mallas horarias registradas'
    }
  ]
}

const PERSONAL: NavSection = {
  title: 'Personal',
  icon: FileUser,
  items: [
    {
      title: 'Registrar Personal',
      component: () => <EmployeeForm action={FormActions.SAVE} />,
      type: NavTypes.BUTTON,

      desc: 'Registrar PEersonal',
      icon: PlusIcon
    },
    {
      title: 'Ver Personal',
      type: NavTypes.LINK,

      icon: Table2Icon,
      url: UriGenerator('personal', Actions.GET),
      desc: 'Ver Empleados'
    }
  ]
}

const COMPUTERS: NavSection = {
  title: 'Computadoras',
  icon: Computer,
  items: [
    {
      title: 'Panel',
      type: NavTypes.LINK,

      icon: FrameIcon,
      url: UriGenerator('computers', Actions.DASHBOARD),
      desc: 'Panel de computadoras'
    },
    {
      title: 'Ver equipos',
      type: NavTypes.LINK,

      icon: Table,
      url: UriGenerator('computers', Actions.CONTROL),
      desc: 'Control de computadoras'
    }
  ]
}

const REPORTS: NavSection = {
  title: 'Reportes',
  icon: FileWarning,
  items: [
    {
      title: 'Capturas de pantalla',
      type: NavTypes.LINK,
      icon: FileImageIcon,
      url: UriGenerator('screenshots', Actions.INDEX),
      desc: 'Ver reportes de capturas de pantalla'
    }
  ]
}

export const renderNavItem = (item: NavItem): JSX.Element => {
  switch (item.type) {
    case NavTypes.LINK:
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild className='cursor-pointer'>
            <a href={item.url}>
              <item.icon />
              <span>{item.title}</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )
    case NavTypes.BUTTON:
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton className='cursor-pointer' asChild>
            <div className='flex'>
              <item.icon />
              <item.component />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )
    default:
      return <></>
      break
  }
}
export const SECTIONS = [TIME_MESH, PERSONAL, COMPUTERS, REPORTS]
