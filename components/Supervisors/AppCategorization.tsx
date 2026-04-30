'use client'
import { useState } from 'react'
import { UserProductivity, getProductivityReport } from '@/app/supervisors/actions'
import { Button } from '@/app/_components/_ui/button'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Card, CardContent } from '@/app/_components/_ui/card'
import { Loader2 } from 'lucide-react'

const today = () => new Date().toISOString().slice(0, 10)

const fmtMin = (m: number) => {
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}h ${min}m` : `${min}m`
}

const Bar = ({ value, color, label, detail }: { value: number; color: string; label: string; detail?: string }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>{label}{detail ? <span className="ml-1 text-muted-foreground/60">{detail}</span> : null}</span>
      <span>{value}%</span>
    </div>
    <div className="h-2 rounded-full bg-secondary overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
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
      setData(await getProductivityReport(date))
    } finally {
      setLoading(false)
    }
  }

  const usersWithData = (data ?? []).filter(d => d.totalLoggedMinutes > 0)

  const totActive   = usersWithData.reduce((s, d) => s + d.activeMinutes, 0)
  const totNeutral  = usersWithData.reduce((s, d) => s + d.neutralMinutes, 0)
  const totInactive = usersWithData.reduce((s, d) => s + d.inactiveMinutes, 0)
  const totLogged   = totActive + totNeutral + totInactive
  const totSched    = usersWithData.reduce((s, d) => s + d.scheduledMinutes, 0)

  const pct = (v: number, total: number) => (total > 0 ? Math.round((v / total) * 100) : 0)

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

      {data !== null && usersWithData.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-10">
          No se encontró actividad para esta fecha.
        </p>
      )}

      {usersWithData.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6 space-y-5">
              <p className="font-semibold text-sm">Distribución global del equipo</p>

              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sobre tiempo conectado</p>
                <Bar value={pct(totActive, totLogged)}   color="bg-green-500"  label="Productivo (apps activas)" />
                <Bar value={pct(totNeutral, totLogged)}  color="bg-yellow-400" label="Neutral" />
                <Bar value={pct(totInactive, totLogged)} color="bg-red-400"    label="Improductivo / inactivo" />
              </div>

              {totSched > 0 && (
                <div className="space-y-3 pt-1 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sobre jornada programada</p>
                  <Bar value={pct(totActive, totSched)}  color="bg-green-500"  label="Productivo" detail={`(${fmtMin(totActive)} / ${fmtMin(totSched)})`} />
                  <Bar value={pct(totLogged, totSched)}  color="bg-blue-400"   label="Cumplimiento horario" detail={`(${fmtMin(totLogged)} / ${fmtMin(totSched)})`} />
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {usersWithData.length} de {data?.length ?? 0} usuarios con actividad
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-2">
              <p className="font-semibold text-sm mb-3">Por usuario — Productividad global</p>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {usersWithData
                  .sort((a, b) => b.overallProductivityPercent - a.overallProductivityPercent)
                  .map(d => (
                    <div key={d.user.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium truncate">{d.user.full_name}</span>
                        <span className="text-muted-foreground shrink-0 ml-2">
                          {d.appProductivityPercent}% apps · {d.workCompliancePercent}% asist.
                        </span>
                      </div>
                      {/* Barra tricolor sobre tiempo conectado */}
                      <div className="flex h-2 rounded-full overflow-hidden gap-px bg-secondary">
                        <div className="bg-green-500" style={{ width: `${d.totalLoggedMinutes > 0 ? Math.round(d.activeMinutes / d.totalLoggedMinutes * 100) : 0}%` }} />
                        <div className="bg-yellow-400" style={{ width: `${d.totalLoggedMinutes > 0 ? Math.round(d.neutralMinutes / d.totalLoggedMinutes * 100) : 0}%` }} />
                        <div className="bg-red-400"    style={{ width: `${d.totalLoggedMinutes > 0 ? Math.round(d.inactiveMinutes / d.totalLoggedMinutes * 100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
              </div>
              <div className="flex gap-3 pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Productivo</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />Neutral</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Improductivo</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
