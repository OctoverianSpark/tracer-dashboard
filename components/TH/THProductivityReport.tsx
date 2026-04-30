'use client'
import { useState } from 'react'
import { THProductivity, getTHProductivityReport } from '@/app/th/actions'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { Loader2 } from 'lucide-react'

const today = () => new Date().toISOString().slice(0, 10)

const fmtMin = (m: number) => {
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}h ${min}m` : `${min}m`
}

const pctColor = (p: number) => {
  if (p >= 70) return 'bg-green-600 text-white'
  if (p >= 40) return 'bg-yellow-500 text-white'
  return 'bg-red-500 text-white'
}

export default function THProductivityReport() {
  const [date, setDate] = useState(today())
  const [data, setData] = useState<THProductivity[] | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const result = await getTHProductivityReport(date)
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  const withActivity = (data ?? []).filter(d => d.totalMinutes > 0)
  const avg = withActivity.length > 0
    ? Math.round(withActivity.reduce((s, d) => s + d.productivityPercent, 0) / withActivity.length)
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

      {data === null && !loading && (
        <p className="text-center text-sm text-muted-foreground py-10">
          Selecciona una fecha y genera el reporte.
        </p>
      )}

      {data !== null && (
        <>
          {avg !== null && (
            <p className="text-sm text-muted-foreground">
              Productividad promedio del equipo:{' '}
              <span className="font-semibold text-foreground">{avg}%</span>
              {' '}— {withActivity.length} usuarios con actividad
            </p>
          )}

          {withActivity.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-10">
              No se encontró actividad para esta fecha.
            </p>
          )}

          {withActivity.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Productividad</TableHead>
                  <TableHead>Tiempo activo</TableHead>
                  <TableHead>Neutral</TableHead>
                  <TableHead>Inactivo</TableHead>
                  <TableHead>Total registrado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withActivity
                  .sort((a, b) => b.productivityPercent - a.productivityPercent)
                  .map(d => (
                    <TableRow key={d.user.id}>
                      <TableCell className="font-medium">{d.user.full_name}</TableCell>
                      <TableCell>
                        <Badge className={pctColor(d.productivityPercent)}>{d.productivityPercent}%</Badge>
                      </TableCell>
                      <TableCell className="text-green-600 text-sm">{fmtMin(d.activeMinutes)}</TableCell>
                      <TableCell className="text-yellow-600 text-sm">{fmtMin(d.neutralMinutes)}</TableCell>
                      <TableCell className="text-red-500 text-sm">{fmtMin(d.inactiveMinutes)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{fmtMin(d.totalMinutes)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </div>
  )
}
