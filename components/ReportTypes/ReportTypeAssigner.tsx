'use client'
import { Button } from '@/app/_components/_ui/button'
import { Checkbox } from '@/app/_components/_ui/checkbox'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { Label } from '@/app/_components/_ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { assignReportTypeToGroup, unassignReportTypeFromGroup } from '@/app/reports/actions'
import { Group } from '@/types/AppUser'
import { ReportType, ReportTypeAssignment } from '@/types/Reports'
import { Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface Props {
  reportTypes: ReportType[]
  groups: Group[]
  assignments: ReportTypeAssignment[]
}

export default function ReportTypeAssigner({ reportTypes, groups, assignments }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null)
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  function handleSelectType(id: number) {
    setSelectedTypeId(id)
    setError(undefined)
    setSelectedGroupIds(assignments.filter(a => a.report_type_id === id).map(a => a.group_id))
  }

  function toggleGroup(id: number) {
    setSelectedGroupIds(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  function reset() {
    setSelectedTypeId(null)
    setSelectedGroupIds([])
    setError(undefined)
  }

  async function handleSave() {
    if (!selectedTypeId) {
      setError('Selecciona un tipo de reporte')
      return
    }
    setLoading(true)
    try {
      const existing = assignments.filter(a => a.report_type_id === selectedTypeId)
      const toAdd    = selectedGroupIds.filter(id => !existing.some(a => a.group_id === id))
      const toRemove = existing.filter(a => !selectedGroupIds.includes(a.group_id))

      await Promise.all([
        ...toAdd.map(groupId => assignReportTypeToGroup(selectedTypeId, groupId)),
        ...toRemove.map(a => unassignReportTypeFromGroup(a.id!)),
      ])

      toast.success('Asignación actualizada')
      reset()
      setOpen(false)
    } catch {
      toast.error('Error al guardar la asignación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Users className="size-4" />
          Asignar a grupos
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogTitle>Asignar tipo de reporte a grupos</DialogTitle>

        <div className="grid gap-2">
          <Label>Tipo de reporte</Label>
          <Select
            value={selectedTypeId?.toString() ?? ''}
            onValueChange={v => handleSelectType(Number(v))}
          >
            <SelectTrigger className={error ? 'border-destructive' : ''}>
              <SelectValue placeholder="Selecciona un tipo de reporte" />
            </SelectTrigger>
            <SelectContent>
              {reportTypes.map(rt => (
                <SelectItem key={rt.id} value={rt.id!.toString()}>{rt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>

        {selectedTypeId && (
          <div className="grid gap-2">
            <Label>Grupos</Label>
            {groups.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay grupos registrados.</p>
            ) : (
              <div className="rounded-md border p-3 flex flex-col gap-2 max-h-52 overflow-y-auto">
                {groups.map(g => (
                  <label key={g.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedGroupIds.includes(g.id!)}
                      onCheckedChange={() => toggleGroup(g.id!)}
                    />
                    <span className="text-sm">{g.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? 'Guardando...' : 'Guardar asignación'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
