'use client'
import { useEffect, useState } from 'react'
import { Checkbox } from '@/app/_components/_ui/checkbox'
import { Button } from '@/app/_components/_ui/button'
import { Input } from '@/app/_components/_ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/app/_components/_ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/app/_components/_ui/select'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@/app/_components/_ui/input-group'
import { Search, X } from 'lucide-react'
import { DocType, Employee } from '@/types/Personal'
import { getDocumentTypes } from '@/app/personal/actions'
import EmployeeForm from './EmployeeForm'

interface EmployeeListProps {
  employees: Employee[]
  onUpdate: (employee: Employee) => void
  onDelete: (selected: number[]) => void
}

type FilterColumn =
  | 'first_name'
  | 'middle_name'
  | 'last_name'
  | 'document'
  | 'job_title'
  | 'all'

export default function EmployeeList ({
  employees,
  onUpdate,
  onDelete
}: EmployeeListProps) {
  const [selected, setSelected] = useState<number[]>([])
  const [filterColumn, setFilterColumn] = useState<FilterColumn>('all')
  const [filterValue, setFilterValue] = useState('')
  const [docTypes, setTypes] = useState<DocType[]>([])

  useEffect(() => {
    const getTypes = async () => {
      const types = await getDocumentTypes()

      setTypes(types)
    }

    getTypes()
  }, [])

  const filteredEmployees = employees.filter(emp => {
    if (!filterValue) return true

    const searchLower = filterValue.toLowerCase()

    switch (filterColumn) {
      case 'first_name':
        return emp.first_name.toLowerCase().includes(searchLower)
      case 'middle_name':
        return (emp.middle_name || '').toLowerCase().includes(searchLower)
      case 'last_name':
        return emp.last_name.toLowerCase().includes(searchLower)
      case 'document':
        return (emp.document || '').toLowerCase().includes(searchLower)
      case 'job_title':
        return (emp.job_title || '').toLowerCase().includes(searchLower)
      case 'all':
      default:
        return (
          emp.first_name.toLowerCase().includes(searchLower) ||
          (emp.middle_name || '').toLowerCase().includes(searchLower) ||
          emp.last_name.toLowerCase().includes(searchLower) ||
          (emp.document || '').toLowerCase().includes(searchLower) ||
          (emp.job_title || '').toLowerCase().includes(searchLower)
        )
    }
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(filteredEmployees.map(emp => emp.id!))
    } else {
      setSelected([])
    }
  }

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelected([...selected, id])
    } else {
      setSelected(selected.filter(selectedId => selectedId !== id))
    }
  }

  const getDocType = (doc_id: number): DocType | undefined => {
    console.log(doc_id)

    const type = docTypes.find(type => type.id === doc_id)

    return type
  }

  const clearFilter = () => {
    setFilterValue('')
    setFilterColumn('all')
  }

  const isAllSelected =
    filteredEmployees.length > 0 && selected.length === filteredEmployees.length

  return (
    <div className='space-y-4 max-w-7xl'>
      {/* Barra de búsqueda y acciones */}
      <div className='flex items-center justify-between gap-4'>
        <div className='flex items-center gap-2 flex-1 max-w-2xl'>
          <Select
            value={filterColumn}
            onValueChange={value => setFilterColumn(value as FilterColumn)}
          >
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='Seleccionar columna' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Todas las columnas</SelectItem>
              <SelectItem value='first_name'>Nombre</SelectItem>
              <SelectItem value='middle_name'>Segundo Nombre</SelectItem>
              <SelectItem value='last_name'>Apellido</SelectItem>
              <SelectItem value='document'>Documento</SelectItem>
              <SelectItem value='job_title'>Cargo</SelectItem>
            </SelectContent>
          </Select>

          <div className='flex-1 relative'>
            <InputGroup>
              <InputGroupInput
                placeholder='Buscar...'
                value={filterValue}
                onChange={e => setFilterValue(e.target.value)}
              />
              <InputGroupAddon>
                {filterValue ? (
                  <button onClick={clearFilter} className='hover:opacity-70'>
                    <X className='h-4 w-4' />
                  </button>
                ) : (
                  <Search className='h-4 w-4' />
                )}
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>

        {selected.length > 0 && (
          <div className='flex items-center gap-2'>
            <span className='text-sm text-muted-foreground'>
              {selected.length} seleccionado(s)
            </span>
            <Button
              variant='destructive'
              size='sm'
              onClick={() => onDelete(selected)}
            >
              Eliminar
            </Button>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-12'>
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label='Seleccionar todos'
                />
              </TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Segundo Nombre</TableHead>
              <TableHead>Apellido</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Cargo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className='text-center h-24'>
                  No se encontraron empleados
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map(employee => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(employee.id!)}
                      onCheckedChange={checked =>
                        handleSelectOne(employee.id!, checked as boolean)
                      }
                      aria-label={`Seleccionar ${employee.first_name}`}
                    />
                  </TableCell>
                  <TableCell className='font-medium'>
                    {employee.first_name}
                  </TableCell>
                  <TableCell>{employee.middle_name || '-'}</TableCell>
                  <TableCell>{employee.last_name}</TableCell>
                  <TableCell>
                    {getDocType(Number(employee.doc_type))?.short_name}{' '}
                    {employee.document || '-'}
                  </TableCell>
                  <TableCell>{employee.job_title || '-'}</TableCell>
                  <TableCell>
                    <EmployeeForm
                      action={1}
                      employee={employee}
                      onUpdate={onUpdate}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Info de resultados */}
      <div className='text-sm text-muted-foreground'>
        Mostrando {filteredEmployees.length} de {employees.length} empleado(s)
      </div>
    </div>
  )
}
