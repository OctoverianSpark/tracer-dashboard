'use client'
import { useEffect, useState } from 'react'
import { THProductivity, getTHProductivityReport } from '@/app/th/actions'
import { getGroups } from '@/app/app/groups/actions'
import { getappuser } from '@/app/app/actions'
import { AppUser, Group } from '@/types/AppUser'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { UserSelect } from '@/components/UserSelect'
import {
  Table, TableCell, TableHead, TableHeader, TableRow,
} from '@/app/_components/_ui/table'
import { MotionTableBody, MotionTableRow } from '@/components/motion/MotionTable'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { Loader2, Download, X } from 'lucide-react'
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
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}h ${min}m` : `${min}m`
}

const pctBadge = (pct: number, tip: string) => {
  const color = pct >= 70 ? 'bg-green-600 text-white' : pct >= 40 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={`${color} cursor-default`}>{pct}%</Badge>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  )
}

function exportXLSX(rows: THProductivity[], groups: Group[], dateFrom: string, dateTo: string) {
  const groupMap  = new Map(groups.map(g => [g.id!, g.name]))
  const groupName = (d: THProductivity) =>
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

  const toRow = (d: THProductivity) => [
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
  const byGroup = new Map<string, THProductivity[]>()
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
  XLSX.writeFile(wb, `productividad_th_${suffix}.xlsx`)
}

export default function THProductivityReport() {
  const [dateFrom, setDateFrom] = useState(today())
  const [dateTo, setDateTo] = useState(today())
  const [userId, setUserId] = useState('')
  const [data, setData] = useState<THProductivity[] | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(false)

  const rangeInvalid = dateTo < dateFrom

  useEffect(() => { getappuser().then(setUsers) }, [])

  const load = async () => {
    if (rangeInvalid) return
    setLoading(true)
    try {
      const [report, grps] = await Promise.all([
        getTHProductivityReport(dateFrom, dateTo, userId ? Number(userId) : undefined),
        getGroups(),
      ])
      setData(report)
      setGroups(grps)
    } finally {
      setLoading(false)
    }
  }

  const withActivity = (data ?? []).filter(d => d.totalSeconds > 0)

  const avgOverall = withActivity.length > 0
    ? Math.round(withActivity.reduce((s, d) => s + d.overallProductivityPercent, 0) / withActivity.length) : null
  const avgCompliance = withActivity.length > 0
    ? Math.round(withActivity.reduce((s, d) => s + d.workCompliancePercent, 0) / withActivity.length) : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label>Desde</Label>
          <Input
            type="date" value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); if (e.target.value > dateTo) setDateTo(e.target.value) }}
            className="w-44"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Hasta</Label>
          <Input
            type="date" value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className={`w-44 ${rangeInvalid ? 'border-destructive' : ''}`}
          />
        </div>
        <div className="grid gap-1.5 w-56">
          <Label>Usuario</Label>
          <div className="flex items-center gap-1">
            <UserSelect users={users} value={userId} onValueChange={setUserId} placeholder="Todos los usuarios" />
            {userId && (
              <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 cursor-pointer" onClick={() => setUserId('')}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <Button onClick={load} disabled={loading || rangeInvalid}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Cargando…</> : 'Generar reporte'}
        </Button>
        {withActivity.length > 0 && (
          <Button variant="outline" onClick={() => exportXLSX(withActivity, groups, dateFrom, dateTo)}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        )}
      </div>
      {rangeInvalid && (
        <p className="text-xs text-destructive">La fecha &quot;Hasta&quot; no puede ser anterior a &quot;Desde&quot;.</p>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border rounded-md p-3">
        <span><span className="font-semibold text-foreground">Apps prod.</span> = productivas / (prod + improd)</span>
        <span><span className="font-semibold text-foreground">Cumplimiento</span> = intervalos activos × 5 min ÷ jornada programada</span>
        <span><span className="font-semibold text-foreground">Global</span> = (productivo + sin-categ × 30%) ÷ jornada programada</span>
      </div>

      {data === null && !loading && (
        <p className="text-center text-sm text-muted-foreground py-10">Selecciona una fecha y genera el reporte.</p>
      )}
      {data !== null && withActivity.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-10">No se encontró actividad para esta fecha.</p>
      )}

      {withActivity.length > 0 && (
        <>
          <div className="flex gap-6 text-sm">
            <span>Productividad global promedio: <span className="font-semibold">{avgOverall}%</span></span>
            <span>Cumplimiento horario promedio: <span className="font-semibold">{avgCompliance}%</span></span>
            <span className="text-muted-foreground">{withActivity.length} de {data?.length} usuarios con actividad</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Jornada prog.</TableHead>
                <TableHead className="text-center">Apps prod.</TableHead>
                <TableHead className="text-center">Cumplimiento</TableHead>
                <TableHead className="text-center">Global</TableHead>
                <TableHead>Productivo</TableHead>
                <TableHead>Improductivo</TableHead>
                <TableHead>Sin categoría</TableHead>
              </TableRow>
            </TableHeader>
            <MotionTableBody variants={staggerContainer} initial="initial" animate="animate">
              {withActivity
                .sort((a, b) => b.overallProductivityPercent - a.overallProductivityPercent)
                .map(d => (
                  <MotionTableRow key={d.user.id ?? d.user.full_name} variants={staggerItem}>
                    <TableCell className="font-medium">{d.user.full_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {d.scheduledMinutes > 0 ? fmtMin(d.scheduledMinutes) : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      {pctBadge(d.appProductivityPercent, 'Apps productivas / (prod + improd)')}
                    </TableCell>
                    <TableCell className="text-center">
                      {pctBadge(d.workCompliancePercent, 'Tiempo total / jornada programada')}
                    </TableCell>
                    <TableCell className="text-center">
                      {pctBadge(d.overallProductivityPercent, 'Apps productivas / jornada programada')}
                    </TableCell>
                    <TableCell className="text-green-600 text-sm">{fmtSecs(d.productiveSeconds)}</TableCell>
                    <TableCell className="text-red-500 text-sm">{fmtSecs(d.unproductiveSeconds)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{fmtSecs(d.uncategorizedSeconds)}</TableCell>
                  </MotionTableRow>
                ))}
            </MotionTableBody>
          </Table>
        </>
      )}
    </div>
  )
}
