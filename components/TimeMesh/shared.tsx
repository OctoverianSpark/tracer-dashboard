import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { Badge } from '@/app/_components/_ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { DayAssignments, DayRotatingConfig, Programation } from '@/types/Schedules'

export const DIAS = [
  { key: 'L', label: 'Lunes' },
  { key: 'M', label: 'Martes' },
  { key: 'X', label: 'Miércoles' },
  { key: 'J', label: 'Jueves' },
  { key: 'V', label: 'Viernes' },
  { key: 'S', label: 'Sábado' },
  { key: 'D', label: 'Domingo' },
]

const HORA_INICIO = 6
const HORA_FIN = 22

function timeToDecimal(timeStr: string): number | null {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  return h + m / 60
}

function toPercent(hora: number): number {
  return ((hora - HORA_INICIO) / (HORA_FIN - HORA_INICIO)) * 100
}

export function TimeField({
  label,
  value,
  onChange,
  error
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  return (
    <div className="grid gap-1 min-w-0">
      <Label className="text-xs whitespace-nowrap">{label}</Label>
      <Input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`text-sm px-2 ${error ? 'border-red-500' : ''}`}
      />
      {error && <span className='text-xs text-red-500'>{error}</span>}
    </div>
  )
}


type MallaSize = 'normal' | 'table'

export function MallaHoraria({
  start_day,
  start_lunch,
  end_lunch,
  end_day,
  size = 'normal'
}: Omit<Programation, 'id' | 'name'> & { size?: MallaSize }) {
  const e  = timeToDecimal(start_day)
  const ia = timeToDecimal(start_lunch)
  const fa = timeToDecimal(end_lunch ?? '')
  const f  = timeToDecimal(end_day ?? '')

  if (!e || !f) {
    return (
      <div className={`w-full bg-secondary rounded-md border border-dashed border-border flex items-center justify-center text-muted-foreground ${size === 'table' ? 'h-6 text-[10px]' : 'h-10 text-xs'}`}>
        {size === 'table' ? 'Sin datos' : 'Ingresa Entrada y Fin para ver la malla'}
      </div>
    )
  }

  const segmentos: { left: number; width: number; color: string; label: string }[] = []

  if (ia && fa) {
    segmentos.push({ left: toPercent(e),  width: toPercent(ia) - toPercent(e),  color: '#22c55e', label: 'Trabajo' })
    segmentos.push({ left: toPercent(ia), width: toPercent(fa) - toPercent(ia), color: '#facc15', label: 'Almuerzo' })
    segmentos.push({ left: toPercent(fa), width: toPercent(f)  - toPercent(fa), color: '#22c55e', label: 'Trabajo' })
  } else {
    segmentos.push({ left: toPercent(e), width: toPercent(f) - toPercent(e), color: '#22c55e', label: 'Trabajo' })
  }

  const horas = Array.from({ length: HORA_FIN - HORA_INICIO + 1 }, (_, i) => i + HORA_INICIO)

  const barHeight = size === 'table' ? 'h-6' : 'h-10'

  return (
    <div className="space-y-1">
      <div className={`relative w-full ${barHeight} bg-secondary rounded-md overflow-hidden`}>
        {segmentos.filter(s => s.width > 0).map((seg, i) => (
          <div
            key={i}
            className={`absolute h-full flex items-center justify-center font-semibold text-white overflow-hidden ${size === 'table' ? 'text-[9px]' : 'text-xs'}`}
            style={{ left: `${seg.left}%`, width: `${seg.width}%`, backgroundColor: seg.color }}
            title={seg.label}
          >
            {seg.width > 6 ? (size === 'table' ? '' : seg.label) : ''}
          </div>
        ))}
        {horas.map(h => (
          <div
            key={h}
            className="absolute top-0 h-full border-l border-white/40 pointer-events-none"
            style={{ left: `${toPercent(h)}%` }}
          />
        ))}
      </div>

      {/* Labels de horas solo en modo normal */}
      {size === 'normal' && (
        <>
          <div className="relative w-full h-4">
            {horas.filter((_, i) => i % 2 === 0).map(h => (
              <span
                key={h}
                className="absolute text-[10px] text-muted-foreground -translate-x-1/2"
                style={{ left: `${toPercent(h)}%` }}
              >
                {h}h
              </span>
            ))}
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />Trabajo
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" />Almuerzo
            </span>
          </div>
        </>
      )}
    </div>
  )
}

