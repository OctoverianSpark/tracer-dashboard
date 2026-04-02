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
  fileName: string,
}

interface ScreenshotsListProps {
  screenshots: string[],
  machineName: string
}

export default function ReportScreenshotsList ({
  screenshots,
  machineName
}: ScreenshotsListProps) {

  return (
    <div className='grid grid-cols-4 gap-4'>
      {screenshots.map(file => (
        <ScreenshotsViewer fileName={`${machineName}/${file}`} key={file} />
      ))}
    </div>
  )
}

export function ScreenshotsViewer ({ fileName }: ScreenshotsViewerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [date, setDate] = React.useState('')
  const [monitor, setMonitor] = React.useState<number>(0)

 useEffect(() => {
  const data = fileName.split("/")[1].split('_')
  console.log(data);
  
  // ["2026-02-20T18-12-09", "Monitor0.jpg"]
  
  const monitor = data[1].replace('Monitor', '')
  setMonitor(parseInt(monitor))

  const raw = data[0] // "2026-02-20T18-12-09"
  
  const parsed = new Date(raw.replace(/-(\d{2})-(\d{2})-(\d{3})Z$/, ':$1:$2.$3'))
  setDate(parsed.toLocaleString())
}, [])

  return (
    <Card>
      <CardHeader>
        <h2>{date}</h2>
        <span>Monitor {monitor}</span>
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
