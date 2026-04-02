'use client'
import { Input } from '@/app/_components/_ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { getPersonal } from '@/app/personal/actions'
import { getStateLog } from "@/app/time/actions"
import { Timeline } from '@/components/TimeReporting/Timeline'
import { Employee } from '@/types/Personal'
import { StateLog } from '@/types/StateLog'
import React, { useEffect, useState } from 'react'

export default function Page() {
  const [personal, setPersonal] = useState<Employee[]>([])
  const [date, setDate] = useState<string>('')
  const [logs, setLogs] = useState<StateLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<StateLog[]>([])
  const [selectedEmployee, setSelected] = useState<Employee | undefined>()

  useEffect(() => {
    getPersonal().then(setPersonal)
  }, [])

  useEffect(() => {
    if (!selectedEmployee) return
    getStateLog(selectedEmployee.id!).then(setLogs)
  }, [selectedEmployee])

  // Filtro sin loop — usa estado separado
  useEffect(() => {
    if (!date) return
    setFilteredLogs(logs.filter(log => log.timestamp.includes(date)))
  }, [logs, date])

  return (
    <div>
      <div className="flex justify-between">
        <Select
          onValueChange={val => setSelected(personal.find(e => e.id === Number(val)))}
          value={selectedEmployee?.id?.toString()}
        >
          <SelectTrigger>
            <SelectValue placeholder='Seleccione' />
          </SelectTrigger>
          <SelectContent>
            {personal.map(employee => (
              <SelectItem key={employee.id} value={`${employee.id}`}>
                {employee.first_name} {employee.middle_name} {employee.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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