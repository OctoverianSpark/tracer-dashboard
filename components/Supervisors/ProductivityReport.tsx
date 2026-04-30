'use client'
import { useState } from 'react'
import { UserProductivity, getProductivityReport } from '@/app/supervisors/actions'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/app/_components/_ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/app/_components/_ui/collapsible'
import { Loader2, ChevronDown } from 'lucide-react'

const today = () => new Date().toISOString().slice(0, 10)

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

const categoryDot = (cat: string) =>
  cat === 'productive' ? 'bg-green-500' : cat === 'unproductive' ? 'bg-red-400' : 'bg-muted-foreground/40'

function TopAppsRow({ data }: { data: UserProductivity }) {
  const [open, setOpen] = useState(false)
  if (data.topApps.length === 0) return null

  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell colSpan={8} className="py-2 px-6">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            Ver apps usadas
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-wrap gap-2 pt-2">
              {data.topApps.map(a => (
                <span key={a.app} className="flex items-center gap-1 text-xs bg-background border rounded px-2 py-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${categoryDot(a.category)}`} />
                  {a.app}
                  <span className="text-muted-foreground ml-1">{fmtSecs(a.seconds)}</span>
                </span>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </TableCell>
    </TableRow>
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
      setData(await getProductivityReport(date))
    } finally {
      setLoading(false)
    }
  }

  const filtered = (data ?? []).filter(d => d.overallProductivityPercent >= minPercent)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label>Fecha</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
        </div>
        <div className="grid gap-1.5">
          <Label>Productividad global mínima (%)</Label>
          <Input type="number" min={0} max={100} value={minPercent}
            onChange={e => setMinPercent(Number(e.target.value))} className="w-32" />
        </div>
        <Button onClick={load} disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Cargando…</> : 'Generar reporte'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border rounded-md p-3">
        <span><span className="font-semibold text-foreground">Apps prod.</span> = productivas / (prod + improd)</span>
        <span><span className="font-semibold text-foreground">Cumplimiento</span> = tiempo total / jornada programada</span>
        <span><span className="font-semibold text-foreground">Global</span> = productivas / jornada programada</span>
      </div>

      {data === null && !loading && (
        <p className="text-center text-sm text-muted-foreground py-10">Selecciona una fecha y genera el reporte.</p>
      )}
      {data !== null && filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-10">
          No hay usuarios con productividad global ≥ {minPercent}%.
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
              <TableHead>Productivo</TableHead>
              <TableHead>Improductivo</TableHead>
              <TableHead>Sin categoría</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered
              .sort((a, b) => b.overallProductivityPercent - a.overallProductivityPercent)
              .flatMap(d => [
                <TableRow key={d.user.id}>
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
                </TableRow>,
                <TopAppsRow key={`apps-${d.user.id}`} data={d} />,
              ])}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
