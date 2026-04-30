'use client'
import { useState } from 'react'
import { THProductivity, getTHProductivityReport } from '@/app/th/actions'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { Loader2 } from 'lucide-react'

const today = () => new Date().toISOString().slice(0, 10)

const fmtMin = (m: number) => {
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}h ${min}m` : `${min}m`
}

const pctBadge = (pct: number, tip: string) => {
  const color =
    pct >= 70 ? 'bg-green-600 text-white' :
    pct >= 40 ? 'bg-yellow-500 text-white' :
    'bg-red-500 text-white'
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={`${color} cursor-default`}>{pct}%</Badge>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  )
}

export default function THProductivityReport() {
  const [date, setDate] = useState(today())
  const [data, setData] = useState<THProductivity[] | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setData(await getTHProductivityReport(date))
    } finally {
      setLoading(false)
    }
  }

  const withActivity = (data ?? []).filter(d => d.totalLoggedMinutes > 0)

  const avgOverall = withActivity.length > 0
    ? Math.round(withActivity.reduce((s, d) => s + d.overallProductivityPercent, 0) / withActivity.length)
    : null

  const avgCompliance = withActivity.length > 0
    ? Math.round(withActivity.reduce((s, d) => s + d.workCompliancePercent, 0) / withActivity.length)
    : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label>Fecha</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
        </div>
        <Button onClick={load} disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Cargando…</> : 'Generar reporte'}
        </Button>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border rounded-md p-3">
        <span><span className="font-semibold text-foreground">Apps prod.</span> = apps productivas / tiempo conectado</span>
        <span><span className="font-semibold text-foreground">Cumplimiento</span> = tiempo conectado / jornada programada</span>
        <span><span className="font-semibold text-foreground">Global</span> = apps productivas / jornada programada</span>
      </div>

      {data === null && !loading && (
        <p className="text-center text-sm text-muted-foreground py-10">
          Selecciona una fecha y genera el reporte.
        </p>
      )}

      {data !== null && withActivity.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-10">
          No se encontró actividad para esta fecha.
        </p>
      )}

      {withActivity.length > 0 && (
        <>
          <div className="flex gap-6 text-sm">
            <span>
              Productividad global promedio:{' '}
              <span className="font-semibold">{avgOverall}%</span>
            </span>
            <span>
              Cumplimiento horario promedio:{' '}
              <span className="font-semibold">{avgCompliance}%</span>
            </span>
            <span className="text-muted-foreground">
              {withActivity.length} de {data?.length} usuarios con actividad
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Jornada prog.</TableHead>
                <TableHead className="text-center">Apps prod.</TableHead>
                <TableHead className="text-center">Cumplimiento</TableHead>
                <TableHead className="text-center">Global</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead>Neutral</TableHead>
                <TableHead>Inactivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withActivity
                .sort((a, b) => b.overallProductivityPercent - a.overallProductivityPercent)
                .map(d => (
                  <TableRow key={d.user.id}>
                    <TableCell className="font-medium">{d.user.full_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {d.scheduledMinutes > 0 ? fmtMin(d.scheduledMinutes) : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      {pctBadge(d.appProductivityPercent, 'Apps productivas / tiempo conectado')}
                    </TableCell>
                    <TableCell className="text-center">
                      {pctBadge(d.workCompliancePercent, 'Tiempo conectado / jornada programada')}
                    </TableCell>
                    <TableCell className="text-center">
                      {pctBadge(d.overallProductivityPercent, 'Apps productivas / jornada programada')}
                    </TableCell>
                    <TableCell className="text-green-600 text-sm">{fmtMin(d.activeMinutes)}</TableCell>
                    <TableCell className="text-yellow-600 text-sm">{fmtMin(d.neutralMinutes)}</TableCell>
                    <TableCell className="text-red-500 text-sm">{fmtMin(d.inactiveMinutes)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  )
}
