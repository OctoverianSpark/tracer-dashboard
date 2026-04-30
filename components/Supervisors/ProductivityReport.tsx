'use client'
import { useState } from 'react'
import { UserProductivity, getProductivityReport } from '@/app/supervisors/actions'
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

const pctBadge = (pct: number, label: string) => {
  const color =
    pct >= 70 ? 'bg-green-600 text-white' :
    pct >= 40 ? 'bg-yellow-500 text-white' :
    'bg-red-500 text-white'
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={`${color} cursor-default`}>{pct}%</Badge>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export default function ProductivityReport() {
  const [date, setDate] = useState(today())
  const [minPercent, setMinPercent] = useState(0)
  const [data, setData] = useState<UserProductivity[] | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const result = await getProductivityReport(date)
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  const filtered = (data ?? [])
    .filter(d => d.overallProductivityPercent >= minPercent || d.totalLoggedMinutes > 0)
    .filter(d => d.overallProductivityPercent >= minPercent)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label>Fecha</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
        </div>
        <div className="grid gap-1.5">
          <Label>Productividad global mínima (%)</Label>
          <Input
            type="number" min={0} max={100}
            value={minPercent}
            onChange={e => setMinPercent(Number(e.target.value))}
            className="w-32"
          />
        </div>
        <Button onClick={load} disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Cargando…</> : 'Generar reporte'}
        </Button>
      </div>

      {/* Leyenda de métricas */}
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

      {data !== null && filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-10">
          No hay usuarios con productividad global ≥ {minPercent}% en esta fecha.
        </p>
      )}

      {filtered.length > 0 && (
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
            {filtered
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
      )}
    </div>
  )
}
