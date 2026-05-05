'use client'
import { useState } from 'react'
import { AppUser, Group } from '@/types/AppUser'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { Input } from '@/app/_components/_ui/input'
import { cn } from '@/app/_components/_lib/utils'

interface UserSelectProps {
  users: AppUser[]
  groups?: Group[]  // reservado para compatibilidad, no se usa internamente
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  triggerClassName?: string
  disabled?: boolean
  error?: boolean
}

export function UserSelect({
  users,
  groups,
  value,
  onValueChange,
  placeholder = 'Seleccionar usuario',
  triggerClassName,
  disabled,
  error,
}: UserSelectProps) {
  const [search, setSearch] = useState('')

  const visibleUsers = users.filter(u => {
    if (search.trim() && !u.full_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-1.5">

      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        onOpenChange={open => { if (open) setSearch('') }}
      >
        <SelectTrigger className={cn(error && 'border-destructive', triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <div className="px-2 pt-1.5 pb-1">
            <Input
              placeholder="Buscar…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              className="h-8 text-sm"
            />
          </div>
          {visibleUsers.length === 0 && (
            <p className="py-3 text-center text-xs text-muted-foreground">Sin resultados</p>
          )}
          {visibleUsers.map(u => (
            <SelectItem key={u.id} value={`${u.id}`}>
              {u.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
