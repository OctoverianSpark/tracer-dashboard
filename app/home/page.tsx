'use client'
import { Clock, Monitor, TrendingUp, Users } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { Card, CardContent } from '../_components/_ui/card'
import StatCard from '@/components/Home/StatCard'
import { getStats } from './actions'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'


const STAT_CONFIG = [
  { key: 'active_users',    label: 'Usuarios activos',       icon: Users       },
  { key: 'computers',       label: 'Equipos monitoreados',   icon: Monitor     },
  { key: 'hours_today',     label: 'Horas registradas hoy',  icon: Clock       },
  { key: 'productivity',    label: 'Productividad promedio', icon: TrendingUp  },
]

export default function Page() {
  const {data: session} = useSession()

  const [stats, setStats] = useState<Awaited<ReturnType<typeof getStats>> | null>(null)

  useEffect(()=>{
    getStats().then(setStats)

  },[])

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold'>
          Bienvenido, {session?.appUser?.full_name?.split(' ')[0]}
        </h1>
        <p className='text-muted-foreground text-sm'>Aquí tienes un resumen de hoy</p>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        {STAT_CONFIG.map(({ key, label, icon }) => (
          <StatCard
            key={key}
            label={label}
            value={stats?.[key] ?? '—'}
            icon={icon}
          />
        ))}
      </div>
    </div>
  )
}