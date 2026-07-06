'use client'
import { Fragment, useState } from 'react'
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { MotionTableBody, MotionTableRow } from '@/components/motion/MotionTable'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/app/_components/_ui/alert-dialog'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Trash2 } from 'lucide-react'
import { deleteState } from '@/app/states/actions'
import { StateCategory, WorkState } from '@/types/States'
import WorkStateForm from './WorkStateForm'

interface Props {
  states: WorkState[]
  categories: StateCategory[]
  groupId: number | null
}

export default function WorkStateTable({ states, categories, groupId }: Props) {
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const categoryOf = (id: number) => categories.find(c => c.id === id)
  const confirmState = states.find(s => s.id === confirmId)
  const usedCodes = states.map(s => s.code)

  async function handleDelete() {
    if (!confirmId) return
    setLoading(true)
    await deleteState(confirmId)
    setLoading(false)
    setConfirmId(null)
  }

  // Agrupado por categoría (en el orden propio de cada categoría) y, dentro de cada grupo,
  // ordenado por el sort_order relativo del estado — no es un orden global entre los estados.
  const sortedCategories = [...categories].sort((a, b) => a.sort_order - b.sort_order)
  const withoutCategory = states.filter(s => !categoryOf(s.category_id))
  const groups = [
    ...sortedCategories.map(cat => ({
      category: cat,
      states: states
        .filter(s => s.category_id === cat.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    })),
    ...(withoutCategory.length > 0 ? [{ category: null, states: withoutCategory }] : []),
  ]

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead className="text-center">Orden en categoría</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <MotionTableBody variants={staggerContainer} initial="initial" animate="animate">
          {states.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center h-24 text-muted-foreground text-sm">
                Este catálogo aún no tiene estados
              </TableCell>
            </TableRow>
          ) : groups.map(group => (
            <Fragment key={`group-${group.category?.id ?? 'none'}`}>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-2">
                  {group.category ? (
                    <Badge variant="secondary" className="gap-1.5 font-normal">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: group.category.color ?? '#64748b' }} />
                      {group.category.name}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin categoría</span>
                  )}
                </TableCell>
              </TableRow>
              {group.states.map(state => (
                <MotionTableRow key={state.id} variants={staggerItem}>
                  <TableCell className="font-mono text-sm text-muted-foreground">{state.code}</TableCell>
                  <TableCell className="font-medium">{state.name}</TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{state.sort_order}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <WorkStateForm state={state} groupId={groupId} categories={categories} usedCodes={usedCodes} />
                      <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => setConfirmId(state.id!)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </MotionTableRow>
              ))}
            </Fragment>
          ))}
        </MotionTableBody>
      </Table>

      <AlertDialog open={!!confirmId} onOpenChange={open => { if (!open) setConfirmId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estado?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{confirmState?.name}</strong> (código {confirmState?.code}) de este catálogo.
              Los registros que el agente ya envió con ese código se mostrarán con su valor crudo hasta
              que se vuelva a definir. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
