'use client'
import { useState, useRef, useEffect } from 'react'
import { Popover } from 'radix-ui'
import { AppUser, Group } from '@/types/AppUser'
import { Input } from '@/app/_components/_ui/input'
import { cn } from '@/app/_components/_lib/utils'
import { ChevronDown, Check } from 'lucide-react'

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
  value,
  onValueChange,
  placeholder = 'Seleccionar usuario',
  triggerClassName,
  disabled,
  error,
}: UserSelectProps) {
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const inputRef              = useRef<HTMLInputElement>(null)

  const selected = users.find(u => String(u.id) === value)

  const visible = search.trim()
    ? users.filter(u => u.full_name.toLowerCase().includes(search.toLowerCase()))
    : users

  useEffect(() => {
    if (open) {
      setSearch('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  function pick(u: AppUser) {
    onValueChange(String(u.id))
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'border-input flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-colors outline-none',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
            error && 'border-destructive',
            triggerClassName
          )}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.full_name : placeholder}
          </span>
          <ChevronDown className='size-4 shrink-0 opacity-50' />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={4}
          style={{ minWidth: 'var(--radix-popover-trigger-width)', width: 'max-content', maxWidth: '320px' }}
          className={cn(
            'bg-popover text-popover-foreground z-50 rounded-md border shadow-md',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          )}
          onOpenAutoFocus={e => e.preventDefault()}
        >
          <div className='p-2 pb-1'>
            <Input
              ref={inputRef}
              placeholder='Buscar…'
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='h-8 text-sm'
            />
          </div>
          <div className='max-h-60 overflow-y-auto p-1'>
            {visible.length === 0 ? (
              <p className='py-3 text-center text-xs text-muted-foreground'>Sin resultados</p>
            ) : visible.map(u => (
              <button
                key={u.id}
                type='button'
                onClick={() => pick(u)}
                className='flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors'
              >
                <Check className={cn('size-4 shrink-0', String(u.id) === value ? 'opacity-100' : 'opacity-0')} />
                {u.full_name}
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
