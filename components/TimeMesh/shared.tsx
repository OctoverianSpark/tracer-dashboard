import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Checkbox } from '@/app/_components/_ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { Programation } from '@/types/Schedules'

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

export type DayAssignments = Record<string, number>

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
  function toggleDay(day: string, checked: boolean) {
    if (checked) {
      const defaultId = value[day] ?? programations[0]?.id
      if (defaultId == null) return
      onChange({ ...value, [day]: defaultId })
    } else {
      const next = { ...value }
      delete next[day]
      onChange(next)
    }
  }

  function setDayProgramation(day: string, programationId: number) {
    onChange({ ...value, [day]: programationId })
  }

  return (
    <div className="space-y-1">
      <div className={`space-y-1.5 rounded-lg border ${error ? 'border-destructive' : 'border-border'} p-2`}>
        {DIAS.map(dia => {
          const checked = value[dia.key] != null
          return (
            <div key={dia.key} className="flex items-center gap-2">
              <Checkbox
                checked={checked}
                onCheckedChange={c => toggleDay(dia.key, !!c)}
                disabled={programations.length === 0}
              />
              <span className="w-16 shrink-0 text-sm">{dia.label}</span>
              <Select
                disabled={!checked}
                value={value[dia.key]?.toString() ?? ''}
                onValueChange={v => setDayProgramation(dia.key, Number(v))}
              >
                <SelectTrigger className="h-8 flex-1 text-sm">
                  <SelectValue placeholder="Selecciona un horario" />
                </SelectTrigger>
                <SelectContent>
                  {programations.map(p => (
                    <SelectItem key={p.id} value={p.id!.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        })}
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}