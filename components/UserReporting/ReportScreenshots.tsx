import { Button } from '@/app/_components/_ui/button'
import { Card, CardContent, CardHeader } from '@/app/_components/_ui/card'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger
} from '@/app/_components/_ui/dialog'
import { ZoomIn } from 'lucide-react'
import Image from 'next/image'
import React, { useEffect } from 'react'

interface ScreenshotsViewerProps {
  fileName: string
}

interface ScreenshotsListProps {
  screenshots: string[]
}

export default function ReportScreenshotsList ({
  screenshots
}: ScreenshotsListProps) {
  console.log(screenshots)

  return (
    <div className='grid grid-cols-4 gap-4'>
      {screenshots.map(file => (
        <ScreenshotsViewer fileName={file} key={crypto.randomUUID()} />
      ))}
    </div>
  )
}

export function ScreenshotsViewer ({ fileName }: ScreenshotsViewerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [date, setDate] = React.useState('')
  const [monitor, setMonitor] = React.useState<number>(0)

  useEffect(() => {
    const data = fileName.split('-')
    // ["20260220_181209", "AV", "DTI", "03", "0.jpg"]
    setMonitor(Number(data[4].split('.')[0])) // "0"

    const raw = data[0] // "20260220_181209"
    const [datePart, timePart] = raw.split('_')
    // datePart: "20260220", timePart: "181209"

    const year = datePart.slice(0, 4)
    const month = datePart.slice(4, 6)
    const day = datePart.slice(6, 8)

    const hours = timePart.slice(0, 2)
    const minutes = timePart.slice(2, 4)
    const seconds = timePart.slice(4, 6)

    const parsed = new Date(
      `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
    )
    const formatted = parsed.toLocaleString() // "20/2/2026, 18:12:09"

    setDate(formatted)
    console.log(formatted) // ✅ valor correcto, no el estado
  }, [])

  return (
    <Card>
      <CardHeader>
        <h2>{date}</h2>
        <span>Monitor {monitor + 1}</span>
      </CardHeader>
      <CardContent>
        <div className='flex flex-col items-center gap-4'>
          <Image
            src={`/api/screenshot/${fileName}`}
            loading='lazy'
            alt={fileName}
            width={800}
            height={450}
            className='rounded-md w-full object-contain'
          />
          <Dialog>
            <DialogTrigger asChild>
              <Button variant='outline' size='icon'>
                <ZoomIn />
              </Button>
            </DialogTrigger>
            <DialogContent className='bg-transparent border-none h-full w-full shadow-none'>
              <div className='relative w-full h-full scale-200'>
                <Image
                  src={`/api/screenshot/${fileName}`}
                  loading='eager'
                  alt={fileName}
                  fill
                  className='object-contain'
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
