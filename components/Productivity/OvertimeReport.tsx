'use client'
import { useEffect, useRef, useState } from 'react'
import { getOvertimeReport } from '@/app/supervisors/actions'
import { UserOvertime } from '@/lib/productivity'
import { getappuser } from '@/app/app/actions'
import { getGroups } from '@/app/app/groups/actions'
import { AppUser, Group } from '@/types/AppUser'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Switch } from '@/app/_components/_ui/switch'
import { UserSelect } from '@/components/UserSelect'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/app/_components/_ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { useStaggerChildren, STAGGER_ITEM_INITIAL_STYLE } from '@/lib/animation'
import { Loader2, Download, X, TriangleAlert } from 'lucide-react'
import * as XLSX from 'xlsx'

const today = () => {
  const bogota = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  return bogota.toLocaleDateString('sv')
}

const fmtSecs = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function statusBadge(d: UserOvertime) {
  if (d.confirmedSeconds > 0 && d.detectedSeconds > 0) {
    return <Badge className='bg-blue-600 text-white'>Mixto</Badge>
  }
  if (d.confirmedSeconds > 0) {
    return <Badge className='bg-green-600 text-white'>Confirmado</Badge>
  }
  return <Badge className='bg-yellow-500 text-white'>Detectado</Badge>
}

function exportXLSX(rows: UserOvertime[], groups: Group[], dateFrom: string, dateTo: string) {
  const groupMap  = new Map(groups.map(g => [g.id!, g.name]))
  const groupName = (d: UserOvertime) => d.user.group_id ? (groupMap.get(d.user.group_id) ?? 'Sin grupo') : 'Sin grupo'

  const sorted = [...rows].sort((a, b) => b.totalSeconds - a.totalSeconds)

  const HEADERS = ['Grupo', 'Usuario', 'Salida programada', 'Horario real', 'Días con horas extra', 'Confirmado (min)', 'Detectado (min)', 'Total (min)']
  const toRow = (d: UserOvertime) => [
    groupName(d), d.user.full_name,
    d.programation?.end_day ?? '—',
    d.usesDefaultSchedule ? 'No — usa horario genérico 08:00-18:00' : 'Sí',
    d.daysWithOvertime,
    Math.round(d.confirmedSeconds / 60),
    Math.round(d.detectedSeconds / 60),
    Math.round(d.totalSeconds / 60),
  ]

  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...sorted.map(toRow)])
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: HEADERS.length - 1, r: sorted.length } }) }
  ws['!cols'] = [{ wch: 22 }, { wch: 32 }, { wch: 18 }, { wch: 32 }, ...Array(4).fill({ wch: 18 })]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Horas extra')
  const suffix = dateFrom === dateTo ? dateFrom : `${dateFrom}_a_${dateTo}`
  XLSX.writeFile(wb, `horas_extra_${suffix}.xlsx`)
}

