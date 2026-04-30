'use client'
import { useState } from 'react'
import { LateArrival, getLateArrivals } from '@/app/th/actions'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

const today = () => new Date().toISOString().slice(0, 10)

const StatusBadge = ({ status, minutesLate }: { status: LateArrival['status']; minutesLate: number }) => {
  if (status === 'on_time') return (
    <Badge className="gap-1 bg-green-600 text-white">
      <CheckCircle2 className="h-3 w-3" /> A tiempo
    </Badge>
  )
  if (status === 'late') return (
    <Badge className="gap-1 bg-yellow-500 text-white">
      <AlertCircle className="h-3 w-3" /> {minutesLate} min tarde
    </Badge>
  )
  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" /> Ausente
    </Badge>
  )
}

export default function LateArrivalsLog() {
  const [date, setDate] = useState(today())
  const [data, setData] = useState<LateArrival[] | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const result = await getLateArrivals(date)
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  const onTime = data?.filter(d => d.status === 'on_time').length ?? 0
  const late = data?.filter(d => d.status === 'late').length ?? 0
  const absent = data?.filter(d => d.status === 'absent').length ?? 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label>Fecha</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
        </div>
        <Button onClick={load} disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Cargando…</> : 'Consultar'}
        </Button>
      </div>

      {data === null && !loading && (
        <p className="text-center text-sm text-muted-foreground py-10">
          Selecciona una fecha para ver el registro de llegadas.
        </p>
      )}

      {data !== null && data.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-10">
          No hay usuarios programados para esta fecha.
        </p>
      )}

      {data !== null && data.length > 0 && (
        <>
          <div className="flex gap-4 text-sm">
            <span className="text-green-600 font-medium">{onTime} a tiempo</span>
            <span className="text-yellow-600 font-medium">{late} tarde</span>
            <span className="text-red-500 font-medium">{absent} ausentes</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Hora programada</TableHead>
                <TableHead>Primera actividad</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data
                .sort((a, b) => {
                  const order = { late: 0, absent: 1, on_time: 2 }
                  return order[a.status] - order[b.status]
                })
                .map(({ user, scheduledStart, firstActivity, status, minutesLate }) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{scheduledStart}</TableCell>
                    <TableCell className="text-muted-foreground">{firstActivity ?? '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={status} minutesLate={minutesLate} />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  )
}
