'use client'

import { Button } from '@/app/_components/_ui/button'
import { Card, CardContent, CardHeader } from '@/app/_components/_ui/card'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { ZoomIn } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

interface ScreenshotsListProps {
  screenshots: string[]
  machineName: string
}

interface ScreenshotsViewerProps {
  fileName: string
}

const PAGE_SIZE = 24

function parseFileName(fileName: string) {
  const file = fileName.split('/')[1]

  const monitorMatch = file.match(/_Monitor(\d+)\.jpg$/i)
  const monitor = monitorMatch ? parseInt(monitorMatch[1]) : 0

  const dateMatch = file.match(/(\d{8})-(\d{6})/)
  if (!dateMatch) return { date: file, monitor }

  const [, d, t] = dateMatch
  const isoDate = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}`
  return { date: new Date(isoDate).toLocaleString(), monitor }
}

export default function ReportScreenshotsList({ screenshots, machineName }: ScreenshotsListProps) {
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [screenshots])

  const visible = useMemo(() => screenshots.slice(0, page * PAGE_SIZE), [screenshots, page])
  const remaining = screenshots.length - visible.length

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{screenshots.length} capturas</p>
      <div className="grid grid-cols-4 gap-4">
        {visible.map(file => (
          <ScreenshotsViewer fileName={`${machineName}/${file}`} key={file} />
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
  )
}

function ScreenshotsViewer({ fileName }: ScreenshotsViewerProps) {
  const { date, monitor } = parseFileName(fileName)
  const src = `/api/screenshot/${fileName}`

  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-medium">{date}</p>
        <p className="text-xs text-muted-foreground">Monitor {monitor}</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          <Image
            src={src}
            loading="lazy"
            alt={fileName}
            width={800}
            height={450}
            className="rounded-md w-full object-contain"
          />
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <ZoomIn />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-transparent border-none h-full w-full shadow-none">
              <DialogTitle className="sr-only">{date} · Monitor {monitor}</DialogTitle>
              <div className="relative w-full h-full">
                <Image
                  src={src}
                  loading="eager"
                  alt={fileName}
                  fill
                  className="object-contain"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
