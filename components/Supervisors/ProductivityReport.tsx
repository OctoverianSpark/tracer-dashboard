'use client'
import { useState } from 'react'
import { UserProductivity, getProductivityReport } from '@/app/supervisors/actions'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'

const today = () => new Date().toISOString().slice(0, 10)

const fmtMin = (m: number) => {
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}h ${min}m` : `${min}m`
}

const productivityColor = (pct: number) => {
  if (pct >= 70) return 'bg-green-600 text-white'
  if (pct >= 40) return 'bg-yellow-500 text-white'
  return 'bg-red-500 text-white'
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

  const filtered = (data ?? []).filter(d => d.productivityPercent >= minPercent)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label>Fecha</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
        </div>
        <div className="grid gap-1.5">
          <Label>Productividad mínima (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={minPercent}
            onChange={e => setMinPercent(Number(e.target.value))}
            className="w-32"
          />
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

      {data !== null && filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-10">
          No hay usuarios con productividad ≥ {minPercent}% en esta fecha.
        </p>
      )}

      {filtered.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Productividad</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead>Neutral</TableHead>
              <TableHead>Inactivo</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered
              .sort((a, b) => b.productivityPercent - a.productivityPercent)
              .map(({ user, productivityPercent, activeMinutes, neutralMinutes, inactiveMinutes, totalMinutes }) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>
                    <Badge className={`gap-1 ${productivityColor(productivityPercent)}`}>
                      {productivityPercent >= 50
                        ? <TrendingUp className="h-3 w-3" />
                        : <TrendingDown className="h-3 w-3" />}
                      {productivityPercent}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-green-600 text-sm">{fmtMin(activeMinutes)}</TableCell>
                  <TableCell className="text-yellow-600 text-sm">{fmtMin(neutralMinutes)}</TableCell>
                  <TableCell className="text-red-500 text-sm">{fmtMin(inactiveMinutes)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{fmtMin(totalMinutes)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
