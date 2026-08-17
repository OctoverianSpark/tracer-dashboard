'use client'
import { Button } from '@/app/_components/_ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { saveProgramation, updateProgramation } from '@/app/time/actions'
import { Programation } from '@/types/Schedules'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { MallaHoraria, TimeField } from './shared'

const EMPTY_FORM: Programation = {
  name: '', start_day: '', start_lunch: '', end_lunch: '', end_day: ''
}

interface ProgramationFormProps {
  // Si se pasa, el formulario edita esta plantilla (PUT) en vez de crear una nueva (POST) —
  // usado por el botón "Editar" de ProgramationTable. Sin esto, se comporta como antes.
  programation?: Programation
  trigger?: React.ReactNode
}

export default function ProgramationForm({ programation, trigger }: ProgramationFormProps) {
  const isEdit = !!programation
  const [form, setForm] = useState<Programation>(programation ?? EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof Programation, string>>>({})
  const [open, setOpen] = useState(false)

  // Recarga el form cada vez que se abre en modo edición, por si programation cambió entre
  // aperturas (ej. otro admin lo editó mientras tanto).
  useEffect(() => {
    if (open) setForm(programation ?? EMPTY_FORM)
  }, [open, programation])

  function handleChange(field: keyof Programation, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof Programation, string>> = {}
    if (!form.name)        newErrors.name        = 'La descripción es requerida'
    if (!form.start_day)   newErrors.start_day   = 'La entrada es requerida'
    if (!form.start_lunch) newErrors.start_lunch = 'El inicio de almuerzo es requerido'
    if (!form.end_lunch) newErrors.end_lunch = 'El fin de almuerzo es requerido'
    if (!form.end_day)     newErrors.end_day     = 'El fin es requerido'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function saveData() {
    if (!validate()) {
      toast.error('Corrige los errores antes de guardar el horario')

    }else{

      const data = {
        name:        form.name,
        start_day:   form.start_day,
        start_lunch: form.start_lunch,
        ...(form.end_lunch && { end_lunch: form.end_lunch }),
        ...(form.end_day   && { end_day:   form.end_day }),
      }

      if (isEdit) {
        await updateProgramation(programation!.id!, data)
      } else {
        await saveProgramation(data)
      }
      setForm(EMPTY_FORM)
      setErrors({})
      setOpen(false)
      toast.success(isEdit ? 'Horario actualizado exitosamente' : 'Horario guardado exitosamente')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button>Agregar Horario</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogTitle>{isEdit ? 'Editar Malla' : 'Registrar Malla'}</DialogTitle>

        <div className="grid gap-1">
          <Label>Descripcion del horario</Label>
          <Input
            placeholder="Ej: Turno mañana"
            value={form.name}
            onChange={e => handleChange('name', e.target.value)}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <span className='text-xs text-red-500'>{errors.name}</span>}
        </div>

        <div className="flex gap-2 flex-nowrap overflow-x-auto pb-1">
          <div className="grid gap-1 min-w-0">
            <TimeField
              label="Entrada"
              value={form.start_day}
              onChange={v => handleChange('start_day', v)}
              error={errors.start_day}
            />
          </div>
          <div className="grid gap-1 min-w-0">
            <TimeField
              label="Inicio Almuerzo"
              value={form.start_lunch}
              onChange={v => handleChange('start_lunch', v)}
              error={errors.start_lunch}
            />
          </div>
          <div className="grid gap-1 min-w-0">
            <TimeField
              label="Fin Almuerzo"
              value={form.end_lunch!}
              onChange={v => handleChange('end_lunch', v)}
              error={errors.end_lunch}
            />
          </div>
          <div className="grid gap-1 min-w-0">
            <TimeField
              label="Fin"
              value={form.end_day!}
              onChange={v => handleChange('end_day', v)}
              error={errors.end_day}
            />
          </div>
        </div>

        <MallaHoraria
          start_day={form.start_day}
          start_lunch={form.start_lunch}
          end_lunch={form.end_lunch}
          end_day={form.end_day}
        />

        <Button className="w-full" onClick={saveData}>{isEdit ? 'Guardar cambios' : 'Guardar'}</Button>
      </DialogContent>
    </Dialog>
  )
}