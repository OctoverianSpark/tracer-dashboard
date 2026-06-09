'use client'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Card, CardHeader } from '@/app/_components/_ui/card'
import { deleteGroup, updateUserGroup } from '@/app/app/groups/actions'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/_components/_ui/alert-dialog'
import { AppUser, Group } from '@/types/AppUser'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable
} from '@dnd-kit/core'
import React, { useState } from 'react'
import GroupForm from './GroupForm'
import { Search, Trash2 } from 'lucide-react'
import { Input } from '@/app/_components/_ui/input'

const UNGROUPED_ID = 0

interface GroupTableProps {
  groups: Group[]
  users: AppUser[]
}

function DraggableUser({ user }: { user: AppUser }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: user.id!,
    data: { user }
  })

  return (
    <Badge
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      variant='ghost'
      className={`bg-secondary cursor-move ${isDragging ? 'opacity-30' : ''}`}
    >
      {user.full_name}
    </Badge>
  )
}

const CARD_CLASS = 'w-64 shrink-0 flex flex-col transition-colors'
const CARD_BODY = 'flex flex-col gap-3 px-4 pb-4'
const USER_LIST = 'flex flex-col gap-1.5 min-h-24 max-h-60 overflow-y-auto pr-1'

function CardSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
      <Input
        placeholder="Buscar..."
        value={value}
        onChange={e => onChange(e.target.value)}
        className="pl-7 h-8 text-sm"
      />
    </div>
  )
}

function DroppableGroup({ group, users, allGroups, onDelete }: { group: Group; users: AppUser[]; allGroups: Group[]; onDelete: (id: number) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: group.id! })
  const [search, setSearch] = useState('')

  const visible = users.filter(u =>
    u.group_id === group.id &&
    u.full_name.toLowerCase().includes(search.toLowerCase())
  )
  const total = users.filter(u => u.group_id === group.id).length

  return (
    <Card ref={setNodeRef} className={`${CARD_CLASS} ${isOver ? 'border-blue-400 bg-blue-500/15' : ''}`}>
      <CardHeader className='flex flex-row items-center justify-between gap-2 px-4 py-3'>
        <div className='min-w-0'>
          <h2 className="text-sm font-semibold truncate">{group.name}</h2>
          <p className="text-xs text-muted-foreground">{total} personas</p>
        </div>
        <div className="flex gap-1 items-center shrink-0">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size='icon' className='size-7 cursor-pointer' variant='ghost'>
                <Trash2 className='size-3.5 text-destructive' />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar grupo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminará el grupo <strong>{group.name}</strong> permanentemente. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(group.id!)}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <GroupForm group={group} allGroups={allGroups} />
        </div>
      </CardHeader>
      <div className={CARD_BODY}>
        <CardSearch value={search} onChange={setSearch} />
        <ul className={USER_LIST}>
          {visible.map(u => <DraggableUser key={u.id} user={u} />)}
        </ul>
      </div>
    </Card>
  )
}

function DroppableUngrouped({ users }: { users: AppUser[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: UNGROUPED_ID })
  const [search, setSearch] = useState('')

  const total = users.filter(u => !u.group_id).length
  const visible = users.filter(u =>
    !u.group_id &&
    u.full_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Card ref={setNodeRef} className={`${CARD_CLASS} border-dashed ${isOver ? 'border-blue-400 bg-blue-500/15' : ''}`}>
      <CardHeader className='flex flex-row items-center justify-between gap-2 px-4 py-3'>
        <div className='min-w-0'>
          <h2 className="text-sm font-semibold truncate text-muted-foreground">Sin grupo</h2>
          <p className="text-xs text-muted-foreground">{total} personas</p>
        </div>
        <div className="size-7 shrink-0" />
      </CardHeader>
      <div className={CARD_BODY}>
        <CardSearch value={search} onChange={setSearch} />
        <ul className={USER_LIST}>
          {visible.map(u => <DraggableUser key={u.id} user={u} />)}
        </ul>
      </div>
    </Card>
  )
}

export default function GroupList({ groups, users }: GroupTableProps) {

  const [localUsers, setLocalUsers] = useState<AppUser[]>(users)
  const [activeUser, setActiveUser] = useState<AppUser | null>(null)

  const sensors = useSensors(useSensor(PointerSensor))

  const onDragStart = ({ active }: DragStartEvent) => {
    const user = localUsers.find(u => u.id === active.id) ?? null
    setActiveUser(user)
  }

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return

    const userId = active.id as number
    const targetGroupId = over.id === UNGROUPED_ID ? undefined : over.id as number

    const user = localUsers.find(u => u.id === userId)
    if (!user || user.group_id === targetGroupId) return

    setLocalUsers(prev =>
      prev.map(u => u.id === userId ? { ...u, group_id: targetGroupId } : u)
    )
  }

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveUser(null)
    if (!over) return
    const targetGroupId = over.id === UNGROUPED_ID ? null : over.id as number
    await updateUserGroup(active.id as number, targetGroupId)
  }

  const handleDeleteGroup = async (id: number) => {
    await deleteGroup(id)
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div className="flex gap-4 items-start flex-wrap">
        <DroppableUngrouped users={localUsers} />
        {groups.map(g => (
          <DroppableGroup onDelete={handleDeleteGroup} key={g.id} group={g} users={localUsers} allGroups={groups} />
        ))}
      </div>

      <DragOverlay>
        {activeUser && (
          <Badge variant='ghost' className='bg-secondary shadow-md cursor-move'>
            {activeUser.full_name}
          </Badge>
        )}
      </DragOverlay>
    </DndContext>
  )
}
