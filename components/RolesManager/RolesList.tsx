'use client'
import { PERMISSION_GROUPS } from '@/app/_components/_lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/_components/_ui/card'
import { Checkbox } from '@/app/_components/_ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { Role } from '@/types/AppUser'
import React from 'react'
import RoleForm from './RoleForm'

interface RolesListProps {
  roles: Role[]
}



export default function RolesList({ roles }: RolesListProps) {

const getPermissionLabel = (id: string): string =>
  PERMISSION_GROUPS
    .flatMap(g => g.permissions)
    .find(p => p.id === id)?.label ?? id
  return (
    <div className='flex flex-wrap gap-4'>
      {roles.map(role => {
        const permissions: [string, boolean][] = role.access_level
          ? Object.entries(JSON.parse(role.access_level))
          : []

        return (
          <Card key={role.id} className='w-75'>
            <CardHeader>
              <CardTitle className='flex gap-4 items-center justify-between'>

                <h3 className='font-bold'>{role.name}</h3>
                <RoleForm role={role} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permiso</TableHead>
                    <TableHead>Acceso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell>{getPermissionLabel(key)}</TableCell>
                      <TableCell><Checkbox checked={value} disabled={value} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}