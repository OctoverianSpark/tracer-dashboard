'use client'
import { Machine, machineLabel } from '@/types/Machine'
import MachineCard from './MachineCard'
import MachineDialog from './MachineDialog'
import Paginator from './Paginator'
import { deleteComputer } from '@/app/computers/actions'
import { useState, useMemo, useEffect } from 'react'
import { Search, LayoutGrid, List, FileDown, Trash2 } from 'lucide-react'
import { Input } from '@/app/_components/_ui/input'
import { Badge } from '@/app/_components/_ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/app/_components/_ui/alert-dialog'
import { Button } from '@/app/_components/_ui/button'
import * as XLSX from 'xlsx'

interface MachineListProps {
  machines: Machine[]
}

const PAGE_SIZE_GRID  = 12
const PAGE_SIZE_TABLE = 15

function formatDate(raw: string | undefined) {
  if (!raw) return '—'
  return new Date(raw).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

function exportXLSX(machines: Machine[]) {
  const rows = machines.map(m => ({
    'Hostname':        m.hostname,
    'Marca/Modelo':    machineLabel(m),
    'Estado':          (m.alive || m.isAlive) ? 'Online' : 'Offline',
    'Usuario':         m.username || '',
    'Nombre completo': m.displayName || '',
    'IP':              m.ip_address || '',
    'Número de serie': m.serial_number,
    'Último visto':    formatDate(m.last_seen),
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: 7 } }) }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Equipos')
  XLSX.writeFile(wb, `equipos_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export default function MachineList({ machines }: MachineListProps) {
  const [search, setSearch]             = useState('')
  const [view, setView]                 = useState<'grid' | 'table'>('grid')
  const [page, setPage]                 = useState(1)
  const [confirmSerial, setConfirmSerial] = useState<string | null>(null)

  const filtered = useMemo(() => machines.filter(m =>
    m.hostname.toLowerCase().includes(search.toLowerCase()) ||
    machineLabel(m).toLowerCase().includes(search.toLowerCase()) ||
    m.username?.toLowerCase().includes(search.toLowerCase()) ||
    m.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    m.ip_address?.toLowerCase().includes(search.toLowerCase())
  ), [machines, search])

  const pageSize   = view === 'grid' ? PAGE_SIZE_GRID : PAGE_SIZE_TABLE
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged      = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])

  // Resetear página cuando cambian los filtros o la vista
  useEffect(() => { setPage(1) }, [search, view])

  const confirmMachine = machines.find(m => m.serial_number === confirmSerial)

  const handleDelete = (serial: string) => {
    deleteComputer(serial)
    setConfirmSerial(null)
  }

  if (machines.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-12">
        No hay equipos registrados.
      </p>
    )
  }

  return (
    <div className="space-y-4">

      {/* Barra de herramientas */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 min-w-0 w-full sm:w-auto">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar hostname, marca, usuario, IP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex gap-1 border rounded-md p-0.5">
          <button
            onClick={() => setView('grid')}
            className={`p-1.5 rounded cursor-pointer transition-colors ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            title="Vista de tarjetas"
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            onClick={() => setView('table')}
            className={`p-1.5 rounded cursor-pointer transition-colors ${view === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            title="Vista de tabla"
          >
            <List className="size-4" />
          </button>
        </div>

        {filtered.length > 0 && (
          <button
            onClick={() => exportXLSX(filtered)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors cursor-pointer"
          >
            <FileDown className="size-4" />
            Exportar Excel
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">
          No se encontraron equipos.
        </p>
      ) : view === 'grid' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paged.map(pc => (
              <MachineCard onDelete={serial => setConfirmSerial(serial)} machine={pc} key={pc.serial_number} />
            ))}
          </div>
          <Paginator page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />
        </>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hostname</TableHead>
                  <TableHead>Marca / Modelo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Número de serie</TableHead>
                  <TableHead>Último visto</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(m => {
                  const online = m.alive || m.isAlive
                  return (
                    <TableRow key={m.serial_number}>
                      <TableCell className="font-medium">{m.hostname}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{machineLabel(m) || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={online ? 'default' : 'secondary'} className={`text-xs ${online ? 'bg-green-500 hover:bg-green-500' : ''}`}>
                          {online ? '🟢 Online' : '🔴 Offline'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{m.username || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{m.ip_address || '—'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{m.serial_number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(m.last_seen)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MachineDialog machine={m} />
                          <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => setConfirmSerial(m.serial_number)}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <Paginator page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />
        </>
      )}

      <AlertDialog open={!!confirmSerial} onOpenChange={open => { if (!open) setConfirmSerial(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar computadora?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{confirmMachine ? confirmMachine.hostname : confirmSerial}</strong> permanentemente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmSerial && handleDelete(confirmSerial)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
