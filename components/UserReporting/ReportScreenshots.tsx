'use client'

import { Button } from '@/app/_components/_ui/button'
import { Card, CardContent } from '@/app/_components/_ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/app/_components/_ui/dialog'
import { zip } from 'fflate'
import { Archive, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStaggerChildren, STAGGER_ITEM_INITIAL_STYLE } from '@/lib/animation'

async function downloadOne(url: string, filename: string) {
  const res = await fetch(url)
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}

function zipFiles(data: Record<string, Uint8Array>): Promise<Uint8Array> {
  return new Promise((resolve, reject) =>
    zip(data, (err, result) => (err ? reject(err) : resolve(result)))
  )
}

interface IntervalPct { start: number; end: number; pct: number }

interface ScreenshotsListProps {
  screenshots: string[]
  machineName: string
  productivityIntervals?: IntervalPct[] | undefined
}

const PAGE_SIZE = 24

// Formato de nombre: 2026-06-09T20-42-11-939Z_Monitor1.jpg
const FILE_REGEX = /(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})(?:-(\d{3}))?Z/

function parseDate(fileName: string): string {
  const m = fileName.match(FILE_REGEX)
  if (!m) return fileName
  const iso = `${m[1]}T${m[2]}:${m[3]}:${m[4]}${m[5] ? `.${m[5]}` : ''}Z`
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function parseTime(fileName: string): string {
  const m = fileName.match(FILE_REGEX)
  if (!m) return ''
  const iso = `${m[1]}T${m[2]}:${m[3]}:${m[4]}${m[5] ? `.${m[5]}` : ''}Z`
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function fileMs(fileName: string): number | null {
  const m = fileName.match(FILE_REGEX)
  if (!m) return null
  const iso = `${m[1]}T${m[2]}:${m[3]}:${m[4]}${m[5] ? `.${m[5]}` : ''}Z`
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

  const gridRef = useRef<HTMLDivElement>(null)
  useStaggerChildren(gridRef, { deps: [visible.length] })

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
  const [zipping, setZipping] = useState(false)
  const [zipProgress, setZipProgress] = useState(0)

  async function handleDownloadZip() {
    if (zipping) return
    setZipping(true)
    setZipProgress(0)
    try {
      const fileData: Record<string, Uint8Array> = {}
      const BATCH = 5
      for (let i = 0; i < screenshots.length; i += BATCH) {
        await Promise.all(
          screenshots.slice(i, i + BATCH).map(async f => {
            const res = await fetch(`/api/screenshot/${machineName}/${f}`)
            fileData[f] = new Uint8Array(await res.arrayBuffer())
          })
        )
        setZipProgress(Math.min(i + BATCH, screenshots.length))
      }
      const data = await zipFiles(fileData)
      const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/zip' })
      const dateStr = screenshots[0]?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? 'export'
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `capturas_${machineName}_${dateStr}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
    } catch (e) {
      console.error('[ZIP]', e)
    } finally {
      setZipping(false)
    }
  }

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
          <Button variant="outline" size="sm" onClick={handleDownloadZip} disabled={zipping} className="gap-1.5">
            <Archive className="h-3.5 w-3.5" />
            {zipping ? `Empaquetando… ${zipProgress}/${screenshots.length}` : 'Descargar ZIP'}
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" ref={gridRef}>
          {visible.map((file, i) => {
            const pct = getPct(file)
            return (
              <div key={file} data-stagger-item style={STAGGER_ITEM_INITIAL_STYLE}>
                <Card
                  className="group cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
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
                    <button
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/80 text-white rounded p-1"
                      onClick={e => { e.stopPropagation(); downloadOne(`/api/screenshot/${machineName}/${file}`, file) }}
                      title="Descargar captura"
                    >
                      <Download className="h-3 w-3" />
                    </button>
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
              </div>
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {(openIndex ?? 0) + 1} / {screenshots.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => currentSrc && currentFile && downloadOne(currentSrc, currentFile)}
                title="Descargar esta captura"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
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
