"use client"

import { cn } from "@/app/_components/_lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/_components/_ui/tooltip"
import { AlertTriangle, Clock } from "lucide-react"
import { StateCategory, WorkState } from "@/types/States"

export interface Log {
  category: string
  timestamp: string
  state: string
}

// Catálogo de respaldo si /states y /state-categories no responden o vienen vacíos —
// mantiene el Timeline funcionando con el mismo look que tenía antes de ser configurable.
const DEFAULT_CATEGORIES: StateCategory[] = [
  { id: -1, key: "active",   name: "Productivo", color: "#10b981", sort_order: 0 },
  { id: -2, key: "neutral",  name: "Neutral",     color: "#fbbf24", sort_order: 1 },
  { id: -3, key: "inactive", name: "Inactivo",    color: "#475569", sort_order: 2 },
]

const DEFAULT_STATES: WorkState[] = [
  { id: -1, code: 0, name: "Trabajando",   category_id: -1, sort_order: 0 },
  { id: -2, code: 1, name: "Horas Extras", category_id: -1, sort_order: 1 },
  { id: -3, code: 2, name: "Descanso",     category_id: -2, sort_order: 2 },
  { id: -4, code: 3, name: "Baño",         category_id: -2, sort_order: 3 },
  { id: -5, code: 4, name: "Almuerzo",     category_id: -2, sort_order: 4 },
  { id: -6, code: 5, name: "Inactivo",     category_id: -3, sort_order: 5 },
  { id: -7, code: 6, name: "Desconectado", category_id: -3, sort_order: 6 },
]

const FALLBACK_COLOR = "#475569"

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_WORKDAY_START = 6
const DEFAULT_WORKDAY_END   = 22
const BUFFER_MINS           = 2 * 60 // margen para ver llegadas tempranas / salidas tardías

function toMinutes(ts: string) {
  const d = new Date(ts)
  return d.getHours() * 60 + d.getMinutes()
}

function timeStringToMins(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

function pct(mins: number, workdayStartMins: number, workdayMins: number) {
  const clamped = Math.min(Math.max(mins - workdayStartMins, 0), workdayMins)
  return (clamped / workdayMins) * 100
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

function buildBlocks(logs: Log[], workdayStartMins: number, workdayMins: number): Block[] {
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

    const leftPct  = pct(startMins, workdayStartMins, workdayMins)
    const endPct   = pct(endMins, workdayStartMins, workdayMins)
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

// ── Component ─────────────────────────────────────────────────────────────────

interface ProductiveTimelineProps {
  logs: Log[]
  scheduleStart?: string     // "HH:MM" — hora de entrada según malla
  scheduleEnd?: string       // "HH:MM" — hora de fin según malla
  states?: WorkState[]       // catálogo dinámico de GET /states (nombre/orden por código)
  categories?: StateCategory[] // catálogo dinámico de GET /state-categories (nombre/color/orden)
  className?: string
}

export function Timeline({ logs, scheduleStart, scheduleEnd, states, categories, className }: ProductiveTimelineProps) {
  // ── Catálogo de estados y categorías (con respaldo si el dashboard aún no los define) ──

  const activeStates     = states && states.length > 0 ? states : DEFAULT_STATES
  const activeCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES
  const sortedCategories = [...activeCategories].sort((a, b) => a.sort_order - b.sort_order)

  const stateByCode = new Map(activeStates.map(s => [s.code, s]))
  const categoryByKey = new Map(activeCategories.map(c => [c.key, c]))

  function stateLabel(state: string): string {
    const code = Number(state)
    if (!Number.isNaN(code)) {
      const match = stateByCode.get(code)
      if (match) return match.name
    }
    return state
  }

  function categoryStyle(categoryKey: string): { name: string; color: string } {
    const byKey = categoryByKey.get(categoryKey)
    if (byKey) return { name: byKey.name, color: byKey.color ?? FALLBACK_COLOR }
    return { name: categoryKey, color: FALLBACK_COLOR }
  }

  // ── Rango de la malla según el horario asignado al usuario ─────────────────

  const scheduleStartMins = scheduleStart ? timeStringToMins(scheduleStart) : null
  const scheduleEndMins   = scheduleEnd   ? timeStringToMins(scheduleEnd)   : null

  const rawStart = scheduleStartMins !== null
    ? scheduleStartMins - BUFFER_MINS
    : DEFAULT_WORKDAY_START * 60
  const rawEnd = scheduleEndMins !== null
    ? scheduleEndMins + BUFFER_MINS
    : DEFAULT_WORKDAY_END * 60

  const workdayStartMins = Math.max(0, Math.floor(rawStart / 60) * 60)
  const workdayEndMins   = Math.min(24 * 60, Math.ceil(rawEnd / 60) * 60)
  const workdayMins      = workdayEndMins - workdayStartMins
  const workdayStartHour = workdayStartMins / 60
  const workdayEndHour   = workdayEndMins / 60

  const blocks = buildBlocks(logs, workdayStartMins, workdayMins)

  const productiveMins = blocks
    .filter(b => b.category === "active")
    .reduce((acc, b) => acc + b.durationMins, 0)

  const hours = Array.from(
    { length: workdayEndHour - workdayStartHour + 1 },
    (_, i) => workdayStartHour + i
  )

  // ── Cálculo de alertas ──────────────────────────────────────────────────────

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
    <div className={cn("w-full min-w-0 overflow-x-hidden space-y-4 font-mono", className)}>

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
            {sortedCategories.map(cat => (
              <span key={cat.key} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: cat.color ?? FALLBACK_COLOR }} />
                {cat.name}
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
                  className="group absolute top-0 h-full rounded-sm transition-[filter] hover:brightness-110 cursor-default"
                  style={{ left: `${block.leftPct}%`, width: `${block.widthPct}%`, backgroundColor: categoryStyle(block.category).color }}
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
              style={{ left: `${pct(scheduleStartMins, workdayStartMins, workdayMins)}%` }}
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
              style={{ left: `${pct(scheduleEndMins, workdayStartMins, workdayMins)}%` }}
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
            const leftPct = ((h - workdayStartHour) / (workdayEndHour - workdayStartHour)) * 100
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
              <span
                className="h-2 w-2 rounded-sm shrink-0"
                style={{ backgroundColor: categoryStyle(block.category).color }}
              />
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
