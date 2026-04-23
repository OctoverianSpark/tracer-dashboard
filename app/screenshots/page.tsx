'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { getMachineReport, getMachines } from '../computers/actions'
import ReportScreenshotsList from '@/components/UserReporting/ReportScreenshots'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../_components/_ui/select'
import { Machine } from '@/types/Machine'
import { Input } from '../_components/_ui/input'
import { Label } from '../_components/_ui/label'

export default function Page() {
  const [screenshots, setScreenshots] = useState<string[]>([])
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [machine, setMachine] = useState<Machine>()
  const [machines, setMachines] = useState<Machine[]>([])
  const [actualMonitor, setActualMonitor] = useState<number | null>(null)

  // un solo useEffect para cargar máquinas
  useEffect(() => {
    getMachines().then(setMachines)
  }, [])

  // un solo useEffect para cargar reportes
  useEffect(() => {
    if (!machine) return
    getMachineReport(machine.hostname, date)
      .then(data => setScreenshots(data.files ?? []))
  }, [machine, date])

  // monitorCount derivado con useMemo en vez de useEffect + estado
  const monitorCount = useMemo(() => {
    return screenshots.reduce((max, filename) => {
      const match = filename.match(/_Monitor(\d+)\.jpg$/)
      return match ? Math.max(max, parseInt(match[1])) : max
    }, 0) || 1
  }, [screenshots])

  // screenshots filtrados derivados con useMemo
  const filteredScreenshots = useMemo(() => {
    if (actualMonitor === null) return screenshots
    return screenshots.filter(f => f.endsWith(`_Monitor${actualMonitor}.jpg`))
  }, [screenshots, actualMonitor])

  return (
    <div className='space-y-4'>
      <div className='flex gap-3 justify-between'>
        <div className='grid gap-1'>
          <Label>Equipo</Label>
          <Select
            value={machine?.serial_number}
            onValueChange={val => {
              setMachine(machines.find(m => m.serial_number === val))
              setActualMonitor(null) // reset monitor al cambiar equipo
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder='Selecciona un equipo' />
            </SelectTrigger>
            <SelectContent>
              {machines.map(m => (
                <SelectItem key={m.serial_number} value={m.serial_number}>
                  {m.hostname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='grid gap-1'>
          <Label>Fecha de capturas</Label>
          <Input type='date' value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      {machine && date && (
        <div className='space-y-4'>
          <Select
            value={actualMonitor === null ? 'all' : `${actualMonitor}`}
            onValueChange={val => setActualMonitor(val === 'all' ? null : parseInt(val))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Todos los monitores</SelectItem>
              {Array.from({ length: monitorCount }, (_, i) => (
                <SelectItem key={i + 1} value={`${i + 1}`}>
                  Monitor {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ReportScreenshotsList
            machineName={machine.hostname}
            screenshots={filteredScreenshots}
          />
        </div>
      )}
    </div>
  )
}