export default function OvertimeReport() {
  const [dateFrom, setDateFrom] = useState(today())
  const [dateTo, setDateTo]     = useState(today())
  const [userId, setUserId]     = useState('')
  const [groupId, setGroupId]   = useState('')
  const [soloConHoras, setSoloConHoras] = useState(true)
  // Por defecto se ocultan las filas sin horario real: su "salida programada" es el fallback
  // genérico (08:00-18:00) de lib/productivity.ts, así que cualquier jornada normal más larga se
  // ve como "hora extra" sin serlo. Se pueden mostrar igual, pero con advertencia visible.
  const [excluirSinHorario, setExcluirSinHorario] = useState(true)
  const [data, setData]         = useState<UserOvertime[] | null>(null)
  const [groups, setGroups]     = useState<Group[]>([])
  const [users, setUsers]       = useState<AppUser[]>([])
  const [loading, setLoading]   = useState(false)

  const rangeInvalid = dateTo < dateFrom

  useEffect(() => { getappuser().then(setUsers) }, [])
  useEffect(() => { getGroups().then(setGroups) }, [])

  const load = async () => {
    if (rangeInvalid) return
    setLoading(true)
    try {
      const [report, grps] = await Promise.all([
        getOvertimeReport(dateFrom, dateTo, userId ? Number(userId) : undefined),
        getGroups(),
      ])
      setData(report)
      setGroups(grps)
    } finally {
      setLoading(false)
    }
  }

  const filtered = (data ?? [])
    .filter(d => !soloConHoras || d.totalSeconds > 0)
    .filter(d => !excluirSinHorario || !d.usesDefaultSchedule)
    .filter(d => !groupId || d.user.group_id === Number(groupId))
    .sort((a, b) => b.totalSeconds - a.totalSeconds)

  const withOvertime = (data ?? []).filter(d => d.totalSeconds > 0)
  const reliable = withOvertime.filter(d => !d.usesDefaultSchedule)
  const unreliableCount = withOvertime.length - reliable.length
  const totalSeconds = reliable.reduce((s, d) => s + d.totalSeconds, 0)
  const avgSeconds = reliable.length > 0 ? Math.round(totalSeconds / reliable.length) : 0
  const detectedOnlyCount = reliable.filter(d => d.confirmedSeconds === 0).length

  const bodyRef = useRef<HTMLTableSectionElement>(null)
  useStaggerChildren(bodyRef, { deps: [filtered.map(d => d.user.id).join(',')] })

  return (
    <div className='space-y-4'>
      {/* Controles */}
      <div className='flex flex-wrap items-end gap-3'>
        <div className='grid gap-1.5 w-full sm:w-auto'>
          <Label>Desde</Label>
          <Input
            type='date' value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); if (e.target.value > dateTo) setDateTo(e.target.value) }}
            className='w-full sm:w-44'
          />
        </div>
        <div className='grid gap-1.5 w-full sm:w-auto'>
          <Label>Hasta</Label>
          <Input
            type='date' value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className={`w-full sm:w-44 ${rangeInvalid ? 'border-destructive' : ''}`}
          />
        </div>
        <div className='grid gap-1.5 w-full sm:w-56'>
          <Label>Usuario</Label>
          <div className='flex items-center gap-1'>
            <UserSelect users={users} value={userId} onValueChange={setUserId} placeholder='Todos los usuarios' />
            {userId && (
              <Button type='button' variant='ghost' size='icon-sm' className='shrink-0 cursor-pointer' onClick={() => setUserId('')}>
                <X className='h-4 w-4' />
              </Button>
            )}
          </div>
        </div>
        <div className='grid gap-1.5 w-full sm:w-48'>
          <Label>Grupo</Label>
          <div className='flex items-center gap-1'>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Todos los grupos' />
              </SelectTrigger>
              <SelectContent>
                {groups.map(g => (
                  <SelectItem key={g.id} value={`${g.id}`}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {groupId && (
              <Button type='button' variant='ghost' size='icon-sm' className='shrink-0 cursor-pointer' onClick={() => setGroupId('')}>
                <X className='h-4 w-4' />
              </Button>
            )}
          </div>
        </div>
        <div className='flex items-center gap-2 pb-0.5'>
          <Switch id='solo-con-horas' checked={soloConHoras} onCheckedChange={setSoloConHoras} />
          <Label htmlFor='solo-con-horas' className='cursor-pointer'>Solo con horas extra</Label>
        </div>
        <div className='flex items-center gap-2 pb-0.5'>
          <Switch id='excluir-sin-horario' checked={excluirSinHorario} onCheckedChange={setExcluirSinHorario} />
          <Label htmlFor='excluir-sin-horario' className='cursor-pointer'>Excluir sin horario real</Label>
        </div>
        <Button onClick={load} disabled={loading || rangeInvalid}>
          {loading ? <><Loader2 className='h-4 w-4 animate-spin mr-2' />Cargando…</> : 'Generar reporte'}
        </Button>
        {filtered.length > 0 && (
          <Button variant='outline' onClick={() => exportXLSX(filtered, groups, dateFrom, dateTo)}>
            <Download className='h-4 w-4 mr-2' />
            Exportar Excel
          </Button>
        )}
      </div>
      {rangeInvalid && (
        <p className='text-xs text-destructive'>La fecha &quot;Hasta&quot; no puede ser anterior a &quot;Desde&quot;.</p>
      )}

      {/* Leyenda */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground border rounded-md p-3'>
        <span>
          <span className='font-semibold text-foreground'>Confirmado</span>
          {' '}= la persona marcó &quot;Horas Extras&quot; en el agente antes de quedarse
        </span>
        <span>
          <span className='font-semibold text-foreground'>Detectado</span>
          {' '}= siguió activa después de su salida programada, sin marcar el estado — revisar antes de cargar
        </span>
        <span>Margen de gracia: 5 min después de la hora de salida programada.</span>
        <span className='flex items-center gap-1'>
          <TriangleAlert className='h-3.5 w-3.5 text-yellow-600 shrink-0' />
          <span className='font-semibold text-foreground'>Sin horario real</span>
          {' '}= no tiene horario asignado, se comparó contra un horario genérico (08:00-18:00) — no confiable
        </span>
      </div>

      {/* Estados vacíos */}
      {data === null && !loading && (
        <p className='text-center text-sm text-muted-foreground py-10'>
          Selecciona una fecha y genera el reporte.
        </p>
      )}
      {data !== null && filtered.length === 0 && (
        <p className='text-center text-sm text-muted-foreground py-10'>
          {soloConHoras ? 'Nadie registró horas extra confiables en ese rango.' : 'No hay datos para mostrar.'}
        </p>
      )}

      {/* Resumen — calculado SOLO sobre personas con horario real; ver aviso aparte para las que no */}
      {withOvertime.length > 0 && (
        <>
          <div className='flex flex-wrap gap-4 border rounded-md p-3'>
            <div className='flex flex-col gap-0.5'>
              <span className='text-xs text-muted-foreground'>Horas extra totales</span>
              <span className='text-lg font-semibold'>{fmtSecs(totalSeconds)}</span>
            </div>
            <div className='flex flex-col gap-0.5'>
              <span className='text-xs text-muted-foreground'>Personas con horas extra</span>
              <span className='text-lg font-semibold'>{reliable.length} <span className='text-sm font-normal text-muted-foreground'>/ {(data ?? []).length}</span></span>
            </div>
            <div className='flex flex-col gap-0.5'>
              <span className='text-xs text-muted-foreground'>Promedio por persona</span>
              <span className='text-lg font-semibold'>{fmtSecs(avgSeconds)}</span>
            </div>
            <div className='flex flex-col gap-0.5'>
              <span className='text-xs text-muted-foreground'>Sin confirmar en el agente</span>
              <span className='text-lg font-semibold text-yellow-600'>{detectedOnlyCount} <span className='text-sm font-normal text-muted-foreground'>/ {reliable.length}</span></span>
            </div>
          </div>
          {unreliableCount > 0 && (
            <div className='flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3'>
              <TriangleAlert className='h-4 w-4 shrink-0' />
              <span>
                {unreliableCount} persona(s) más muestran actividad después de las 18:00 pero no
                tienen horario asignado — no se cuentan arriba porque no son horas extra
                confiables, solo reflejan un horario real distinto al genérico.
                {excluirSinHorario ? ' Desactiva "Excluir sin horario real" para verlas.' : ''}
              </span>
            </div>
          )}
        </>
      )}

      {/* Tabla */}
      {filtered.length > 0 && (
        <div className='rounded-md border overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead className='text-right'>Salida programada</TableHead>
                <TableHead className='text-right'>Días</TableHead>
                <TableHead className='text-right text-green-600'>Confirmado</TableHead>
                <TableHead className='text-right text-yellow-500'>Detectado</TableHead>
                <TableHead className='text-right'>Total</TableHead>
                <TableHead className='text-center'>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody ref={bodyRef}>
              {filtered.map(d => (
                <TableRow
                  key={d.user.id ?? d.user.full_name}
                  data-stagger-item
                  style={STAGGER_ITEM_INITIAL_STYLE}
                  className={d.usesDefaultSchedule ? 'bg-yellow-500/5' : ''}
                >
                  <TableCell className='font-medium whitespace-nowrap'>
                    <div className='flex items-center gap-1.5'>
                      {d.user.full_name}
                      {d.usesDefaultSchedule && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <TriangleAlert className='h-3.5 w-3.5 text-yellow-600 shrink-0 cursor-default' />
                          </TooltipTrigger>
                          <TooltipContent side='top' className='max-w-xs text-center'>
                            Sin horario asignado — comparado contra el horario genérico (08:00-18:00), no confiable
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='text-right text-muted-foreground text-sm'>
                    {d.programation?.end_day ?? '—'}
                  </TableCell>
                  <TableCell className='text-right text-sm'>{d.daysWithOvertime}</TableCell>
                  <TableCell className='text-right text-green-600 text-sm'>
                    {d.confirmedSeconds > 0 ? fmtSecs(d.confirmedSeconds) : '—'}
                  </TableCell>
                  <TableCell className='text-right text-yellow-500 text-sm'>
                    {d.detectedSeconds > 0 ? fmtSecs(d.detectedSeconds) : '—'}
                  </TableCell>
                  <TableCell className='text-right font-medium text-sm'>
                    {d.totalSeconds > 0 ? fmtSecs(d.totalSeconds) : '—'}
                  </TableCell>
                  <TableCell className='text-center'>
                    {d.totalSeconds > 0 ? statusBadge(d) : <span className='text-muted-foreground text-xs'>—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
