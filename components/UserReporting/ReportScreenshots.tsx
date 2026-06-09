'use client'

import { Button } from '@/app/_components/_ui/button'
import { Card, CardContent } from '@/app/_components/_ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/app/_components/_ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface IntervalPct { start: number; end: number; pct: number }

interface ScreenshotsListProps {
  screenshots: string[]
  machineName: string
  productivityIntervals?: IntervalPct[] | undefined
}

const PAGE_SIZE = 24

function parseDate(fileName: string): string {
  const match = fileName.match(/(\d{8})-(\d{6})/)
  if (!match) return fileName

  const [, d, t] = match
  const iso = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}`
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function parseTime(fileName: string): string {
  const match = fileName.match(/-(\d{6})/)
  if (!match) return ''
  const t = match[1]
  return `${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}`
}

function fileMs(fileName: string): number | null {
  const match = fileName.match(/(\d{8})-(\d{6})/)
  if (!match) return null
  const [, d, t] = match
  const iso = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}`
  const ms = new Date(iso).getTime()
  return isNaN(ms) ? null : ms
}

function ProductivityBadge({ pct }: { pct: number | undefined }) {
  if (pct === undefined) return null
  const color = pct >= 70 ? 'bg-green-600' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <span className={`text-xs text-white font-medium px-1.5 py-0.5 rounded ${color}`}>
      {pct}%
    </span>
  )
}


function pctColor(pct: number) {
  if (pct >= 70) return '#22c55e'
  if (pct >= 40) return '#eab308'
  return '#ef4444'
}

