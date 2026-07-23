'use client'
import { Search, X } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/app/_components/_ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { Group } from '@/types/AppUser'

interface ListToolbarProps {
  search: string
  onSearchChange: (v: string) => void
  searchPlaceholder?: string
  // Si se omiten `groups`/`onGroupFilterChange`, no se renderiza el filtro de grupo.
  groups?: Group[]
  groupFilter?: number | null
  onGroupFilterChange?: (v: number | null) => void
  rightSlot?: React.ReactNode
}

export default function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  groups,
  groupFilter,
  onGroupFilterChange,
  rightSlot,
}: ListToolbarProps) {
  return (
    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4'>
      <div className='flex flex-col sm:flex-row sm:items-center gap-2 flex-1'>
        {groups && onGroupFilterChange && (
          <Select
            value={groupFilter != null ? String(groupFilter) : 'all'}
            onValueChange={v => onGroupFilterChange(v === 'all' ? null : Number(v))}
          >
            <SelectTrigger className='w-full sm:w-40 cursor-pointer'>
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
              placeholder={searchPlaceholder}
              value={search}
              onChange={e => onSearchChange(e.target.value)}
            />
            <InputGroupAddon>
              {search ? (
                <button onClick={() => onSearchChange('')} className='hover:opacity-70 cursor-pointer'>
                  <X className='h-4 w-4' />
                </button>
              ) : (
                <Search className='h-4 w-4' />
              )}
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>

      {rightSlot && (
        <div className='flex items-center gap-2 shrink-0'>
          {rightSlot}
        </div>
      )}
    </div>
  )
}
