'use client'
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { MotionTableBody, MotionTableRow } from '@/components/motion/MotionTable'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/app/_components/_ui/alert-dialog'
import { Button } from '@/app/_components/_ui/button'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { deleteStateCategory } from '@/app/states/actions'
import { StateCategory } from '@/types/States'
import StateCategoryForm from './StateCategoryForm'

interface Props {
  categories: StateCategory[]
  onChanged: () => void
}

export default function StateCategoryTable({ categories, onChanged }: Props) {
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const confirmCategory = categories.find(c => c.id === confirmId)
  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order)

  async function handleDelete() {
    if (!confirmId) return
    setLoading(true)
    await deleteStateCategory(confirmId)
    setLoading(false)
    setConfirmId(null)
    onChanged()
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Clave</TableHead>
            <TableHead className="text-center">Orden</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <MotionTableBody variants={staggerContainer} initial="initial" animate="animate">
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center h-24 text-muted-foreground text-sm">
                No hay categorías registradas
              </TableCell>
            </TableRow>
          ) : sorted.map(cat => (
            <MotionTableRow key={cat.id} variants={staggerItem}>
              <TableCell>
                <span className="inline-block h-4 w-4 rounded-sm border" style={{ backgroundColor: cat.color ?? '#64748b' }} />
              </TableCell>
              <TableCell className="font-medium">{cat.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground font-mono">{cat.key}</TableCell>
              <TableCell className="text-center text-sm text-muted-foreground">{cat.sort_order}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1 justify-end">
                  <StateCategoryForm category={cat} onChanged={onChanged} />
                  <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => setConfirmId(cat.id!)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </MotionTableRow>
          ))}
        </MotionTableBody>
      </Table>

      <AlertDialog open={!!confirmId} onOpenChange={open => { if (!open) setConfirmId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{confirmCategory?.name}</strong>. Los estados que la usen quedarán sin
              categoría válida hasta que se les asigne una nueva. Esta acción no se puede deshacer.
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
