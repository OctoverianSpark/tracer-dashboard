'use client'
import { useRef, useState } from 'react'
import { DailyProductivity } from '@/lib/productivity'

interface ProductivityCurveChartProps {
  data: DailyProductivity[]
}

const W = 800
const H = 340
const MARGIN = { top: 20, right: 56, bottom: 36, left: 52 }
const PLOT_W = W - MARGIN.left - MARGIN.right
const PLOT_H = H - MARGIN.top - MARGIN.bottom

const fmtHours = (secs: number) => (secs / 3600).toFixed(1).replace(/\.0$/, '')
const fmtDateShort = (date: string) => {
  const [, m, d] = date.split('-')
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d} ${MONTHS[Number(m) - 1]}`
}

const niceStep = (max: number, steps = 4) => Math.max(2.5, Math.ceil(max / steps / 2.5) * 2.5)

export default function ProductivityCurveChart({ data }: ProductivityCurveChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-10 text-center">Sin datos para este rango.</p>
  }

  const n = data.length
  const xFor = (i: number) => n === 1 ? MARGIN.left + PLOT_W / 2 : MARGIN.left + (PLOT_W * i) / (n - 1)

  const hoursOf = (d: DailyProductivity) => d.totalSeconds / 3600
  const maxHours = Math.max(...data.map(hoursOf), 0)
  const hoursStep = niceStep(maxHours)
  const hoursMax = hoursStep * 4
  const yHours = (h: number) => MARGIN.top + PLOT_H - (Math.min(h, hoursMax) / hoursMax) * PLOT_H

  const pcts = data.map(d => d.overallProductivityPercent)
  const rawMin = Math.min(...pcts)
  const rawMax = Math.max(...pcts)
  const pad = Math.max(2.5, (rawMax - rawMin) * 0.3)
  const pctMin = Math.max(0, Math.floor((rawMin - pad) / 2.5) * 2.5)
  const pctMax = Math.min(100, Math.ceil((rawMax + pad) / 2.5) * 2.5)
  const pctRange = Math.max(2.5, pctMax - pctMin)
  const yPct = (p: number) => MARGIN.top + PLOT_H - ((p - pctMin) / pctRange) * PLOT_H

  // Áreas apiladas de la MALLA HORARIA (state_logs): Productivo (abajo, 'Trabajando'/'Tiempo
  // extra') → No productivo (arriba, 'Inactivo'/'Desconectado'). El tope de la pila es siempre
  // `totalSeconds` (= productiveSeconds + unproductiveSeconds, por definición) — no hay franja
  // aparte de "sin datos": la línea de % (apps productivas ÷ malla) es independiente del área.
  const base = data.map(() => 0)
  const prodTop = data.map(d => d.productiveSeconds / 3600)
  const nonProdTop = data.map((d, i) => prodTop[i]! + d.unproductiveSeconds / 3600)

  const areaPath = (bottom: number[], top: number[]) => {
    const upper = top.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yHours(v)}`).join(' ')
    const lower = [...bottom].reverse()
      .map((v, revI) => `L ${xFor(n - 1 - revI)} ${yHours(v)}`)
      .join(' ')
    return `${upper} ${lower} Z`
  }

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yPct(d.overallProductivityPercent)}`).join(' ')

  const hoursTicks = [0, hoursStep, hoursStep * 2, hoursStep * 3, hoursMax]
  const pctTicks = [pctMin, pctMin + pctRange / 4, pctMin + pctRange / 2, pctMin + (pctRange * 3) / 4, pctMax]

  const handleMove = (e: React.PointerEvent<SVGRectElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const xInViewBox = ((e.clientX - rect.left) / rect.width) * W
    const idx = Math.round(((xInViewBox - MARGIN.left) / PLOT_W) * (n - 1))
    setHoverIndex(Math.min(n - 1, Math.max(0, idx)))
  }

  const hovered = hoverIndex != null ? data[hoverIndex] : null
  const tooltipLeftPct = hoverIndex != null ? (xFor(hoverIndex) / W) * 100 : 0
  const tooltipAlignRight = tooltipLeftPct > 65

  return (
    <div className="viz-root">
      <style>{`
        .viz-root {
          color-scheme: light;
          --surface-1:      #fcfcfb;
          --text-primary:   #0b0b0b;
          --text-secondary: #52514e;
          --text-muted:     #898781;
          --gridline:       #e1e0d9;
          --baseline:       #c3c2b7;
          --series-line:    #2a78d6;
          --series-prod:    #008300;
          --series-nonprod: #e87ba4;
          position: relative;
        }
        @media (prefers-color-scheme: dark) {
          :root:where(:not([data-theme="light"])) .viz-root {
            color-scheme: dark;
            --surface-1:      #1a1a19;
            --text-primary:   #ffffff;
            --text-secondary: #c3c2b7;
            --text-muted:     #898781;
            --gridline:       #2c2c2a;
            --baseline:       #383835;
            --series-line:    #3987e5;
            --series-prod:    #008300;
            --series-nonprod: #d55181;
          }
        }
        :root[data-theme="dark"] .viz-root {
          color-scheme: dark;
          --surface-1:      #1a1a19;
          --text-primary:   #ffffff;
          --text-secondary: #c3c2b7;
          --text-muted:     #898781;
          --gridline:       #2c2c2a;
          --baseline:       #383835;
          --series-line:    #3987e5;
          --series-prod:    #008300;
          --series-nonprod: #d55181;
        }
      `}</style>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Curva de productividad diaria">
        {/* Gridlines horizontales (horas) */}
        {hoursTicks.map(t => (
          <line key={`hg-${t}`} x1={MARGIN.left} x2={W - MARGIN.right} y1={yHours(t)} y2={yHours(t)}
            stroke="var(--gridline)" strokeWidth={1} />
        ))}

        {/* Áreas apiladas, wash ~10% opacidad, con gap de superficie entre segmentos */}
        <path d={areaPath(base, prodTop)} fill="var(--series-prod)" fillOpacity={0.12} />
        <path d={areaPath(prodTop, nonProdTop)} fill="var(--series-nonprod)" fillOpacity={0.14} />
        {/* Trazo de 2px en el borde superior de cada segmento — separa las áreas sin usar borde alrededor */}
        <path d={prodTop.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yHours(v)}`).join(' ')}
          fill="none" stroke="var(--series-prod)" strokeWidth={2} strokeLinejoin="round" />
        <path d={nonProdTop.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yHours(v)}`).join(' ')}
          fill="none" stroke="var(--series-nonprod)" strokeWidth={2} strokeLinejoin="round" />

        {/* Baseline */}
        <line x1={MARGIN.left} x2={W - MARGIN.right} y1={yHours(0)} y2={yHours(0)} stroke="var(--baseline)" strokeWidth={1} />

        {/* Línea de % productividad, eje derecho */}
        <path d={linePath} fill="none" stroke="var(--series-line)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <circle key={`dot-${d.date}`} cx={xFor(i)} cy={yPct(d.overallProductivityPercent)} r={5}
            fill="var(--series-line)" stroke="var(--surface-1)" strokeWidth={2} />
        ))}

        {/* Ejes */}
        {hoursTicks.map(t => (
          <text key={`hl-${t}`} x={MARGIN.left - 8} y={yHours(t)} textAnchor="end" dominantBaseline="middle"
            fontSize={11} fill="var(--text-muted)">{t}h</text>
        ))}
        {pctTicks.map(t => (
          <text key={`pl-${t}`} x={W - MARGIN.right + 8} y={yPct(t)} textAnchor="start" dominantBaseline="middle"
            fontSize={11} fill="var(--text-muted)">{t}%</text>
        ))}
        {data.map((d, i) => (
          (n <= 10 || i % Math.ceil(n / 10) === 0 || i === n - 1) && (
            <text key={`xl-${d.date}`} x={xFor(i)} y={H - MARGIN.bottom + 18} textAnchor="middle"
              fontSize={11} fill="var(--text-muted)">{fmtDateShort(d.date)}</text>
          )
        ))}

        {/* Crosshair */}
        {hoverIndex != null && (
          <line x1={xFor(hoverIndex)} x2={xFor(hoverIndex)} y1={MARGIN.top} y2={H - MARGIN.bottom}
            stroke="var(--text-muted)" strokeWidth={1} strokeDasharray="2,2" />
        )}

        {/* Overlay para capturar el hover, snap al día más cercano */}
        <rect x={MARGIN.left} y={MARGIN.top} width={PLOT_W} height={PLOT_H} fill="transparent"
          onPointerMove={handleMove} onPointerLeave={() => setHoverIndex(null)} />
      </svg>

      {/* Leyenda — orden fijo, forma+color, nunca solo color */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 px-1">
        <LegendItem color="var(--series-prod)" shape="area" label="Productivo (malla)" />
        <LegendItem color="var(--series-nonprod)" shape="area" label="No productivo (malla)" />
        <LegendItem color="var(--series-line)" shape="line" label="% Productividad (apps)" />
      </div>

      {/* Tooltip: una lectura con todas las series de ese día */}
      {hovered && (
        <div
          className="absolute top-2 z-10 rounded-md border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs pointer-events-none min-w-44"
          style={{
            left: `${tooltipLeftPct}%`,
            transform: tooltipAlignRight ? 'translateX(calc(-100% - 8px))' : 'translateX(8px)',
          }}
        >
          <p className="font-medium mb-1.5">{fmtDateShort(hovered.date)}</p>
          <TooltipRow color="var(--series-prod)" label="Productivo (malla)" value={`${fmtHours(hovered.productiveSeconds)}h`} />
          <TooltipRow color="var(--series-nonprod)" label="No productivo (malla)" value={`${fmtHours(hovered.unproductiveSeconds)}h`} />
          <TooltipRow color="var(--text-muted)" label="Apps productivas" value={`${fmtHours(hovered.productiveAppSeconds)}h`} />
          <TooltipRow color="var(--series-line)" label="% Productividad" value={`${hovered.overallProductivityPercent}%`} />
        </div>
      )}
    </div>
  )
}

function LegendItem({ color, shape, label }: { color: string; shape: 'area' | 'line'; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {shape === 'area' ? (
        <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
      ) : (
        <span className="inline-block w-3 h-0.5 rounded-full" style={{ backgroundColor: color }} />
      )}
      {label}
    </span>
  )
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="inline-block w-2.5 h-0.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
