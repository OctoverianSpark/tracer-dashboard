"use client"

import { cn } from "@/app/_components/_lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/_components/_ui/tooltip"
import { AlertTriangle, Clock } from "lucide-react"

export interface Log {
  category: string
  timestamp: string
  state: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const WORKDAY_START = 6
const WORKDAY_END   = 22
const WORKDAY_MINS  = (WORKDAY_END - WORKDAY_START) * 60

function toMinutes(ts: string) {
  const d = new Date(ts)
  return d.getHours() * 60 + d.getMinutes()
}

function timeStringToMins(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
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
  state: string
  startMins: number
  endMins: number
  durationMins: number
  leftPct: number
  widthPct: number
  startLabel: string
  endLabel: string
}

function stateLabel(state: string): string {
  switch (state.toUpperCase()) {
    case "0": case "TRABAJANDO": case "WORKING":  return "Trabajando"
    case "1": case "OVERTIME":                    return "Horas Extras"
    case "2": case "BREAK":                       return "Descanso"
    case "3": case "WC":                          return "Baño"
    case "4": case "ALMUERZO":  case "LUNCH":     return "Almuerzo"
    case "5": case "IDLE":                        return "Inactivo"
    case "6": case "OFFLINE":                     return "Desconectado"
    default:                                      return state
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

    blocks.push({
      category: cur.category,
      state:    cur.state,
      startMins,
      endMins,
      durationMins: endMins - startMins,
      leftPct,
      widthPct,
      startLabel: new Date(cur.timestamp).toLocaleTimeString("es-ES",  { hour: "2-digit", minute: "2-digit" }),
      endLabel:   new Date(next.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
    })
  }

  return blocks
}

// ── Styles ────────────────────────────────────────────────────────────────────

const blockStyles: Record<string, { bar: string; tooltip: string; label: string }> = {
  active:   { bar: "bg-emerald-500 hover:bg-emerald-400", tooltip: "bg-emerald-600 text-white",  label: "Productivo" },
  neutral:  { bar: "bg-amber-400 hover:bg-amber-300",     tooltip: "bg-amber-500 text-white",    label: "Neutral"    },
  inactive: { bar: "bg-slate-600 hover:bg-slate-500",     tooltip: "bg-slate-600 text-white",    label: "Inactivo"   },
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ProductiveTimelineProps {
  logs: Log[]
  scheduleStart?: string  // "HH:MM" — hora de entrada según malla
  scheduleEnd?: string    // "HH:MM" — hora de fin según malla
  className?: string
}

export function Timeline({ logs, scheduleStart, scheduleEnd, className }: ProductiveTimelineProps) {
  const blocks = buildBlocks(logs)

  const productiveMins = blocks
    .filter(b => b.category === "active")
    .reduce((acc, b) => acc + b.durationMins, 0)

  const hours = Array.from(
    { length: WORKDAY_END - WORKDAY_START + 1 },
    (_, i) => WORKDAY_START + i
  )

  // ── Cálculo de alertas ──────────────────────────────────────────────────────

  const scheduleStartMins = scheduleStart ? timeStringToMins(scheduleStart) : null
  const scheduleEndMins   = scheduleEnd   ? timeStringToMins(scheduleEnd)   : null

  const firstBlock = blocks[0]
  const lateMins =
    scheduleStartMins !== null && firstBlock
      ? Math.max(0, firstBlock.startMins - scheduleStartMins)
      : 0
  const isLate = lateMins > 0

  // Hay bloque activo que supera la hora de fin de turno
  const overtimeBlock = scheduleEndMins !== null
    ? blocks.find(b => b.category === "active" && b.endMins > scheduleEndMins)
    : null
  const isOvertime = overtimeBlock !== null && overtimeBlock !== undefined

  return (
    <div className={cn("w-full space-y-4 font-mono", className)}>

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Jornada</p>
          <p className="text-2xl font-bold tabular-nums">
            {formatDuration(productiveMins)}
            <span className="text-sm font-normal text-muted-foreground ml-2">productivos</span>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Alertas */}
          {isLate && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border bg-orange-500/10 text-orange-400 border-orange-500/25">
              <AlertTriangle className="size-3" />
              Tardanza · {formatDuration(lateMins)}
            </span>
          )}
          {isOvertime && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border bg-red-500/10 text-red-400 border-red-500/25">
              <Clock className="size-3" />
              Sigue en turno tras fin
            </span>
          )}

          {/* Leyenda */}
          <div className="flex gap-3 text-xs text-muted-foreground">
            {["active", "neutral", "inactive"].map(s => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={cn("inline-block h-2.5 w-2.5 rounded-sm", blockStyles[s].bar.split(" ")[0])} />
                {blockStyles[s].label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline bar */}
      <div className="relative">
        {/* Track con bloques */}
        <div className="relative h-10 w-full rounded-lg bg-secondary overflow-hidden">
          {blocks.map((block, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "group absolute top-0 h-full rounded-sm transition-colors cursor-default",
                    blockStyles[block.category]?.bar ?? blockStyles.inactive.bar
                  )}
                  style={{ left: `${block.leftPct}%`, width: `${block.widthPct}%` }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="font-sans">
                <p className="font-semibold">{stateLabel(block.state)}</p>
                <p className="text-xs text-muted-foreground">
                  {block.startLabel} → {block.endLabel} · {formatDuration(block.durationMins)}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Marca de entrada según malla — dentro del track para que overflow-hidden la contenga */}
          {scheduleStartMins !== null && (
            <div
              className={cn(
                "absolute top-0 h-full z-20 pointer-events-none border-l-2 border-dashed",
                isLate ? "border-orange-400" : "border-emerald-500"
              )}
              style={{ left: `${pct(scheduleStartMins)}%` }}
            >
              <span className={cn(
                "absolute top-1 left-1 text-[9px] font-sans font-semibold whitespace-nowrap",
                isLate ? "text-orange-300" : "text-emerald-300"
              )}>
                Entrada
              </span>
            </div>
          )}

          {/* Marca de fin de turno según malla — dentro del track */}
          {scheduleEndMins !== null && (
            <div
              className={cn(
                "absolute top-0 h-full z-20 pointer-events-none border-l-2 border-dashed",
                isOvertime ? "border-red-400" : "border-muted-foreground/50"
              )}
              style={{ left: `${pct(scheduleEndMins)}%` }}
            >
              <span className={cn(
                "absolute top-1 left-1 text-[9px] font-sans font-semibold whitespace-nowrap",
                isOvertime ? "text-red-300" : "text-muted-foreground"
              )}>
                Fin turno
              </span>
            </div>
          )}
        </div>

        {/* Hour ticks */}
        <div className="relative mt-1 h-4 overflow-x-hidden">
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

      {/* Lista de bloques */}
      {blocks.length > 0 && (
        <ul className="space-y-1.5 pt-2">
          {blocks.map((block, i) => (
            <li key={i} className="flex items-center gap-3 text-xs font-sans">
              <span className={cn(
                "h-2 w-2 rounded-sm flex-shrink-0",
                blockStyles[block.category]?.bar.split(" ")[0] ?? "bg-slate-600"
              )} />
              <span className="text-muted-foreground tabular-nums w-28">
                {block.startLabel} → {block.endLabel}
              </span>
              <span className="font-medium">{stateLabel(block.state)}</span>
              <span className="text-muted-foreground ml-auto tabular-nums">
                {formatDuration(block.durationMins)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {blocks.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8 font-sans">
          Sin registros para mostrar.
        </p>
      )}
    </div>
  )
}
