"use client"
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
import { Button } from '@/app/_components/_ui/button';
import { Trash2 } from 'lucide-react';
import { deleteProgramation } from '@/app/time/actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/_components/_ui/alert-dialog';

interface Props {
  programations: Programation[]
}

export default function ProgramationTable({ programations }: Props) {

  const handleDelete = async (id:number) =>{
    await deleteProgramation(id)
  }

  return (
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
      <TableBody>
        {programations?.map(p => (
          <TableRow key={p.id}>
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
  )
}