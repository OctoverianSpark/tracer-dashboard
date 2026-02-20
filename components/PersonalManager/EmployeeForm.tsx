'use client'
import { Button } from '@/app/_components/_ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/app/_components/_ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/app/_components/_ui/dialog'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/app/_components/_ui/select'
import { getDocumentTypes, savePersonal } from '@/app/personal/actions'
import { FormActions } from '@/types/Global'
import { DocType, Employee } from '@/types/Personal'
import { Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, {
  ChangeEventHandler,
  JSX,
  SubmitEventHandler,
  useEffect,
  useState
} from 'react'
import { toast } from 'sonner'

interface EmployeeBaseFormProps {
  employee?: Employee
  action: FormActions
  onUpdate?: (employee: Employee) => void
}

interface EmployeeSaveFormProps extends EmployeeBaseFormProps {
  action: FormActions.SAVE
  employee?: never
  onUpdate?: never
}
interface EmployeeUpdateFormProps extends EmployeeBaseFormProps {
  action: FormActions.UPDATE
  employee: Employee
  onUpdate: (employee: Employee) => void
}

type EmployeeFormProps = EmployeeUpdateFormProps | EmployeeSaveFormProps

export default function EmployeeForm ({
  employee,
  action,
  onUpdate
}: EmployeeFormProps): JSX.Element {
  const router = useRouter()
  const [values, setValues] = useState<Employee>(
    employee ?? {
      first_name: '',
      middle_name: '',
      last_name: '',
      document: '',
      job_title: ''
    }
  )

  const [open, setOpen] = useState<boolean>()

  const [DocTypes, setDocTypes] = useState<DocType[]>([])

  const onInputChange: ChangeEventHandler<HTMLInputElement> = e => {
    setValues(prev => {
      return {
        ...prev,
        [e.target.id]: e.target.value
      }
    })
  }

  const handleSubmit = () => {
    toast.success('Formulario enviado con exito')
    savePersonal(values)
    if (action === FormActions.UPDATE) {
      onUpdate(employee)
    } else {
      router.refresh()
    }

    setOpen(false)
  }
  useEffect(() => {
    const getTypes = async () => {
      const types = await getDocumentTypes()

      setDocTypes(types)
    }
    getTypes()
  }, [])
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {action === FormActions.SAVE ? (
        <DialogTrigger className='cursor-pointer'>
          <span>Registrar empleado</span>
        </DialogTrigger>
      ) : (
        <DialogTrigger className='cursor-pointer' asChild>
          <Button variant={'ghost'}>
            <Pencil />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registro de empleado</DialogTitle>
        </DialogHeader>
        <div className='grid gap-7'>
          <div className='flex justify-between items-center gap-4'>
            <div className='grid gap-3'>
              <Label htmlFor='first_name'>Primer Nombre</Label>
              <Input
                id='first_name'
                onChange={onInputChange}
                value={values.first_name}
              />
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='middle_name'>Segundo Nombre</Label>
              <Input
                id='middle_name'
                onChange={onInputChange}
                value={values.middle_name}
              />
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='last_name'>Apellido</Label>
              <Input
                id='last_name'
                onChange={onInputChange}
                value={values.last_name}
              />
            </div>
          </div>
          <div className='flex gap-2'>
            <div className='grid gap-3 flex-1 w-fit'>
              <Label htmlFor='doc_type'>Tipo de Documento</Label>
              <Select
                value={String(values.doc_type)}
                onValueChange={val => {
                  setValues(prev => {
                    return {
                      ...prev,
                      doc_type: Number(val)
                    }
                  })
                }}
              >
                <SelectTrigger className='min-w-40 cursor-pointer'>
                  <SelectValue placeholder='Tipo de Documento' />
                </SelectTrigger>
                <SelectContent className=''>
                  {DocTypes.map(doc => (
                    <SelectItem
                      key={crypto.randomUUID()}
                      className='w-full cursor-pointer'
                      value={String(doc.id)}
                    >
                      {doc.short_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-3 flex-2'>
              <Label htmlFor='document'>Documento</Label>
              <Input
                id='document'
                onChange={onInputChange}
                value={values.document}
              />
            </div>
          </div>
          <div className='grid gap-3'>
            <Label>Cargo</Label>
            <Input
              id='job_title'
              onChange={onInputChange}
              value={values.job_title}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} className='cursor-pointer'>
            {action === FormActions.SAVE ? 'Registrar' : 'Actualizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
