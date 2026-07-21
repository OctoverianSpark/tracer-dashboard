'use client'
import { motion } from 'framer-motion'
import { PERMISSION_GROUPS } from '@/app/_components/_lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/_components/_ui/card'
import { Checkbox } from '@/app/_components/_ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { Role } from '@/types/AppUser'
import RoleForm from './RoleForm'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { normalizeAccessLevel } from '@/lib/accessLevel'

interface RolesListProps {
  roles: Role[]
}

const permissionLabel = (id: string): string =>
  PERMISSION_GROUPS.flatMap(g => g.permissions).find(p => p.id === id)?.label ?? id

export default function RolesList({ roles }: RolesListProps) {
  return (
    <motion.div
      className="flex flex-wrap gap-4"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {roles.map(role => {
        const permissions: [string, boolean][] = Object.entries(normalizeAccessLevel(role.access_level))

        return (
          <motion.div key={role.id} variants={staggerItem}>
            <Card className="w-80">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-4">
                  <span>{role.name}</span>
                  <RoleForm role={role} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permiso</TableHead>
                      <TableHead className="w-16 text-center">Acceso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell className="text-sm">{permissionLabel(key)}</TableCell>
                        <TableCell className="text-center">
                          <Checkbox checked={value} disabled />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
