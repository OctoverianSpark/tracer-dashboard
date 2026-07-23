'use client'
import { NavItem, NavSection, NavTypes } from '@/types/Navigation'
import {
  Cog,
  Computer,
  Cpu,
  Database,
  FileImageIcon,
  FileUser,
  FileWarning,
  FrameIcon,
  GroupIcon,
  Icon,
  LayoutDashboard,
  LucideIcon,
  PlusIcon,
  Send,
  Table2,
  Table2Icon,
  TimerIcon,
  ListChecks,
  User2Icon,
  UserCog2,
  UserPlus,
  UserPlus2,
  Users2,
  ShieldCheck,
  UserRoundCog,
  PackageOpen,
  ShieldAlert,
  TrendingUp,
  ClipboardCheck,
  Settings,
} from 'lucide-react'
import { join } from 'path'
import UserForm from '../UserManager/UserForm'
import { FormActions } from '@/types/Global'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/app/_components/_ui/sidebar'
import GroupForm from '../GroupsManager/GroupForm'
import { usePathname } from 'next/navigation'

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
      desc: 'Mallas horarias registradas',
      perm: 'view_schedules'
    },
    {
      title: 'Administrar Horarios',
      icon: Cog,
      url: UriGenerator('time', Actions.CONTROL),
      type: NavTypes.LINK,
      desc: 'Administrar horarios de entrada y salida',
      perm: 'manage_schedules'
    },
    {
      title: 'Estados de Trabajo',
      icon: ListChecks,
      url: UriGenerator('states', Actions.CONTROL),
      type: NavTypes.LINK,
      desc: 'Configurar nombres, colores y orden de los estados de la malla',
      perm: 'manage_states'
    }
  ]
}

const APPLICATION: NavSection = {
  title: 'Aplicacion',
  icon: Cpu,
  items: [
    {
      title: 'Registrar Usuario',
      component: () => <UserForm action={FormActions.SAVE} />,
      type: NavTypes.BUTTON,
      desc: 'Configurar usuarios',
      icon: UserPlus2,
      perm: 'manage_users'
    },
    {
      title: 'Ver usuarios',
      type: NavTypes.LINK,
      icon: User2Icon,
      url: UriGenerator('app/users', Actions.GET),
      desc: 'Ver Usuarios',
      perm: 'manage_users'
    },
    {
      title: 'Grupos',
      type: NavTypes.LINK,
      icon: Users2,
      url: UriGenerator('app/groups', Actions.GET),
      desc: 'Control de grupos',
      perm: 'manage_groups'
    },
    {
      title: 'Roles',
      type: NavTypes.LINK,
      icon: UserCog2,
      url: UriGenerator('app/roles', Actions.GET),
      desc: 'Control de roles',
      perm: 'manage_roles'
    },
    {
      title: 'Actualizaciones',
      type: NavTypes.LINK,
      icon: PackageOpen,
      url: '/app/releases',
      desc: 'Gestionar versiones del agente Tracer',
      perm: 'manage_releases'
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
      desc: 'Panel de computadoras',
      perm: 'manage_computers'
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
      desc: 'Ver reportes de capturas de pantalla',
      perm: 'view_screenshots'
    }
  ]
}

const SUPERVISORS: NavSection = {
  title: 'Supervisores',
  icon: ShieldCheck,
  items: [
    {
      title: 'Panel',
      type: NavTypes.LINK,
      icon: ShieldCheck,
      url: '/supervisors',
      desc: 'Usuarios conectados, productividad y categorización',
      perm: 'view_supervisors'
    }
  ]
}

const TH: NavSection = {
  title: 'Talento Humano',
  icon: UserRoundCog,
  items: [
    {
      title: 'Panel',
      type: NavTypes.LINK,
      icon: UserRoundCog,
      url: '/th',
      desc: 'Malla horaria, productividad y llegadas tarde',
      perm: 'view_th'
    }
  ]
}

const PRODUCTIVITY: NavSection = {
  title: 'Productividad',
  icon: TrendingUp,
  items: [
    {
      title: 'Dashboard',
      type: NavTypes.LINK,
      icon: TrendingUp,
      url: '/productivity',
      desc: 'Podio y curva de productividad por usuario',
      perm: 'view_productivity_dashboard'
    },
    {
      title: 'Cumplimiento y Productividad',
      type: NavTypes.LINK,
      icon: ClipboardCheck,
      url: '/productivity/compliance',
      desc: 'Reporte detallado de cumplimiento y productividad por usuario',
      perm: 'view_productivity_dashboard'
    }
  ]
}

const ADMIN: NavSection = {
  title: 'Administración',
  icon: ShieldAlert,
  items: [
    {
      title: 'Sesiones',
      type: NavTypes.LINK,
      icon: ShieldAlert,
      url: '/app/admin/sessions',
      desc: 'Cerrar la sesión de un usuario o de todos',
      perm: 'manage_sessions'
    },
    {
      title: 'Configuración',
      type: NavTypes.LINK,
      icon: Settings,
      url: '/app/admin/config',
      desc: 'Configurar los índices del cálculo de productividad',
      perm: 'manage_sessions'
    }
  ]
}

export function NavItemRenderer({ item }: { item: NavItem }) {
  const pathname = usePathname()

  switch (item.type) {
    case NavTypes.LINK:
      return (
        <SidebarMenuItem>
          <SidebarMenuButton asChild className={`cursor-pointer ${pathname === item.url ? 'bg-secondary' : ''}`}>
            <a href={item.url}>
              <item.icon />
              <span>{item.title}</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )
    case NavTypes.BUTTON:
      return (
        <SidebarMenuItem>
          <SidebarMenuButton className='cursor-pointer' asChild>
            <div className='flex'>
              <item.icon />
              <item.component />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )
    default:
      return null
  }
}
export const SECTIONS = [TIME_MESH,ADMIN, PRODUCTIVITY,SUPERVISORS, TH, APPLICATION, COMPUTERS, REPORTS]