function fmt(ms: number) {
  return new Date(ms).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function ProductivityTimeline({ intervals }: { intervals: IntervalPct[] | undefined }) {
  if (intervals === undefined) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Productividad por intervalo</p>
        <div className="w-full h-8 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (intervals.length === 0) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Productividad por intervalo</p>
        <div className="w-full h-8 bg-muted rounded flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Sin datos de productividad para este día</span>
        </div>
      </div>
    )
  }

  const sorted = [...intervals].sort((a, b) => a.start - b.start)
  const minMs  = sorted[0].start
  const maxMs  = sorted[sorted.length - 1].end
  const range  = maxMs - minMs
  if (range <= 0) return null

  const toLeft  = (ms: number) => ((ms - minMs) / range) * 100
  const toWidth = (s: number, e: number) => Math.max(0.3, ((e - s) / range) * 100)

  // Etiquetas de hora sobre el rango visible
  const startHour = new Date(minMs).getHours()
  const endHour   = new Date(maxMs).getHours() + 1
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)

  return (
    <div className="space-y-1.5 pt-2">
      <p className="text-xs font-medium text-muted-foreground">Productividad por intervalo</p>

      {/* Barra de colores */}
      <TooltipProvider delayDuration={100}>
      <div className="relative w-full h-8 bg-muted rounded overflow-hidden">
        {sorted.map((iv, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <div
                className="absolute h-full cursor-help transition-[filter] duration-100 hover:brightness-125 flex items-center justify-center overflow-hidden"
                style={{
                  left:            `${toLeft(iv.start)}%`,
                  width:           `${toWidth(iv.start, iv.end)}%`,
                  backgroundColor: pctColor(iv.pct),
                }}
              >
                <span className="text-[10px] font-bold text-white/90 select-none leading-none">
                  {iv.pct}%
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs font-medium">{fmt(iv.start)} – {fmt(iv.end)}</p>
              <p className="text-xs">{iv.pct}% productividad</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {/* Líneas de hora */}
        {hours.map(h => {
          const d = new Date(minMs)
          d.setHours(h, 0, 0, 0)
          const left = toLeft(d.getTime())
          if (left < 0 || left > 100) return null
          return (
            <div
              key={h}
              className="absolute top-0 h-full border-l border-white/40 pointer-events-none"
              style={{ left: `${left}%` }}
            />
          )
        })}
      </div>
      </TooltipProvider>

      {/* Labels de hora */}
      <div className="relative w-full h-4">
        {hours.map(h => {
          const d = new Date(minMs)
          d.setHours(h, 0, 0, 0)
          const left = toLeft(d.getTime())
          if (left < 0 || left > 100) return null
          return (
            <span
              key={h}
              className="absolute text-[10px] text-muted-foreground -translate-x-1/2 select-none"
              style={{ left: `${left}%` }}
            >
              {h}:00
            </span>
          )
        })}
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-green-500" />≥ 70 %
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-yellow-500" />40 – 69 %
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-red-500" />&lt; 40 %
        </span>
      </div>
    </div>
  )
}

export default function ReportScreenshotsList({ screenshots, machineName, productivityIntervals }: ScreenshotsListProps) {
  const [page, setPage] = useState(1)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  useEffect(() => { setPage(1) }, [screenshots])

  const visible = useMemo(() => screenshots.slice(0, page * PAGE_SIZE), [screenshots, page])
  const remaining = screenshots.length - visible.length

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= screenshots.length) return
    setOpenIndex(index)
  }, [screenshots.length])

  useEffect(() => {
    if (openIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goTo(openIndex + 1)
      else if (e.key === 'ArrowLeft') goTo(openIndex - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openIndex, goTo])

  const getPct = (fileName: string): number | undefined => {
    if (!productivityIntervals?.length) return undefined
    const ms = fileMs(fileName)
    if (ms === null) return undefined
    return productivityIntervals.find(iv => ms >= iv.start && ms < iv.end)?.pct
  }

  const [imgLoaded, setImgLoaded] = useState(false)

  const currentFile = openIndex !== null ? screenshots[openIndex] : null
  const currentSrc  = currentFile ? `/api/screenshot/${machineName}/${currentFile}` : ''
  const currentDate = currentFile ? parseDate(currentFile) : ''
  const currentPct  = currentFile ? getPct(currentFile) : undefined

  // Reinicia estado de carga cada vez que cambia la imagen
  useEffect(() => { setImgLoaded(false) }, [currentSrc])

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{screenshots.length} capturas</p>
        </div>

        <ProductivityTimeline intervals={productivityIntervals} />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visible.map((file, i) => {
            const pct = getPct(file)
            return (
              <Card
                key={file}
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                onClick={() => setOpenIndex(i)}
              >
                <CardContent className="p-0">
                  <div className="relative">
                    <Image
                      src={`/api/screenshot/${machineName}/${file}`}
                      loading="lazy"
                      alt={parseDate(file)}
                      width={800}
                      height={450}
                      className="w-full object-contain h-36"
                    />
                    {/* barra de productividad sobre la imagen */}
                    {productivityIntervals === undefined ? (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20 animate-pulse" />
                    ) : pct !== undefined ? (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30">
                        <div
                          className={`h-full ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-400' : 'bg-red-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    ) : null}
                    {/* badge de % sobre la esquina inferior derecha */}
                    {pct !== undefined && (
                      <span className={`absolute bottom-2 right-1.5 text-[10px] font-bold px-1 py-0.5 rounded leading-none text-white
                        ${pct >= 70 ? 'bg-green-600/90' : pct >= 40 ? 'bg-yellow-500/90' : 'bg-red-600/90'}`}>
                        {pct}%
                      </span>
                    )}
                  </div>
                  <div className="px-2 py-1.5">
                    <span className="text-xs text-muted-foreground">{parseTime(file)}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
        {remaining > 0 && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setPage(p => p + 1)}>
              Cargar más ({remaining} restantes)
            </Button>
          </div>
        )}

      </div>

      <Dialog open={openIndex !== null} onOpenChange={open => !open && setOpenIndex(null)}>
        <DialogContent className="sm:max-w-[92vw] w-[92vw] p-4 gap-3">
          <DialogTitle className="text-center text-sm flex items-center justify-center gap-2">
            {currentDate}
            <ProductivityBadge pct={currentPct} />
          </DialogTitle>

          <div className="relative w-full h-[75vh] flex items-center justify-center overflow-hidden">
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
              </div>
            )}
            {currentSrc && (
              <Image
                src={currentSrc}
                loading="eager"
                decoding="async"
                alt={currentFile ?? ''}
                width={1920}
                height={1080}
                onLoad={() => setImgLoaded(true)}
                className={`transition-opacity duration-200 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '75vh' }}
              />
            )}
          </div>

          <div className="flex justify-between items-center shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() => goTo(openIndex! - 1)}
              disabled={openIndex === 0}
            >
              <ChevronLeft />
            </Button>
            <span className="text-sm text-muted-foreground">
              {(openIndex ?? 0) + 1} / {screenshots.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => goTo(openIndex! + 1)}
              disabled={openIndex === screenshots.length - 1}
            >
              <ChevronRight />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
