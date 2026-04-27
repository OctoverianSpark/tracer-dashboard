import { Schedule, Programation } from '@/types/Schedules'
import { AppUser } from '@/types/AppUser'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { DIAS } from './shared'

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