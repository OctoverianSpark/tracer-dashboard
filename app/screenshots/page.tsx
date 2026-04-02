'use client'
import React, { useEffect, useState } from 'react'
import { getMachineReport, getMachines } from '../computers/actions'
import ReportScreenshotsList from '@/components/UserReporting/ReportScreenshots'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../_components/_ui/select'
import { Machine } from '@/types/Machine'
import { Input } from '../_components/_ui/input'
import { Label } from '../_components/_ui/label'

export default function Page () {
  const [screenshots, setScreenshots] = useState<string[]>([])
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [machine, setMachine] = useState<Machine>()
  const [machines, setMachines] = useState<Machine[]>([])
  const [monitorCount, setMonitorCount] = useState(1)
  const [actualMonitor, setActualMonitor] = useState<number | null>(null)


  useEffect(()=>{

    const computers = async () => {

        const computers = await getMachines()

        setMachines(computers)
        
    }

    computers()


  },[])
  
  useEffect(() => {
    
    if(!machine) return
    const getReports = async () => {
      const data = await getMachineReport(machine.machineName, date)
      setScreenshots(data.files ?? [])
    }
    getReports()
  }, [machine, date])

useEffect(() => {
  const monitors = screenshots.reduce((max, filename) => {
    const match = filename.match(/_Monitor(\d+)\.jpg$/)
    if (!match) return max
    return Math.max(max, parseInt(match[1]))
  }, 0)

  setMonitorCount(monitors || 1)
}, [screenshots])

  return (
    <div>
      <div className="flex gap-3 justify-between">
          <div className="grid">
                
            <Select onValueChange={(val)=>setMachine(machines.find(machine=>machine.machineId === val))} value={machine?.machineId}>
                <SelectTrigger >
                  <SelectValue placeholder='Equipo'/>
                </SelectTrigger>
                <SelectContent>
                  {machines.map(machine => (
                    <SelectItem key={machine.machineId} value={machine.machineId}>
                      {machine.machineName}
                    </SelectItem>
                  ))}
                </SelectContent>
            </Select>
          </div>

          <div className="grid">
              <Label>Fecha de capturas</Label>
            <Input type='date' value={date} onChange={(e)=>setDate(e.target.value)} />

          </div>
      </div>


      {(machine && date) && (
        <>
          <Select
            onValueChange={value =>
              setActualMonitor(value === 'all' ? null : parseInt(value))
            }
            value={actualMonitor === null ? 'all' : `${actualMonitor}`}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Todos</SelectItem>
              {Array.from({ length: monitorCount }, (_, i) => (
                <SelectItem value={`${i + 1}`} key={i + 1}>
                  Monitor {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {actualMonitor !== null ? (
            <ReportScreenshotsList
              machineName={machine.machineName}
              screenshots={screenshots.filter(file =>
                file.endsWith(`_Monitor${actualMonitor}.jpg`)
              )}
            />
          ) : (
            <ReportScreenshotsList
              machineName={machine.machineName}
              screenshots={screenshots}
            />
          )}
        </>
      )}
    </div>
  )
}
