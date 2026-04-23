'use client'
import { Input } from '@/app/_components/_ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { findAsignedMachines } from '@/app/computers/actions'
import { getappuser } from '@/app/app/actions'
import { getStateLog } from "@/app/time/actions"
import { Timeline } from '@/components/TimeReporting/Timeline'
import { Machine } from '@/types/Machine'
import { AppUser } from '@/types/AppUser'
import { StateLog } from '@/types/StateLog'
import React, { useEffect, useState } from 'react'

export default function Page() {
  const [appuser, setappuser] = useState<AppUser[]>([])
  const [computers, setComputers] = useState<Machine[]>([])
  const [date, setDate] = useState<string>('')
  const [logs, setLogs] = useState<StateLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<StateLog[]>([])
  const [selectedAppUser, setSelected] = useState<AppUser | undefined>()
  const [selectedComputer, setComputer] = useState<Machine|undefined>()

  useEffect(() => {
    getappuser().then(setappuser)
    

  }, [])

  useEffect(()=>{
    if(!selectedAppUser) return
    console.log(selectedAppUser);
    

    findAsignedMachines(selectedAppUser.id!).then(setComputers)
  },[selectedAppUser])

  useEffect(() => {
    if (!selectedAppUser || !selectedComputer) return
    getStateLog(selectedAppUser.id!,selectedComputer.id!).then(setLogs)
  }, [selectedAppUser,selectedComputer])

  // Filtro sin loop — usa estado separado
  useEffect(() => {
    if (!date) return
    setFilteredLogs(logs.filter(log => log.timestamp.includes(date)))
  }, [logs, date])

  return (
    <div>
      <div className="flex justify-between">
        <div className="grid">
          
        <Select
          onValueChange={val => setSelected(appuser.find(e => e.id === Number(val)))}
          value={selectedAppUser?.id?.toString()}
        >
          <SelectTrigger>
            <SelectValue placeholder='Seleccione' />
          </SelectTrigger>
          <SelectContent>
            {appuser.map(employee => (
              <SelectItem key={employee.id} value={`${employee.id}`}>
                {employee.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          onValueChange={val => setComputer(computers.find(e => e.id === Number(val)))}
          value={selectedComputer?.id?.toString()}
        >
          <SelectTrigger>
            <SelectValue placeholder='Seleccione' />
          </SelectTrigger>
          <SelectContent>
            {computers.map((computer,i) => (
              <SelectItem key={computer.id} value={`${computer.id}`}>
                Computador {i + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>
        

        <div className="w-40">
          <Input type='date' value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      {date && (
        <Timeline
          logs={filteredLogs.map(log => ({
            state: log.state.toString(),
            category: log.category.toString(),
            timestamp: new Date(log.timestamp).toISOString(),
          }))}
        />
      )}
    </div>
  )
}