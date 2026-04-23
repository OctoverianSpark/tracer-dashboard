'use client'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Card, CardContent, CardHeader } from '@/app/_components/_ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/app/_components/_ui/collapsible'
import { updateUserGroup } from '@/app/app/groups/actions'
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
      className={`bg-gray-100 cursor-move ${isDragging ? 'opacity-30' : ''}`}
    >
      {user.full_name}
    </Badge>
  )
}

function DroppableGroup({ group, users }: { group: Group; users: AppUser[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: group.id! })

  return (
    <Card
      ref={setNodeRef}
      className={`w-75 transition-colors ${isOver ? 'border-blue-400 bg-blue-50' : ''}`}
    >
      
          <CardHeader className='flex justify-between'>

              <h2 className="text-lg font-bold">{group.name}</h2>
            <GroupForm group={group} />





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

    const userId  = active.id as number
    const groupId = over.id   as number

    const user = localUsers.find(u => u.id === userId)
    if (!user || user.group_id === groupId) return

    setLocalUsers(prev =>
      prev.map(u => u.id === userId ? { ...u, group_id: groupId } : u)
    )
  }

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveUser(null)
    if (!over) return
    await updateUserGroup(active.id as number, over.id as number)
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div className="flex gap-2 items-center">
        {groups.map(g => (
          <DroppableGroup key={g.id} group={g} users={localUsers} />
        ))}
      </div>

      <DragOverlay>
        {activeUser && (
          <Badge variant='ghost' className='bg-gray-100 shadow-md cursor-move'>
            {activeUser.full_name}
          </Badge>
        )}
      </DragOverlay>
    </DndContext>
  )
}