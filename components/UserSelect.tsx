'use client'
import { useState } from 'react'
import { AppUser, Group } from '@/types/AppUser'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { Input } from '@/app/_components/_ui/input'
import { cn } from '@/app/_components/_lib/utils'

interface UserSelectProps {
  users: AppUser[]
  groups?: Group[]
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
  const [groupFilter, setGroupFilter] = useState<number | null>(null)

  const hasGroups = groups && groups.length > 0

  const visibleUsers = users.filter(u => {
    if (groupFilter !== null && u.group_id !== groupFilter) return false
    if (search.trim() && !u.full_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-1.5">
      {/* Chips de grupo — fuera del Select para no interferir con el scroll-lock de Radix */}
      {hasGroups && (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setGroupFilter(null)}
            className={cn(
              'rounded px-2 py-0.5 text-xs transition-colors',
              groupFilter === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            Todos
          </button>
          {groups.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroupFilter(groupFilter === g.id ? null : g.id!)}
              className={cn(
                'rounded px-2 py-0.5 text-xs transition-colors',
                groupFilter === g.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

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
