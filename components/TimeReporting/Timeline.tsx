"use client"

import { cn } from "@/app/_components/_lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/_components/_ui/tooltip"


export interface Log {
  category: string
  timestamp: string 
  state: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const WORKDAY_START = 8   // 08:00
const WORKDAY_END   = 20  // 20:00
const WORKDAY_MINS  = (WORKDAY_END - WORKDAY_START) * 60

function toMinutes(ts: string) {
  const d = new Date(ts)
  return d.getHours() * 60 + d.getMinutes()
}

function pct(mins: number) {
  const clamped = Math.min(Math.max(mins - WORKDAY_START * 60, 0), WORKDAY_MINS)
  return (clamped / WORKDAY_MINS) * 100
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`
}

// ── Block builder ─────────────────────────────────────────────────────────────

interface Block {
  category: string
  state:string,
  startMins: number
  endMins: number
  durationMins: number
  leftPct: number
  widthPct: number
  startLabel: string
  endLabel: string
}

const states = (state:string) =>{

  switch(state){
    case 'working':
      return 'Trabajando'
      break
    case 'WC':
      return 'Baño'
      break;
    case 'Lunch':
      return 'Almuerzo'
      break

    default :
      return state.charAt(0).toUpperCase() + state.slice(1)

  }
}

function buildBlocks(logs: Log[]): Block[] {
  const sorted = [...logs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const blocks: Block[] = []

  for (let i = 0; i < sorted.length - 1; i++) {
    const cur  = sorted[i]
    const next = sorted[i + 1]

    const startMins = toMinutes(cur.timestamp)
    const endMins   = toMinutes(next.timestamp)
    if (endMins <= startMins) continue

    const leftPct  = pct(startMins)
    const endPct   = pct(endMins)
    const widthPct = endPct - leftPct
    if (widthPct <= 0) continue

    const startDate = new Date(cur.timestamp)
    const endDate   = new Date(next.timestamp)

    blocks.push({
      category: cur.category,
      state: cur.state,
      startMins,
      endMins,
      durationMins: endMins - startMins,
      leftPct,
      widthPct,
      startLabel: startDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      endLabel:   endDate.toLocaleTimeString("es-ES",   { hour: "2-digit", minute: "2-digit" }),
    })
  }

  return blocks
}

// ── Styles ────────────────────────────────────────────────────────────────────

const blockStyles: Record<string, { bar: string; tooltip: string; label: string }> = {
  ["active"]: {
    bar:     "bg-emerald-500 hover:bg-emerald-400",
    tooltip: "bg-emerald-600 text-white",
    label:   "Productivo",
  },
  ["neutral"]: {
    bar:     "bg-amber-400 hover:bg-amber-300",
    tooltip: "bg-amber-500 text-white",
    label:   "Neutral",
  },
  ["inactive"]: {
    bar:     "bg-slate-300 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600",
    tooltip: "bg-slate-600 text-white",
    label:   "Inactivo",
  },
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ProductiveTimelineProps {
  logs: Log[]
  className?: string
}

export function Timeline({ logs, className }: ProductiveTimelineProps) {
  const blocks = buildBlocks(logs)

  const productiveMins = blocks
    .filter(b => b.category === "active")
    .reduce((acc, b) => acc + b.durationMins, 0)

  const hours = Array.from(
    { length: WORKDAY_END - WORKDAY_START + 1 },
    (_, i) => WORKDAY_START + i
  )

  return (
    <div className={cn("w-full space-y-4 font-mono", className)}>

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Jornada</p>
          <p className="text-2xl font-bold tabular-nums">
            {formatDuration(productiveMins)}
            <span className="text-sm font-normal text-muted-foreground ml-2">productivos</span>
          </p>
        </div>

        {/* Leyenda */}
        <div className="flex gap-3 text-xs text-muted-foreground">
          {["active","neutral","inactive"].map(s => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={cn("inline-block h-2.5 w-2.5 rounded-sm", blockStyles[s].bar.split(" ")[0])} />
              {blockStyles[s].label}
            </span>
          ))}
        </div>
      </div>

      {/* Timeline bar */}
      <div className="relative">
        {/* Track */}
        <div className="relative h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden">
          {blocks.map((block, i) => (
            <Tooltip>
              <TooltipTrigger>
                
            <div
              key={i}
              className={cn(
                "group absolute top-0 h-full rounded-sm transition-colors cursor-default",
                blockStyles[block.category].bar
              )}
              style={{
                left:  `${block.leftPct}%`,
                width: `${block.widthPct}%`,
              }}
            >
              {/* Tooltip */}
              <div className={cn(
                "pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10",
                "hidden group-hover:flex flex-col items-center gap-0.5",
              )}>
                <div className={cn(
                  "rounded px-2 py-1 text-[11px] whitespace-nowrap shadow-lg",
                  blockStyles[block.category].tooltip
                )}>
                  <span className="font-semibold">{blockStyles[block.category].label}</span>
                  {" · "}{block.startLabel} → {block.endLabel}
                  {" · "}{formatDuration(block.durationMins)}
                </div>
                <div className={cn(
                  "h-1.5 w-1.5 rotate-45",
                  blockStyles[block.category].tooltip
                )} />
              </div>
            </div>
              </TooltipTrigger>
              <TooltipContent>
                {
                  states(block.state)
                }
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Hour ticks */}
        <div className="relative mt-1 h-4">
          {hours.map(h => {
            const leftPct = ((h - WORKDAY_START) / (WORKDAY_END - WORKDAY_START)) * 100
            return (
              <span
                key={h}
                className="absolute -translate-x-1/2 text-[10px] text-muted-foreground"
                style={{ left: `${leftPct}%` }}
              >
                {formatHour(h)}
              </span>
            )
          })}
        </div>
      </div>

      {/* Block list */}
      {blocks.length > 0 && (
        <ul className="space-y-1.5 pt-2">
          {blocks.map((block, i) => (
            <li key={i} className="flex items-center gap-3 text-xs">
              <span className={cn(
                "h-2 w-2 rounded-sm flex-shrink-0",
                blockStyles[block.category].bar.split(" ")[0]
              )} />
              <span className="text-muted-foreground tabular-nums w-28">
                {block.startLabel} → {block.endLabel}
              </span>
              <span className="font-medium">{states(block.state)}</span>
              <span className="text-muted-foreground ml-auto">
                {formatDuration(block.durationMins)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {blocks.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          Sin registros para mostrar.
        </p>
      )}
    </div>
  )
}