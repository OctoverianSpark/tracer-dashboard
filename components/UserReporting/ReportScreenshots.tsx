'use client'

import { Button } from '@/app/_components/_ui/button'
import { Card, CardContent } from '@/app/_components/_ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/app/_components/_ui/dialog'
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

    console.log('[getPct] file:', fileName, '| ms:', ms, '| iv[0]:', productivityIntervals[0])

    if (ms === null) return undefined

    const exact = productivityIntervals.find(iv => ms >= iv.start && ms < iv.end)
    if (exact) return exact.pct
    // Fallback: intervalo más cercano dentro de 15 min
    const MAX_GAP = 15 * 60 * 1000
    let best: IntervalPct | undefined
    let bestDist = Infinity
    for (const iv of productivityIntervals) {
      const dist = ms < iv.start ? iv.start - ms : ms - iv.end
      if (dist < bestDist && dist <= MAX_GAP) { bestDist = dist; best = iv }
    }
    return best?.pct
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
          <p className="text-xs text-muted-foreground">
            {productivityIntervals === undefined
              ? 'Cargando productividad...'
              : `${productivityIntervals.length} intervalos de prod.`}
          </p>
        </div>

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
