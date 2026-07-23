"use client"
import { useMemo, useRef, useState } from 'react'
import { Programation } from '@/types/Schedules'
import { MallaHoraria } from './shared'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/app/_components/_ui/table'
import { useStaggerChildren, STAGGER_ITEM_INITIAL_STYLE } from '@/lib/animation'
import { Button } from '@/app/_components/_ui/button';
import { Trash2, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx'
import { deleteProgramation } from '@/app/time/actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/_components/_ui/alert-dialog';
import ListToolbar from '@/components/shared/ListToolbar'
import Paginator from '@/components/ComputerManager/Paginator'
import { useResetPageOnChange } from '@/components/shared/usePageReset'

interface Props {
  programations: Programation[]
}

const PAGE_SIZE = 15

function exportXLSX(programations: Programation[]) {
  const rows = programations.map(p => ({
    'Nombre':           p.name,
    'Entrada':          p.start_day,
    'Inicio Almuerzo':  p.start_lunch,
    'Fin Almuerzo':     p.end_lunch ?? '—',
    'Fin':              p.end_day ?? '—',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: 4 } }) }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Horarios')
  XLSX.writeFile(wb, `horarios_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export default function ProgramationTable({ programations }: Props) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const handleDelete = async (id:number) =>{
    await deleteProgramation(id)
  }

  const filtered = useMemo(
    () => programations.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
    [programations, search]
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )
  useResetPageOnChange(search, setPage)

  const bodyRef = useRef<HTMLTableSectionElement>(null)
  useStaggerChildren(bodyRef, { deps: [paged.map(p => p.id).join(',')] })

  return (
    <div className='space-y-2'>
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder='Buscar horario...'
        rightSlot={filtered.length > 0 && (
          <button
            onClick={() => exportXLSX(filtered)}
            className='flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border bg-muted/40 hover:bg-muted transition-colors cursor-pointer'
          >
            <FileDown className='size-3.5' />
            Exportar
          </button>
        )}
      />
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Entrada</TableHead>
          <TableHead>Inicio Almuerzo</TableHead>
          <TableHead>Fin Almuerzo</TableHead>
          <TableHead>Fin</TableHead>
          <TableHead>Malla</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody ref={bodyRef}>
        {paged.map(p => (
          <TableRow key={p.id} data-stagger-item style={STAGGER_ITEM_INITIAL_STYLE}>
            <TableCell>{p.name}</TableCell>
            <TableCell>{p.start_day}</TableCell>
            <TableCell>{p.start_lunch}</TableCell>
            <TableCell>{p.end_lunch ?? '—'}</TableCell>
            <TableCell>{p.end_day ?? '—'}</TableCell>
            <TableCell className='min-w-64'>
              <MallaHoraria
                start_day={p.start_day}
                start_lunch={p.start_lunch}
                end_lunch={p.end_lunch}
                end_day={p.end_day}
                size='table'
              />
            </TableCell>
            <TableCell>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className='text-destructive hover:text-destructive cursor-pointer' variant={'ghost'} size={'icon-sm'}>
                    <Trash2 />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar programación?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminará <strong>{p.name}</strong> permanentemente. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(p.id!)}>Eliminar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    <Paginator page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
  )
}