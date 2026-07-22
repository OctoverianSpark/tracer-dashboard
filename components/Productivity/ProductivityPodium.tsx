'use client'
import { UserProductivity } from '@/lib/productivity'
import { Card } from '@/app/_components/_ui/card'
import { Trophy } from 'lucide-react'

interface ProductivityPodiumProps {
  top3: UserProductivity[]
}

const RANK_STYLE = [
  { order: 'sm:order-2', height: 'sm:h-40', ring: 'ring-2 ring-amber-400/70', badge: 'bg-amber-400 text-amber-950', label: '1°' },
  { order: 'sm:order-1', height: 'sm:h-32', ring: 'ring-1 ring-border', badge: 'bg-slate-300 text-slate-800', label: '2°' },
  { order: 'sm:order-3', height: 'sm:h-28', ring: 'ring-1 ring-border', badge: 'bg-orange-400/80 text-orange-950', label: '3°' },
]

export default function ProductivityPodium({ top3 }: ProductivityPodiumProps) {
  if (top3.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Sin actividad registrada en este rango.</p>
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-center gap-3">
      {top3.map((entry, i) => {
        const style = RANK_STYLE[i]!
        return (
          <Card
            key={entry.user.id}
            className={`flex-1 sm:max-w-56 ${style.order} ${style.height} ${style.ring} flex flex-col items-center justify-center gap-1.5 p-4 text-center`}
          >
            <span className={`flex items-center justify-center size-7 rounded-full text-xs font-bold ${style.badge}`}>
              {i === 0 ? <Trophy className="size-3.5" /> : style.label}
            </span>
            <span className="font-semibold text-sm truncate max-w-full">{entry.user.full_name}</span>
            <span className="text-2xl font-bold tabular-nums">{entry.overallProductivityPercent}%</span>
            <span className="text-xs text-muted-foreground">productividad</span>
          </Card>
        )
      })}
    </div>
  )
}
