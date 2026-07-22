'use client'
import { UserProductivity } from '@/lib/productivity'
import { Card } from '@/app/_components/_ui/card'
import { Trophy } from 'lucide-react'

interface ProductivityPodiumProps {
  top3: UserProductivity[]
}

const RANK_STYLE = [
  {
    order: 'sm:order-2', minHeight: 'sm:min-h-44',
    ring: 'ring-2 ring-amber-400/70 dark:ring-amber-400/50',
    badge: 'bg-amber-400 text-amber-950 size-9',
    valueClass: 'text-3xl',
  },
  {
    order: 'sm:order-1', minHeight: 'sm:min-h-36',
    ring: 'ring-1 ring-border',
    badge: 'bg-slate-300 text-slate-800 dark:bg-slate-400 dark:text-slate-950 size-7',
    valueClass: 'text-2xl',
  },
  {
    order: 'sm:order-3', minHeight: 'sm:min-h-32',
    ring: 'ring-1 ring-border',
    badge: 'bg-orange-300 text-orange-950 dark:bg-orange-400/90 size-7',
    valueClass: 'text-2xl',
  },
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
            className={`w-full sm:w-48 ${style.order} ${style.minHeight} ${style.ring} flex flex-col items-center justify-center gap-2 p-5 text-center`}
          >
            <span className={`flex items-center justify-center rounded-full text-sm font-bold shrink-0 ${style.badge}`}>
              {i === 0 ? <Trophy className="size-4" /> : `${i + 1}°`}
            </span>
            <span className="font-semibold text-sm leading-tight truncate max-w-full" title={entry.user.full_name}>
              {entry.user.full_name}
            </span>
            <span className={`font-bold tabular-nums leading-none ${style.valueClass}`}>
              {entry.overallProductivityPercent}%
            </span>
            <span className="text-xs text-muted-foreground">productividad</span>
          </Card>
        )
      })}
    </div>
  )
}
