import { Schedule } from '@/types/Schedules'
import { Programation } from '@/types/Schedules'
import { AppUser } from '@/types/AppUser'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'

const DIAS = [
  { key: 'L', label: 'Lunes' },
  { key: 'M', label: 'Martes' },
  { key: 'X', label: 'Miércoles' },
  { key: 'J', label: 'Jueves' },
  { key: 'V', label: 'Viernes' },
  { key: 'S', label: 'Sábado' },
  { key: 'D', label: 'Domingo' },
]

interface Props {
  schedules: Schedule[]
  appuser: AppUser[]
  programations: Programation[]
}

// No necesita 'use client', es solo presentación
export default function ScheduleTable({ schedules, appuser, programations }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Empleado</TableHead>
          <TableHead>Horario</TableHead>
          <TableHead>Dia</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedules?.map(schedule => (
          <TableRow key={schedule.id}>
            <TableCell>
              {appuser.find(p => p.id === schedule.appuser_id)?.full_name}
            </TableCell>
            <TableCell>
              {programations.find(p => p.id === schedule.programation_id)?.name}
            </TableCell>
            <TableCell>
              {DIAS.find(d => d.key === schedule.day_of_week)?.label}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}