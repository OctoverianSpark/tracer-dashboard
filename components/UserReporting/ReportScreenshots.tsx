'use client'

import { Button } from '@/app/_components/_ui/button'
import { Card, CardContent, CardHeader } from '@/app/_components/_ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/app/_components/_ui/dialog'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface ScreenshotsListProps {
  screenshots: string[]
  machineName: string
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

export default function ReportScreenshotsList({ screenshots, machineName }: ScreenshotsListProps) {
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

  const currentFile = openIndex !== null ? screenshots[openIndex] : null
  const currentSrc = currentFile ? `/api/screenshot/${machineName}/${currentFile}` : ''
  const currentDate = currentFile ? parseDate(currentFile) : ''

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{screenshots.length} capturas</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((file, i) => (
            <Card
              key={file}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setOpenIndex(i)}
            >
              <CardHeader className="pb-2">
                <p className="text-sm font-medium">{parseDate(file)}</p>
              </CardHeader>
              <CardContent>
                <Image
                  src={`/api/screenshot/${machineName}/${file}`}
                  loading="lazy"
                  alt={parseDate(file)}
                  width={800}
                  height={450}
                  className="rounded-md w-full object-contain h-56"
                />
              </CardContent>
            </Card>
          ))}
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
        <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] flex flex-col gap-2 p-4">
          <DialogTitle className="text-center shrink-0 text-sm">{currentDate}</DialogTitle>

          <div className="relative flex-1 min-h-0 w-full">
            {currentSrc && (
              <Image
                src={currentSrc}
                loading="eager"
                alt={currentFile ?? ''}
                fill
                className="object-contain"
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