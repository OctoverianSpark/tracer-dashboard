'use client'
import { UserScheduleRow } from '@/app/th/actions'
import { Badge } from '@/app/_components/_ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'

const DAY_LABELS: Record<string, string> = {
  D: 'Dom', L: 'Lun', M: 'Mar', X: 'Mié', J: 'Jue', V: 'Vie', S: 'Sáb',
}
const DAY_KEYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

interface Props {
  rows: UserScheduleRow[]
}

export default function THScheduleView({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-10">
        No hay usuarios con mallas horarias asignadas.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background">Usuario</TableHead>
            {DAY_KEYS.map(k => (
              <TableHead key={k} className="text-center min-w-24">
                {DAY_LABELS[k]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ user, days }) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium sticky left-0 bg-background">{user.full_name}</TableCell>
              {DAY_KEYS.map(k => {
                const entry = days[k]
                return (
                  <TableCell key={k} className="text-center">
                    {entry ? (
                      <div className="space-y-0.5">
                        <Badge variant="secondary" className="text-xs font-normal">
                          {entry.programation.start_day} – {entry.programation.end_day ?? '—'}
                        </Badge>
                        <p className="text-xs text-muted-foreground">{entry.programation.name}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
