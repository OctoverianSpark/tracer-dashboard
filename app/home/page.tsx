'use client'
import { Clock, Monitor, TrendingUp, Users } from 'lucide-react'
import { Card, CardContent } from '../_components/_ui/card'
import StatCard from '@/components/Home/StatCard'
import { getStats, getUserSchedule } from './actions'
import { useSession } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { Programation, Schedule } from '@/types/Schedules'
import { useEnterAnimation, useStaggerChildren, INITIAL_STYLE, STAGGER_ITEM_INITIAL_STYLE } from '@/lib/animation'

const STAT_CONFIG = [
  { key: 'active_users'  as const, label: 'Usuarios activos',       icon: Users       },
  { key: 'computers'     as const, label: 'Equipos monitoreados',   icon: Monitor     },
  { key: 'hours_today'   as const, label: 'Horas registradas hoy',  icon: Clock       },
  { key: 'productivity'  as const, label: 'Productividad promedio', icon: TrendingUp  },
]

const DAY_ORDER = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const
const DAY_KEYS  = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const
const DAY_LABEL: Record<string, string> = { L: 'Lun', M: 'Mar', X: 'Mié', J: 'Jue', V: 'Vie', S: 'Sáb', D: 'Dom' }

export default function Page() {
  const { data: session } = useSession()

  const [stats, setStats]           = useState<Awaited<ReturnType<typeof getStats>> | null>(null)
  const [schedules, setSchedules]   = useState<Schedule[]>([])
  const [progs, setProgs]           = useState<Programation[]>([])

  const userId = Number(session?.appUser?.id)

  useEffect(() => { getStats().then(setStats) }, [])

  useEffect(() => {
    if (!userId) return
    getUserSchedule(userId).then(({ schedules, programations }) => {
      setSchedules(schedules)
      setProgs(programations)
    })
  }, [userId])

  const todayKey = DAY_KEYS[new Date().getDay()]

  const headingRef = useRef<HTMLDivElement>(null)
  useEnterAnimation(headingRef, 'fadeUp')

  const statsRef = useRef<HTMLDivElement>(null)
  useStaggerChildren(statsRef)

  const scheduleRef = useRef<HTMLDivElement>(null)
  useStaggerChildren(scheduleRef, { deps: [schedules.length] })

  return (
    <div className='space-y-6'>
      <div ref={headingRef} style={INITIAL_STYLE.fadeUp}>
        <h1 className='text-2xl font-semibold'>
          Bienvenido, {session?.appUser?.full_name?.split(' ')[0]}
        </h1>
        <p className='text-muted-foreground text-sm'>Aquí tienes un resumen de hoy</p>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-4' ref={statsRef}>
        {STAT_CONFIG.map(({ key, label, icon }) => (
          <div key={key} data-stagger-item style={STAGGER_ITEM_INITIAL_STYLE}>
            <StatCard label={label} value={stats?.[key] ?? '—'} icon={icon} />
          </div>
        ))}
      </div>

      <div>
        <h2 className='text-lg font-semibold mb-3'>Tu horario</h2>
        {schedules.length === 0 ? (
          <p className='text-sm text-muted-foreground'>No tienes horario asignado.</p>
        ) : (
          <div className='grid grid-cols-4 sm:grid-cols-7 gap-2' ref={scheduleRef}>
            {DAY_ORDER.map(day => {
              const sched = schedules.find(s => s.day_of_week === day)
              const prog  = sched ? progs.find(p => p.id === sched.programation_id) : null
              const isToday = day === todayKey

              return (
                <div key={day} data-stagger-item style={STAGGER_ITEM_INITIAL_STYLE}>
                  <Card
                    className={`text-center transition-colors ${isToday ? 'border-primary bg-primary/5' : ''} ${!sched ? 'opacity-40' : ''}`}
                  >
                    <CardContent className='p-3 space-y-1'>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                        {DAY_LABEL[day]}
                        {isToday && <span className='ml-1 text-[9px] bg-primary text-primary-foreground rounded px-1'>Hoy</span>}
                      </p>
                      {prog ? (
                        <>
                          <p className='text-sm font-medium leading-tight'>{prog.name}</p>
                          <p className='text-[11px] text-muted-foreground tabular-nums'>
                            {prog.start_day}{prog.end_day ? ` – ${prog.end_day}` : ''}
                          </p>
                        </>
                      ) : (
                        <p className='text-xs text-muted-foreground'>—</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}