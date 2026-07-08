'use client'
import { Fragment, useState } from 'react'
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { MotionTableBody } from '@/components/motion/MotionTable'
import { staggerContainer } from '@/lib/motion'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/app/_components/_ui/alert-dialog'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { cn } from '@/app/_components/_lib/utils'
import { EyeOff, GripVertical, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteState, saveState } from '@/app/states/actions'
import { StateCategory, WorkState } from '@/types/States'
import WorkStateForm from './WorkStateForm'

interface Props {
  states: WorkState[]
  categories: StateCategory[]
  onChanged: () => void
}

export default function WorkStateTable({ states, categories, onChanged }: Props) {
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [dragOverCategoryId, setDragOverCategoryId] = useState<number | null>(null)
  const [moving, setMoving] = useState(false)

  const categoryOf = (id: number) => categories.find(c => c.id === id)
  const confirmState = states.find(s => s.id === confirmId)
  const usedCodes = states.map(s => s.code)

  async function handleDelete() {
    if (!confirmId) return
    setLoading(true)
    await deleteState(confirmId)
    setLoading(false)
    setConfirmId(null)
    onChanged()
  }

  async function handleDrop(targetCategory: StateCategory) {
    setDragOverCategoryId(null)
    const state = states.find(s => s.id === draggedId)
    setDraggedId(null)
    if (!state || state.category_id === targetCategory.id) return

    setMoving(true)
    try {
      await saveState({ ...state, category_id: targetCategory.id! })
      onChanged()
      toast.success('Estado recategorizado')
    } catch {
      toast.error('Error al mover el estado')
    } finally {
      setMoving(false)
    }
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
            <TableHead className="w-8" />
            <TableHead className="w-16">Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead className="text-center">Orden en categoría</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <MotionTableBody variants={staggerContainer} initial="initial" animate="animate">
          {states.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center h-24 text-muted-foreground text-sm">
                Este catálogo aún no tiene estados
              </TableCell>
            </TableRow>
          ) : groups.map(group => (
            <Fragment key={`group-${group.category?.id ?? 'none'}`}>
              <TableRow
                className={cn(
                  'hover:bg-transparent transition-colors',
                  group.category && dragOverCategoryId === group.category.id && 'bg-primary/10 outline-dashed outline-1 outline-primary/40'
                )}
                onDragOver={group.category ? e => { e.preventDefault(); setDragOverCategoryId(group.category!.id!) } : undefined}
                onDragLeave={group.category ? () => setDragOverCategoryId(null) : undefined}
                onDrop={group.category ? e => { e.preventDefault(); handleDrop(group.category!) } : undefined}
              >
                <TableCell colSpan={5} className="py-2">
                  {group.category ? (
                    <Badge variant="secondary" className="gap-1.5 font-normal">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: group.category.color ?? '#64748b' }} />
                      {group.category.name}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin categoría</span>
                  )}
                  {group.category && (
                    <span className="text-xs text-muted-foreground ml-2">Suelta un estado aquí para recategorizarlo</span>
                  )}
                </TableCell>
              </TableRow>
              {group.states.map(state => (
                // TableRow nativo (no MotionTableRow): framer-motion tipa onDragStart/onDragEnd
                // para su propio gesto de arrastre por puntero (PanInfo), no para el DnD nativo
                // de HTML que necesitamos acá para soltar sobre otra fila/categoría.
                <TableRow
                  key={state.id}
                  draggable={!moving}
                  onDragStart={e => { setDraggedId(state.id!); e.dataTransfer.effectAllowed = 'move' }}
                  onDragEnd={() => { setDraggedId(null); setDragOverCategoryId(null) }}
                  className={cn('transition-opacity', draggedId === state.id && 'opacity-40')}
                >
                  <TableCell className="cursor-grab active:cursor-grabbing text-muted-foreground">
                    <GripVertical className="size-4" />
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{state.code}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      {state.name}
                      {state.show_in_menu === false && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <EyeOff className="size-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>Oculto del menú del agente</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{state.sort_order}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <WorkStateForm state={state} categories={categories} usedCodes={usedCodes} onChanged={onChanged} />
                      <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => setConfirmId(state.id!)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
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
