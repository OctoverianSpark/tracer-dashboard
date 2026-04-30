'use client'
import { useState } from 'react'
import { UserProductivity, getProductivityReport } from '@/app/supervisors/actions'
import { Button } from '@/app/_components/_ui/button'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Card, CardContent } from '@/app/_components/_ui/card'
import { Loader2 } from 'lucide-react'

const today = () => new Date().toISOString().slice(0, 10)

interface CategorySummary {
  totalActive: number
  totalNeutral: number
  totalInactive: number
  total: number
}

const Bar = ({ value, color, label }: { value: number; color: string; label: string }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>{label}</span>
      <span>{value}%</span>
    </div>
    <div className="h-2 rounded-full bg-secondary overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  </div>
)

export default function AppCategorization() {
  const [date, setDate] = useState(today())
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

  const summary: CategorySummary | null = data
    ? (() => {
        const totalActive = data.reduce((s, d) => s + d.activeMinutes, 0)
        const totalNeutral = data.reduce((s, d) => s + d.neutralMinutes, 0)
        const totalInactive = data.reduce((s, d) => s + d.inactiveMinutes, 0)
        const total = totalActive + totalNeutral + totalInactive
        return { totalActive, totalNeutral, totalInactive, total }
      })()
    : null

  const pct = (val: number) => (summary && summary.total > 0 ? Math.round((val / summary.total) * 100) : 0)

  const usersWithData = (data ?? []).filter(d => d.totalMinutes > 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label>Fecha</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
        </div>
        <Button onClick={load} disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Cargando…</> : 'Analizar'}
        </Button>
      </div>

      {data === null && !loading && (
        <p className="text-center text-sm text-muted-foreground py-10">
          Selecciona una fecha para ver la distribución de categorías.
        </p>
      )}

      {summary && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="font-semibold text-sm">Distribución global del equipo</p>
              <Bar value={pct(summary.totalActive)} color="bg-green-500" label="Activo (productivo)" />
              <Bar value={pct(summary.totalNeutral)} color="bg-yellow-400" label="Neutral (pausas)" />
              <Bar value={pct(summary.totalInactive)} color="bg-red-400" label="Inactivo" />
              <p className="text-xs text-muted-foreground pt-2">
                {usersWithData.length} de {data?.length} usuarios con actividad registrada
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-2">
              <p className="font-semibold text-sm mb-3">Por usuario</p>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {usersWithData
                  .sort((a, b) => b.productivityPercent - a.productivityPercent)
                  .map(d => (
                    <div key={d.user.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium truncate">{d.user.full_name}</span>
                        <span className="text-muted-foreground shrink-0 ml-2">{d.productivityPercent}%</span>
                      </div>
                      <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
                        <div className="bg-green-500" style={{ width: `${d.totalMinutes > 0 ? Math.round(d.activeMinutes / d.totalMinutes * 100) : 0}%` }} />
                        <div className="bg-yellow-400" style={{ width: `${d.totalMinutes > 0 ? Math.round(d.neutralMinutes / d.totalMinutes * 100) : 0}%` }} />
                        <div className="bg-red-400" style={{ width: `${d.totalMinutes > 0 ? Math.round(d.inactiveMinutes / d.totalMinutes * 100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
