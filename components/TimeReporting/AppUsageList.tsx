'use client'
import { AppUsageLog } from '@/app/time/actions'
import { CategorizationApp } from '@/app/supervisors/categorization-actions'
import { Badge } from '@/app/_components/_ui/badge'

interface Props {
  logs: AppUsageLog[]
  categorizations: CategorizationApp[]
  computerId: number
}

const fmtSecs = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

export default function AppUsageList({ logs, categorizations, computerId }: Props) {
  const categoryMap = new Map(categorizations.map(a => [a.name.toLowerCase(), a.category]))

  const filtered = logs
    .filter(l => Number(l.computer_id) === computerId)
    .sort((a, b) => b.seconds - a.seconds)

  if (filtered.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-6">
        No hay registros de uso de aplicaciones para esta fecha.
      </p>
    )
  }

  const total = filtered.reduce((s, l) => s + l.seconds, 0)

  return (
    <div className="space-y-2">
      {filtered.map(l => {
        const cat     = categoryMap.get(l.app.toLowerCase())
        const pct     = total > 0 ? (l.seconds / total) * 100 : 0
        const barColor =
          cat === 'productive'   ? 'bg-green-500' :
          cat === 'unproductive' ? 'bg-red-400'   : 'bg-muted-foreground/30'

        return (
          <div key={l.app} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-sm truncate">{l.app}</span>
                {cat === 'productive'   && <Badge className="bg-green-600 text-white shrink-0">Productiva</Badge>}
                {cat === 'unproductive' && <Badge variant="destructive" className="shrink-0">Improductiva</Badge>}
                {!cat                  && <Badge variant="secondary" className="shrink-0 text-muted-foreground">Sin categoría</Badge>}
              </div>
              <span className="text-sm text-muted-foreground shrink-0">{fmtSecs(l.seconds)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
