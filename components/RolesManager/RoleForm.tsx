'use client'

import { PERMISSION_GROUPS } from "@/app/_components/_lib/utils"
import { Button } from "@/app/_components/_ui/button"
import { Checkbox } from "@/app/_components/_ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/_components/_ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/app/_components/_ui/dialog"
import { Input } from "@/app/_components/_ui/input"
import { Label } from "@/app/_components/_ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/_components/_ui/tooltip"
import { saveRole } from "@/app/app/roles/actions"
import { normalizeAccessLevel } from "@/lib/accessLevel"
import { Role } from "@/types/AppUser"
import { Pencil, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface RoleFormProps {
  role?: Role
}

const EMPTY_ROLE: Role = {
  name: '',
  access_level: {},
}



const buildDefaultAccessLevel = () =>
  PERMISSION_GROUPS
    .flatMap(g => g.permissions)
    .reduce<Record<string, boolean>>((acc, { id, default: def }) => ({ ...acc, [id]: def }), {})

export default function RoleForm({ role = EMPTY_ROLE }: RoleFormProps) {
  
  const [values, setValues] = useState<Role>({
    ...(role),
    access_level: role?.access_level ? normalizeAccessLevel(role.access_level) : buildDefaultAccessLevel()
  })
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof Role, string>>>({})

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof Role, string>> = {}
    if (!values.name) newErrors.name = 'El nombre del rol es requerido'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues(prev => ({ ...prev, [e.target.id]: e.target.value }))
    setErrors(prev => ({ ...prev, [e.target.id]: undefined }))
  }

  const getPermission = (key: string): boolean => {
    return values.access_level?.[key] ?? false
  }

  const onCheckboxChange = (key: string, checked: boolean) => {
    setValues(prev => ({
      ...prev,
      access_level: { ...prev.access_level, [key]: checked }
    }))
  }

  const onGroupChange = (permissions: { id: string }[], checked: boolean) => {
    const updated = permissions.reduce((acc, { id }) => ({ ...acc, [id]: checked }), values.access_level ?? {})
    setValues(prev => ({ ...prev, access_level: updated }))
  }

  const isGroupAllChecked = (permissions: { id: string }[]) =>
    permissions.every(({ id }) => getPermission(id))

  const isGroupSomeChecked = (permissions: { id: string }[]) =>
    permissions.some(({ id }) => getPermission(id))

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('Corrige los errores antes de enviar')
      return
    }
    try {
      setLoading(true)
      await saveRole(values)
      toast.success('Rol guardado!')
      setOpen(false)
    } catch {
      toast.error('Ocurrió un error al guardar el rol')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
            
            <Button className="cursor-pointer" size={'icon-sm'} variant={role?.id ? 'ghost' : 'default'}>{role?.id ? (<Pencil/>) : (<Plus/>)}</Button>
          </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {role?.id ? 'Editar rol' : 'Registrar nuevo rol'}
          </TooltipContent>
        </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {role?.id ? 'Editar rol' : 'Registrar nuevo rol'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <Label htmlFor="name">Nombre del Rol</Label>
          <Input
            id="name"
            value={values.name}
            onChange={onInputChange}
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && <span className="text-xs text-destructive">{errors.name}</span>}
        </div>

        <div className="grid gap-3">
          <Label>Permisos</Label>
          <hr />
          <div className="grid gap-3">
            {PERMISSION_GROUPS.map(({ id, label, permissions }) => {
              const allChecked  = isGroupAllChecked(permissions)
              const someChecked = isGroupSomeChecked(permissions)
              return (
                <Collapsible key={id}>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allChecked || (someChecked ? 'indeterminate' : false)}
                      onCheckedChange={checked => onGroupChange(permissions, !!checked)}
                    />
                    <CollapsibleTrigger className="font-bold cursor-pointer">
                      {label}
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <ul className="p-3 ml-2 grid gap-2">
                      {permissions.map(({ id: permId, label: permLabel }) => (
                        <li key={permId} className="flex items-center gap-2">
                          <Checkbox
                            id={permId}
                            checked={getPermission(permId)}
                            onCheckedChange={checked => onCheckboxChange(permId, !!checked)}
                          />
                          <Label htmlFor={permId}>{permLabel}</Label>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Guardando...' : role?.id ? 'Actualizar' : 'Registrar'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}