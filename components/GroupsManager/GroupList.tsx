'use client'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Card, CardContent, CardHeader } from '@/app/_components/_ui/card'
import { deleteGroup, updateUserGroup } from '@/app/app/groups/actions'
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
import { Trash2 } from 'lucide-react'

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

function DroppableGroup({ group, users, onDelete }: { group: Group; users: AppUser[], onDelete: (id: number) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: group.id! })

  return (
    <Card
      ref={setNodeRef}
      className={`w-75 transition-colors ${isOver ? 'border-blue-400 bg-blue-500/15' : ''}`}
    >
      <CardHeader className='flex justify-between'>
        <h2 className="text-lg font-bold">{group.name}</h2>
        <div className="flex gap-2 items-center justify-center">
          <Button size={'icon'} className='cursor-pointer' variant='ghost' onClick={() => onDelete(group.id!)}>
            <Trash2 className='text-destructive' />
          </Button>
          <GroupForm group={group} />
        </div>
      </CardHeader>
      <CardContent>
        <ul className='flex flex-col gap-2 min-h-8'>
          {users.filter(u => u.group_id === group.id).map(u => (
            <DraggableUser key={u.id} user={u} />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function DroppableUngrouped({ users }: { users: AppUser[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: UNGROUPED_ID })
  const ungrouped = users.filter(u => !u.group_id)

  return (
    <Card
      ref={setNodeRef}
      className={`w-75 transition-colors border-dashed ${isOver ? 'border-blue-400 bg-blue-500/15' : ''}`}
    >
      <CardHeader className='flex justify-between'>
        <h2 className="text-lg font-bold text-muted-foreground">Sin grupo</h2>
        <span className="text-sm text-muted-foreground">{ungrouped.length} personas</span>
      </CardHeader>
      <CardContent>
        <ul className='flex flex-col gap-2 min-h-8'>
          {ungrouped.map(u => (
            <DraggableUser key={u.id} user={u} />
          ))}
        </ul>
      </CardContent>
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
      <div className="flex gap-2 items-center flex-wrap">
        <DroppableUngrouped users={localUsers} />
        {groups.map(g => (
          <DroppableGroup onDelete={handleDeleteGroup} key={g.id} group={g} users={localUsers} />
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
