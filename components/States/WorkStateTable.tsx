'use client'
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { MotionTableBody, MotionTableRow } from '@/components/motion/MotionTable'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { Badge } from '@/app/_components/_ui/badge'
import { StateCategory, WorkState } from '@/types/States'
import WorkStateForm from './WorkStateForm'

interface Props {
  states: WorkState[]
  categories: StateCategory[]
}

export default function WorkStateTable({ states, categories }: Props) {
  const sorted = [...states].sort((a, b) => a.sort_order - b.sort_order)
  const categoryOf = (id: number) => categories.find(c => c.id === id)

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead className="text-center">Orden</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <MotionTableBody variants={staggerContainer} initial="initial" animate="animate">
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center h-24 text-muted-foreground text-sm">
                No hay estados registrados
              </TableCell>
            </TableRow>
          ) : sorted.map(state => {
            const category = categoryOf(state.category_id)
            return (
              <MotionTableRow key={state.id} variants={staggerItem}>
                <TableCell className="font-mono text-sm text-muted-foreground">{state.code}</TableCell>
                <TableCell className="font-medium">{state.name}</TableCell>
                <TableCell>
                  {category ? (
                    <Badge variant="secondary" className="gap-1.5 font-normal">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: category.color ?? '#64748b' }} />
                      {category.name}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin categoría</span>
                  )}
                </TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">{state.sort_order}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <WorkStateForm state={state} categories={categories} />
                  </div>
                </TableCell>
              </MotionTableRow>
            )
          })}
        </MotionTableBody>
      </Table>
    </div>
  )
}
