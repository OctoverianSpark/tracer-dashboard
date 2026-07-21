'use client'
import { useEffect, useState } from 'react'
import { getProductivityReport } from '@/app/supervisors/actions'
import { UserProductivity } from '@/lib/productivity'
import { getGroups } from '@/app/app/groups/actions'
import { getappuser } from '@/app/app/actions'
import { AppUser, Group } from '@/types/AppUser'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Switch } from '@/app/_components/_ui/switch'
import { UserSelect } from '@/components/UserSelect'
import {
  Table, TableCell, TableHead, TableHeader, TableRow,
} from '@/app/_components/_ui/table'
import { MotionTableBody, MotionTableRow } from '@/components/motion/MotionTable'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/app/_components/_ui/collapsible'
import { Loader2, ChevronDown, Download, X } from 'lucide-react'
import * as XLSX from 'xlsx'

// Usa Bogotá (UTC-5) para que "hoy" coincida con la zona horaria de los timestamps en BD,
// sin importar la zona horaria del navegador del usuario.
const today = () => {
  const bogota = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  return bogota.toLocaleDateString('sv')
}

const fmtSecs = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const fmtMin = (m: number) => {
  const h   = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}h ${min}m` : `${min}m`
}

const pctBadge = (pct: number, tip: string) => {
  const color = pct >= 70 ? 'bg-green-600 text-white' : pct >= 40 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={`${color} cursor-default min-w-11.5 justify-center`}>{pct}%</Badge>
      </TooltipTrigger>
      <TooltipContent side='top' className='max-w-xs text-center'>{tip}</TooltipContent>
    </Tooltip>
  )
}

const categoryDot = (cat: string) =>
  cat === 'productive' ? 'bg-green-500' : cat === 'unproductive' ? 'bg-red-400' : 'bg-muted-foreground/40'

function TopAppsRow({ data }: { data: UserProductivity }) {
  const [open, setOpen] = useState(false)
  if (data.topApps.length === 0) return null

  return (
    <TableRow className='bg-muted/30 hover:bg-muted/30'>
      <TableCell colSpan={9} className='py-2 px-6'>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className='flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer'>
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            Ver apps ({data.topApps.length})
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className='flex flex-wrap gap-2 pt-2'>
              {data.topApps.map(a => (
                <span key={a.app} className='flex items-center gap-1 text-xs bg-background border rounded px-2 py-0.5'>
                  <span className={`w-1.5 h-1.5 rounded-full ${categoryDot(a.category)}`} />
                  {a.app}
                  <span className='text-muted-foreground ml-1'>{fmtSecs(a.seconds)}</span>
                </span>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </TableCell>
    </TableRow>
  )
}

function exportXLSX(rows: UserProductivity[], groups: Group[], dateFrom: string, dateTo: string) {
  const groupMap   = new Map(groups.map(g => [g.id!, g.name]))
  const groupName  = (d: UserProductivity) =>
    d.user.group_id ? (groupMap.get(d.user.group_id) ?? 'Sin grupo') : 'Sin grupo'

  const sorted = [...rows].sort((a, b) => {
    const gA = a.user.group_id ?? Infinity
    const gB = b.user.group_id ?? Infinity
    return gA !== gB ? gA - gB : b.overallProductivityPercent - a.overallProductivityPercent
  })

  const HEADERS = [
    'Grupo', 'Usuario', 'Jornada prog. (min)', 'Tiempo en apps (min)',
    'Apps prod. (%)', 'Cumplimiento (%)', 'Global (%)',
    'Productivo (min)', 'Improductivo (min)', 'Sin categoría (min)',
  ]
  const COL_WIDTHS = [{ wch: 22 }, { wch: 32 }, ...Array(8).fill({ wch: 20 })]

  const toRow = (d: UserProductivity) => [
    groupName(d), d.user.full_name,
    d.scheduledMinutes,
    Math.round(d.totalSeconds / 60),
    d.appProductivityPercent, d.workCompliancePercent, d.overallProductivityPercent,
    Math.round(d.productiveSeconds / 60),
    Math.round(d.unproductiveSeconds / 60),
    Math.round(d.uncategorizedSeconds / 60),
  ]

  const wb = XLSX.utils.book_new()

  // Hoja "Todos" con autofiltro
  const allAoa = [HEADERS, ...sorted.map(toRow)]
  const wsAll  = XLSX.utils.aoa_to_sheet(allAoa)
  wsAll['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: HEADERS.length - 1, r: allAoa.length - 1 } }) }
  wsAll['!cols'] = COL_WIDTHS
  XLSX.utils.book_append_sheet(wb, wsAll, 'Todos')

  // Una hoja por grupo
  const byGroup = new Map<string, UserProductivity[]>()
  for (const d of sorted) {
    const name = groupName(d)
    if (!byGroup.has(name)) byGroup.set(name, [])
    byGroup.get(name)!.push(d)
  }
  for (const [name, groupRows] of byGroup) {
    const aoa = [HEADERS, ...groupRows.map(toRow)]
    const ws  = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = COL_WIDTHS
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31).replace(/[/\\?*[\]]/g, '_'))
  }

  const suffix = dateFrom === dateTo ? dateFrom : `${dateFrom}_a_${dateTo}`
  XLSX.writeFile(wb, `productividad_${suffix}.xlsx`)
}

export default function ProductivityReport() {
  const [dateFrom, setDateFrom]     = useState(today())
  const [dateTo, setDateTo]         = useState(today())
  const [userId, setUserId]         = useState('')
  const [minPercent, setMinPercent] = useState(0)
  const [soloActivos, setSoloActivos] = useState(true)
  const [data, setData]             = useState<UserProductivity[] | null>(null)
  const [groups, setGroups]         = useState<Group[]>([])
  const [users, setUsers]           = useState<AppUser[]>([])
  const [loading, setLoading]       = useState(false)

  const rangeInvalid = dateTo < dateFrom

  useEffect(() => { getappuser().then(setUsers) }, [])

  const load = async () => {
    if (rangeInvalid) return
    setLoading(true)
    try {
      const [report, grps] = await Promise.all([
        getProductivityReport(dateFrom, dateTo, userId ? Number(userId) : undefined),
        getGroups(),
      ])
      setData(report)
      setGroups(grps)
    } finally {
      setLoading(false)
    }
  }

  const filtered = (data ?? [])
    .filter(d => !soloActivos || d.totalSeconds > 0)
    .filter(d => d.overallProductivityPercent >= minPercent)
    .sort((a, b) => b.overallProductivityPercent - a.overallProductivityPercent)

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
        <div className='grid gap-1.5 w-full sm:w-auto'>
          <Label>Productividad global mínima (%)</Label>
          <Input
            type='number' min={0} max={100} value={minPercent}
            onChange={e => setMinPercent(Number(e.target.value))}
            className='w-full sm:w-32'
          />
        </div>
        <div className='flex items-center gap-2 pb-0.5'>
          <Switch id='solo-activos' checked={soloActivos} onCheckedChange={setSoloActivos} />
          <Label htmlFor='solo-activos' className='cursor-pointer'>Solo con actividad</Label>
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

      {/* Leyenda de métricas */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground border rounded-md p-3'>
        <span>
          <span className='font-semibold text-foreground'>Apps prod.</span>
          {' '}= tiempo en apps productivas ÷ (prod + improd), solo en estado activo
        </span>
        <span>
          <span className='font-semibold text-foreground'>Cumplimiento</span>
          {' '}= intervalos activos × 5 min ÷ jornada programada
        </span>
        <span>
          <span className='font-semibold text-foreground'>Global</span>
          {' '}= (productivo + sin-categ × 30%) ÷ jornada programada
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
          {(() => {
            const conActividad = (data ?? []).filter(d => d.totalSeconds > 0).length
            if (soloActivos && conActividad === 0) return 'Ningún usuario registró actividad en esa fecha.'
            if (minPercent > 0) return `Ningún usuario activo supera ${minPercent}% de productividad global.`
            return 'No hay datos para mostrar con los filtros actuales.'
          })()}
        </p>
      )}
      {data !== null && filtered.length > 0 && (
        <p className='text-xs text-muted-foreground'>
          {filtered.length} de {data.length} usuarios
        </p>
      )}

      {/* Tabla */}
      {filtered.length > 0 && (
        <div className='rounded-md border overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead className='text-right'>Jornada</TableHead>
                <TableHead className='text-right'>T. en apps</TableHead>
                <TableHead className='text-center'>Apps prod.</TableHead>
                <TableHead className='text-center'>Cumplimiento</TableHead>
                <TableHead className='text-center'>Global</TableHead>
                <TableHead className='text-right text-green-600'>Productivo</TableHead>
                <TableHead className='text-right text-red-500'>Improductivo</TableHead>
                <TableHead className='text-right'>Sin categ.</TableHead>
              </TableRow>
            </TableHeader>
            <MotionTableBody variants={staggerContainer} initial="initial" animate="animate">
              {filtered.flatMap(d => [
                <MotionTableRow key={d.user.id ?? d.user.full_name} variants={staggerItem}>
                  <TableCell className='font-medium whitespace-nowrap'>{d.user.full_name}</TableCell>

                  <TableCell className='text-right text-muted-foreground text-sm'>
                    {d.scheduledMinutes > 0 ? fmtMin(d.scheduledMinutes) : '—'}
                  </TableCell>

                  <TableCell className='text-right text-sm'>
                    {d.totalSeconds > 0 ? fmtSecs(d.totalSeconds) : '—'}
                  </TableCell>

                  <TableCell className='text-center'>
                    {pctBadge(d.appProductivityPercent,
                      'Tiempo en apps productivas ÷ (productivas + improductivas)\nSolo se cuentan intervalos en estado ACTIVO')}
                  </TableCell>

                  <TableCell className='text-center'>
                    {pctBadge(d.workCompliancePercent,
                      'Tiempo total en apps (estado activo) ÷ jornada programada')}
                  </TableCell>

                  <TableCell className='text-center'>
                    {pctBadge(d.overallProductivityPercent,
                      'Tiempo en apps productivas (estado activo) ÷ jornada programada')}
                  </TableCell>

                  <TableCell className='text-right text-green-600 text-sm'>
                    {d.productiveSeconds > 0 ? fmtSecs(d.productiveSeconds) : '—'}
                  </TableCell>

                  <TableCell className='text-right text-red-500 text-sm'>
                    {d.unproductiveSeconds > 0 ? fmtSecs(d.unproductiveSeconds) : '—'}
                  </TableCell>

                  <TableCell className='text-right text-muted-foreground text-sm'>
                    {d.uncategorizedSeconds > 0 ? fmtSecs(d.uncategorizedSeconds) : '—'}
                  </TableCell>
                </MotionTableRow>,
                <TopAppsRow key={`apps-${d.user.id ?? d.user.full_name}`} data={d} />,
              ])}
            </MotionTableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
