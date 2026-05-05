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
import { Search, Trash2, X } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/_components/_ui/alert-dialog'
import { AppUser, Group, Role } from '@/types/AppUser'
import { saveappuser } from '@/app/app/actions'
import AppUserForm from './UserForm'
import { getGroups } from '@/app/app/groups/actions'
import { getRoles } from '@/app/app/roles/actions'

interface AppUserListProps {
  appusers: AppUser[]
  onDelete: (selected: number[]) => void
}

type FilterColumn = 'full_name' | 'all'



export default function AppUserList ({
  appusers,
  onDelete
}: AppUserListProps) {
  const [selected, setSelected]         = useState<number[]>([])
  const [filterColumn, setFilterColumn] = useState<FilterColumn>('all')
  const [filterValue, setFilterValue]   = useState('')
  const [groupFilter, setGroupFilter]   = useState<number | null>(null)
  const [groups, setGroups]             = useState<Group[]>([])
  const [roles, setRoles]               = useState<Role[]>([])
  const handleUpdate = async (appuser: AppUser) => {
    await saveappuser(appuser)
  }

  const filteredAppUsers = appusers.filter(emp => {
    if (groupFilter !== null && emp.group_id !== groupFilter) return false

    if (!filterValue) return true
    const searchLower = filterValue.toLowerCase()
    switch (filterColumn) {
      case 'full_name': return emp.full_name.toLowerCase().includes(searchLower)
      default:          return emp.full_name.toLowerCase().includes(searchLower)
    }
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(filteredAppUsers.map(emp => emp.id!))
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

  const clearFilter = () => {
    setFilterValue('')
    setFilterColumn('all')
    setGroupFilter(null)
  }

  useEffect(()=>{
    const getData = async () => {
      getGroups().then(setGroups)
      getRoles().then(setRoles)
    }
    getData()
  },[])

  const isAllSelected =
    filteredAppUsers.length > 0 && selected.length === filteredAppUsers.length

  return (
    <div className='space-y-4 max-w-7xl'>

      <div className='flex items-center justify-between gap-4'>
        <div className='flex items-center gap-2 flex-1 max-w-2xl'>
          <Select
            value={filterColumn}
            onValueChange={value => setFilterColumn(value as FilterColumn)}
          >
            <SelectTrigger className='w-45'>
              <SelectValue placeholder='Seleccionar columna' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Todas las columnas</SelectItem>
              <SelectItem value='full_name'>Nombre</SelectItem>
            </SelectContent>
          </Select>

          {groups.length > 0 && (
            <Select
              value={groupFilter !== null ? String(groupFilter) : 'all'}
              onValueChange={val => setGroupFilter(val === 'all' ? null : Number(val))}
            >
              <SelectTrigger className='w-40 cursor-pointer'>
                <SelectValue placeholder='Grupo' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Todos los grupos</SelectItem>
                {groups.map(g => (
                  <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant='destructive' size='sm'>Eliminar</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar usuarios?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminarán <strong>{selected.length} usuario(s)</strong> seleccionado(s). Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(selected)}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

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
              <TableHead>Nombre completo</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAppUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className='text-center h-24'>
                  No se encontraron empleados
                </TableCell>
              </TableRow>
            ) : (
              filteredAppUsers.map(appuser => (
                <TableRow key={appuser.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(appuser.id!)}
                      onCheckedChange={checked =>
                        handleSelectOne(appuser.id!, checked as boolean)
                      }
                      aria-label={`Seleccionar ${appuser.full_name}`}
                    />
                  </TableCell>
                  <TableCell className='font-medium'>
                    {appuser.full_name}
                  </TableCell>
                  <TableCell className='font-medium'>
                    {groups.find(g => g.id === appuser.group_id)?.name || 'Sin grupo'}
                  </TableCell>
                  <TableCell className='font-medium'>
                    {roles.find(r => r.id === appuser.role_id)?.name || 'Sin rol'}
                  </TableCell>
                  <TableCell>
                    <AppUserForm
                      action={1}
                      appUser={appuser}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className='text-sm text-muted-foreground'>
        Mostrando {filteredAppUsers.length} de {appusers.length} empleado(s)
      </div>
    </div>
  )
}
