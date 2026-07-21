'use client'
import { useState } from 'react'
import { revokeUserSession, revokeAllSessions } from '@/app/app/actions'
import { AppUser } from '@/types/AppUser'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/app/_components/_ui/alert-dialog'
import { Button } from '@/app/_components/_ui/button'
import { Input } from '@/app/_components/_ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { LogOut, Search, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

interface SessionsPanelProps {
  users: AppUser[]
}

export default function SessionsPanel({ users }: SessionsPanelProps) {
  const [search, setSearch] = useState('')
  const [pendingUserId, setPendingUserId] = useState<number | null>(null)
  const [pendingAll, setPendingAll] = useState(false)

  const visible = users.filter(u => u.full_name.toLowerCase().includes(search.toLowerCase()))

  const handleRevokeUser = async (user: AppUser) => {
    if (!user.id) return
    setPendingUserId(user.id)
    try {
      await revokeUserSession(user.id)
      toast.success(`Se cerró la sesión de ${user.full_name}`)
    } catch {
      toast.error('Ocurrió un error al cerrar la sesión')
    } finally {
      setPendingUserId(null)
    }
  }

  const handleRevokeAll = async () => {
    setPendingAll(true)
    try {
      await revokeAllSessions()
      toast.success('Se cerraron todas las sesiones')
    } catch {
      toast.error('Ocurrió un error al cerrar las sesiones')
    } finally {
      setPendingAll(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar usuario..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-7"
          />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="cursor-pointer" disabled={pendingAll}>
              <ShieldAlert className="h-4 w-4 mr-2" />
              Cerrar sesión de todos
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cerrar la sesión de todos los usuarios?</AlertDialogTitle>
              <AlertDialogDescription>
                Todos, incluido tu propio usuario, quedarán deslogueados en su próxima navegación.
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleRevokeAll}>Cerrar todas las sesiones</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                  Sin resultados.
                </TableCell>
              </TableRow>
            ) : visible.map(user => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer"
                        disabled={pendingUserId === user.id}
                      >
                        <LogOut className="h-3.5 w-3.5 mr-1.5" />
                        Cerrar sesión
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Cerrar la sesión de {user.full_name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Quedará deslogueado en su próxima navegación.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRevokeUser(user)}>Cerrar sesión</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
