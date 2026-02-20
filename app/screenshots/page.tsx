'use client'
import React, { useEffect, useState } from 'react'
import { getMachineReport } from '../computers/actions'
import ReportScreenshotsList from '@/components/UserReporting/ReportScreenshots'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../_components/_ui/select'

export default function page () {
  const [screenshots, setScreenshots] = useState<string[]>([])
  const [screenshotIndex, setScreenshotIndex] = useState<number>(0)
  const [date, setDate] = useState('2026-02-20')
  const [machine, setMachine] = useState({ machineName: 'AV-DTI-03' })
  const [monitorCount, setMonitorCount] = useState(1)
  const [actualMonitor, setActualMonitor] = useState<number | null>(null)

  useEffect(() => {
    const getReports = async () => {
      const data = await getMachineReport(machine.machineName, date)
      setScreenshots(data.files ?? [])
    }
    getReports()
  }, [machine, date])

  useEffect(() => {
    console.log(screenshots)
    const monitors =
      screenshots.reduce((max, filename) => {
        const match = filename.match(/-(\d+)\.jpg$/)
        if (!match) return max
        return Math.max(max, parseInt(match[1]))
      }, 0) + 1

    setMonitorCount(monitors)
    console.log(`Monitores detectados: ${monitorCount}`)
  }, [screenshots])

  return (
    <div>
      <Select
        onValueChange={value =>
          setActualMonitor(value === 'all' ? null : parseInt(value))
        }
        defaultValue='all'
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>Todos</SelectItem>
          {Array.from({ length: monitorCount }, (_, i) => (
            <SelectItem value={`${i}`} key={i}>
              Monitor {i + 1}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {actualMonitor !== null ? (
        <ReportScreenshotsList
          screenshots={screenshots.filter(file =>
            file.endsWith(`-${actualMonitor}.jpg`)
          )}
        />
      ) : (
        <ReportScreenshotsList screenshots={screenshots} />
      )}
    </div>
  )
}
