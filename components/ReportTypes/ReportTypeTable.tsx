'use client'
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { MotionTableBody, MotionTableRow } from '@/components/motion/MotionTable'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/app/_components/_ui/alert-dialog'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { deleteReportType } from '@/app/reports/actions'
import { Group } from '@/types/AppUser'
import { ReportType, ReportTypeAssignment } from '@/types/Reports'
import ReportTypeForm from './ReportTypeForm'

interface Props {
  reportTypes: ReportType[]
  groups: Group[]
  assignments: ReportTypeAssignment[]
}

export default function ReportTypeTable({ reportTypes, groups, assignments }: Props) {
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const confirmType = reportTypes.find(rt => rt.id === confirmId)

  async function handleDelete() {
    if (!confirmId) return
    setLoading(true)
    await deleteReportType(confirmId)
    setLoading(false)
    setConfirmId(null)
  }

  const groupsFor = (reportTypeId: number) =>
    assignments
      .filter(a => a.report_type_id === reportTypeId)
      .map(a => groups.find(g => g.id === a.group_id)?.name)
      .filter((name): name is string => !!name)

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Grupos</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <MotionTableBody variants={staggerContainer} initial="initial" animate="animate">
          {reportTypes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center h-24 text-muted-foreground text-sm">
                No hay tipos de reporte registrados
              </TableCell>
            </TableRow>
          ) : reportTypes.map(rt => {
            const assignedGroups = groupsFor(rt.id!)
            return (
              <MotionTableRow key={rt.id} variants={staggerItem}>
                <TableCell className="font-medium">{rt.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{rt.description || '—'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {assignedGroups.length === 0
                      ? <span className="text-xs text-muted-foreground">Sin asignar</span>
                      : assignedGroups.map(name => (
                          <Badge key={name} variant="secondary" className="text-xs font-normal">{name}</Badge>
                        ))
                    }
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 justify-end">
                    <ReportTypeForm reportType={rt} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="cursor-pointer"
                      onClick={() => setConfirmId(rt.id!)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </MotionTableRow>
            )
          })}
        </MotionTableBody>
      </Table>

      <AlertDialog open={!!confirmId} onOpenChange={open => { if (!open) setConfirmId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tipo de reporte?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{confirmType?.name}</strong> y sus asignaciones a grupos. Esta acción no se puede deshacer.
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
