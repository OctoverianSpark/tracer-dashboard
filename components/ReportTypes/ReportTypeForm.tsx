'use client'
import { Button } from '@/app/_components/_ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { saveReportType } from '@/app/reports/actions'
import { ReportType } from '@/types/Reports'
import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface ReportTypeFormProps {
  reportType?: ReportType
}

const EMPTY_REPORT_TYPE: ReportType = { name: '', description: '' }

export default function ReportTypeForm({ reportType = EMPTY_REPORT_TYPE }: ReportTypeFormProps) {
  const [values, setValues] = useState<ReportType>(reportType)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof ReportType, string>>>({})

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ReportType, string>> = {}
    if (!values.name) newErrors.name = 'El nombre del tipo de reporte es requerido'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues(prev => ({ ...prev, [e.target.id]: e.target.value }))
    setErrors(prev => ({ ...prev, [e.target.id]: undefined }))
  }

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('Corrige los errores antes de guardar')
      return
    }
    try {
      setLoading(true)
      await saveReportType(values)
      toast.success('Tipo de reporte guardado!')
      setValues(EMPTY_REPORT_TYPE)
      setErrors({})
      setOpen(false)
    } catch {
      toast.error('Ocurrió un error al guardar el tipo de reporte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button className="cursor-pointer" size={reportType?.id ? 'icon-sm' : 'default'} variant={reportType?.id ? 'ghost' : 'default'}>
              {reportType?.id ? <Pencil /> : <><Plus />Agregar tipo de reporte</>}
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {reportType?.id ? 'Editar tipo de reporte' : 'Registrar nuevo tipo de reporte'}
        </TooltipContent>
      </Tooltip>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {reportType?.id ? 'Editar tipo de reporte' : 'Registrar nuevo tipo de reporte'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            placeholder="Ej: Falla de equipo"
            value={values.name}
            onChange={onInputChange}
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && <span className="text-xs text-destructive">{errors.name}</span>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">Descripción</Label>
          <Input
            id="description"
            placeholder="Ej: Reporta un problema con el equipo asignado"
            value={values.description ?? ''}
            onChange={onInputChange}
          />
        </div>

        <DialogFooter>
          <Button className="cursor-pointer" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando...' : reportType?.id ? 'Actualizar' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
