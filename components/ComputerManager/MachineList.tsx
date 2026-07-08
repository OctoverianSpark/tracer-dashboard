'use client'
import { motion } from 'framer-motion'
import { Machine, machineLabel } from '@/types/Machine'
import { AppUser, Group } from '@/types/AppUser'
import MachineCard from './MachineCard'
import MachineDialog from './MachineDialog'
import Paginator from './Paginator'
import { deleteComputer } from '@/app/computers/actions'
import { useState, useMemo, useEffect } from 'react'
import { Search, LayoutGrid, List, FileDown, Trash2 } from 'lucide-react'
import { Input } from '@/app/_components/_ui/input'
import { Badge } from '@/app/_components/_ui/badge'
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { MotionTableBody, MotionTableRow } from '@/components/motion/MotionTable'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/app/_components/_ui/alert-dialog'
import { Button } from '@/app/_components/_ui/button'
import * as XLSX from 'xlsx'

interface MachineListProps {
  machines: Machine[]
  appusers: AppUser[]
  groups: Group[]
}

const PAGE_SIZE_GRID  = 12
const PAGE_SIZE_TABLE = 15

function formatDate(raw: string | undefined) {
  if (!raw) return '—'
  return new Date(raw).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

function exportXLSX(machines: Machine[], appusers: AppUser[], groups: Group[]) {
  const rows = machines.map(m => {
    const appuser = appusers.find(u => String(u.id) === String(m.appuser_id))
    const group   = groups.find(g => g.id === appuser?.group_id)
    return {
      'Hostname':        m.hostname,
      'Marca/Modelo':    machineLabel(m),
      'Estado':          (m.alive || m.isAlive) ? 'Online' : 'Offline',
      'Usuario':         m.username || '',
      'Nombre completo': m.displayName || '',
      'Empleado asignado': appuser?.full_name || '',
      'Grupo':           group?.name || '',
      'IP':              m.ip_address || '',
      'Número de serie': m.serial_number,
      'Último visto':    formatDate(m.last_seen),
    }
  })
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: 9 } }) }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Equipos')
  XLSX.writeFile(wb, `equipos_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export default function MachineList({ machines, appusers, groups }: MachineListProps) {
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
      <div className="flex gap-3 items-center flex-wrap rounded-xl border bg-card backdrop-blur-sm px-4 py-3">
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar hostname, marca, usuario, IP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {filtered.length > 0 && (
            <button
              onClick={() => exportXLSX(filtered, appusers, groups)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border bg-muted/40 hover:bg-muted transition-colors cursor-pointer"
            >
              <FileDown className="size-3.5" />
              Exportar
            </button>
          )}

          <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5">
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${view === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}
              title="Vista de tarjetas"
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setView('table')}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${view === 'table' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}
              title="Vista de tabla"
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">
          No se encontraron equipos.
        </p>
      ) : view === 'grid' ? (
        <>
          <motion.div
            key={page}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {paged.map(pc => (
              <motion.div key={pc.serial_number} variants={staggerItem}>
                <MachineCard
                  onDelete={serial => setConfirmSerial(serial)}
                  machine={pc}
                  appuser={appusers.find(u => String(u.id) === String(pc.appuser_id))}
                />
              </motion.div>
            ))}
          </motion.div>
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
              <MotionTableBody key={page} variants={staggerContainer} initial="initial" animate="animate">
                {paged.map(m => {
                  const online = m.alive || m.isAlive
                  return (
                    <MotionTableRow key={m.serial_number} variants={staggerItem}>
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
                    </MotionTableRow>
                  )
                })}
              </MotionTableBody>
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