function RotatingSequenceEditor({
  programations,
  config,
  onChange,
}: {
  programations: Programation[]
  config: DayRotatingConfig
  onChange: (config: DayRotatingConfig) => void
}) {
  const nameOf = (id: number) => programations.find(p => p.id === id)?.name ?? '—'

  function addToSequence(id: number) {
    onChange({ ...config, sequence: [...config.sequence, id] })
  }

  function removeAt(index: number) {
    onChange({ ...config, sequence: config.sequence.filter((_, i) => i !== index) })
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= config.sequence.length) return
    const next = [...config.sequence]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange({ ...config, sequence: next })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {config.sequence.map((id, i) => (
          <Badge key={i} variant="secondary" className="gap-1 text-xs font-normal">
            {i + 1}. {nameOf(id)}
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className="cursor-pointer disabled:opacity-30"
            >
              <ChevronLeft className="size-3" />
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === config.sequence.length - 1}
              className="cursor-pointer disabled:opacity-30"
            >
              <ChevronRight className="size-3" />
            </button>
            <button type="button" onClick={() => removeAt(i)} className="cursor-pointer">
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>

      <div className="flex gap-2">
        <Select value="" onValueChange={v => addToSequence(Number(v))}>
          <SelectTrigger className="h-8 flex-1 text-sm">
            <SelectValue placeholder="+ Agregar horario a la secuencia" />
          </SelectTrigger>
          <SelectContent>
            {programations.map(p => (
              <SelectItem key={p.id} value={p.id!.toString()}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={config.cadence} onValueChange={v => onChange({ ...config, cadence: v as 'week' | 'day' })}>
          <SelectTrigger className="h-8 w-32 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Semanal</SelectItem>
            <SelectItem value="day">Diaria</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.sequence.length < 2 && (
        <p className="text-xs text-amber-500">Agrega al menos 2 horarios para que rote.</p>
      )}
    </div>
  )
}

export function DayProgramationPicker({
  programations,
  value,
  onChange,
  error
}: {
  programations: Programation[]
  value: DayAssignments
  onChange: (value: DayAssignments) => void
  error?: string
}) {
  function toggleDay(day: string, active: boolean) {
    if (active) {
      const firstId = programations[0]?.id
      if (firstId == null) return
      onChange({ ...value, [day]: { mode: 'fixed', programation_id: firstId } })
    } else {
      const next = { ...value }
      delete next[day]
      onChange(next)
    }
  }

  function setMode(day: string, mode: 'fixed' | 'rotating') {
    const firstId = programations[0]?.id
    if (firstId == null) return
    onChange({
      ...value,
      [day]: mode === 'fixed'
        ? { mode: 'fixed', programation_id: firstId }
        : { mode: 'rotating', sequence: [firstId], cadence: 'week' },
    })
  }

  const activeDays = DIAS.filter(dia => value[dia.key] != null)

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {DIAS.map(dia => {
          const active = value[dia.key] != null
          return (
            <Tooltip key={dia.key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => toggleDay(dia.key, !active)}
                  disabled={programations.length === 0}
                  className={`
                    flex-1 h-10 rounded-md text-sm font-medium border transition-colors cursor-pointer
                    ${active
                      ? 'bg-green-500 text-white border-green-500'
                      : 'bg-secondary text-muted-foreground border-border hover:border-green-400 hover:text-green-400'}
                  `}
                >
                  {dia.key}
                </button>
              </TooltipTrigger>
              <TooltipContent>{dia.label}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>

      {activeDays.length > 0 && (
        <div className="space-y-2">
          {activeDays.map(dia => {
            const config = value[dia.key]!
            return (
              <div key={dia.key} className="space-y-2 rounded-lg border border-border p-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{dia.label}</span>
                  <div className="flex overflow-hidden rounded-md border border-border text-xs">
                    <button
                      type="button"
                      onClick={() => setMode(dia.key, 'fixed')}
                      className={`cursor-pointer px-2 py-1 transition-colors ${config.mode === 'fixed' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                    >
                      Fijo
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode(dia.key, 'rotating')}
                      className={`cursor-pointer px-2 py-1 transition-colors ${config.mode === 'rotating' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                    >
                      Rotativo
                    </button>
                  </div>
                </div>

                {config.mode === 'fixed' ? (
                  <Select
                    value={config.programation_id.toString()}
                    onValueChange={v => onChange({ ...value, [dia.key]: { mode: 'fixed', programation_id: Number(v) } })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecciona un horario" />
                    </SelectTrigger>
                    <SelectContent>
                      {programations.map(p => (
                        <SelectItem key={p.id} value={p.id!.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <RotatingSequenceEditor
                    programations={programations}
                    config={config}
                    onChange={next => onChange({ ...value, [dia.key]: next })}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}