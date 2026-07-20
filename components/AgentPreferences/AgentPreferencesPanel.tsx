'use client'
import { Card, CardHeader } from '@/app/_components/_ui/card'
import { Label } from '@/app/_components/_ui/label'
import { Switch } from '@/app/_components/_ui/switch'
import { updateGroupPreferences } from '@/app/app/groups/actions'
import { Group } from '@/types/AppUser'
import React, { useState } from 'react'
import { toast } from 'sonner'

interface AgentPreferencesPanelProps {
  groups: Group[]
}

export default function AgentPreferencesPanel({ groups }: AgentPreferencesPanelProps) {
  const [localGroups, setLocalGroups] = useState<Group[]>(groups)

  const handleToggleAutoShutdown = async (group: Group, checked: boolean) => {
    if (!group.id) return

    const previous = localGroups
    setLocalGroups(prev =>
      prev.map(g =>
        g.id === group.id
          ? { ...g, agent_preferences: { ...g.agent_preferences, auto_shutdown_enabled: checked } }
          : g
      )
    )

    try {
      await updateGroupPreferences(group.id, { ...group.agent_preferences, auto_shutdown_enabled: checked })
      toast.success(`Preferencias de "${group.name}" actualizadas`)
    } catch {
      setLocalGroups(previous)
      toast.error('Ocurrió un error al actualizar las preferencias')
    }
  }

  if (localGroups.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay grupos registrados todavía.</p>
  }

  return (
    <div className="space-y-3">
      {localGroups.map(group => (
        <Card key={group.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate">{group.name}</h3>
            </div>
            <div className="flex items-start gap-3 shrink-0">
              <div className="grid gap-0.5 text-right">
                <Label htmlFor={`auto-shutdown-${group.id}`} className="cursor-pointer">
                  Apagado automático al finalizar la jornada
                </Label>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Las máquinas de este grupo podrán apagarse solas cuando termine el horario asignado.
                </p>
              </div>
              <Switch
                id={`auto-shutdown-${group.id}`}
                checked={group.agent_preferences?.auto_shutdown_enabled ?? false}
                onCheckedChange={checked => handleToggleAutoShutdown(group, checked)}
              />
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
