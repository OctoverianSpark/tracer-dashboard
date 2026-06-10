'use client'
import { useEffect, useState } from 'react'
import InfinitySpinner from '@/components/InfinitySpinner'
import {
  CategorizationApp,
  getCategorizationApps,
  createCategorizationApp,
  updateCategorizationApp,
  deleteCategorizationApp,
} from '@/app/supervisors/categorization-actions'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/_components/_ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/_components/_ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/_components/_ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/_components/_ui/alert-dialog'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const EMPTY: CategorizationApp = { name: '', category: 'productive' }

const CategoryBadge = ({ category }: { category: CategorizationApp['category'] }) => {
  if (category === 'productive')   return <Badge className="bg-green-600 text-white">Productiva</Badge>
  if (category === 'unproductive') return <Badge variant="destructive">Improductiva</Badge>
  return <Badge variant="secondary">Ignorar</Badge>
}

function AppForm({
  initial,
  onSaved,
}: {
  initial?: CategorizationApp
  onSaved: () => void
}) {
  const [values, setValues] = useState<CategorizationApp>(initial ?? EMPTY)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!values.name.trim()) {
      toast.error('El nombre de la aplicación es requerido')
      return
    }
    setLoading(true)
    try {
      if (initial?.id) {
        await updateCategorizationApp({ ...values, id: initial.id })
      } else {
        await createCategorizationApp({ name: values.name, category: values.category })
      }
      toast.success(initial?.id ? 'Aplicación actualizada' : 'Aplicación registrada')
      setOpen(false)
      onSaved()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (o) setValues(initial ?? EMPTY) }}>
      <DialogTrigger asChild>
        {initial?.id ? (
          <Button size="icon-sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nueva aplicación</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial?.id ? 'Editar aplicación' : 'Registrar aplicación'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="app-name">Nombre de la aplicación</Label>
            <Input
              id="app-name"
              placeholder="ej. chrome.exe"
              value={values.name}
              onChange={e => setValues(v => ({ ...v, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Categoría</Label>
            <Select
              value={values.category}
              onValueChange={val => setValues(v => ({ ...v, category: val as CategorizationApp['category'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="productive">Productiva</SelectItem>
                <SelectItem value="unproductive">Improductiva</SelectItem>
                <SelectItem value="ignore">Ignorar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {initial?.id ? 'Actualizar' : 'Registrar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DeleteButton({ id, onDeleted }: { id: number; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteCategorizationApp(id)
      toast.success('Aplicación eliminada')
      onDeleted()
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar aplicación?</AlertDialogTitle>
          <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default function AppCategorization() {
  const [apps, setApps] = useState<CategorizationApp[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      setApps(await getCategorizationApps())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const productive   = apps.filter(a => a.category === 'productive').length
  const unproductive = apps.filter(a => a.category === 'unproductive').length
  const ignored      = apps.filter(a => a.category === 'ignore').length

  const filtered = apps.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <Input
            placeholder="Buscar aplicación…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-60"
          />
          <span className="text-sm text-muted-foreground">
            <span className="text-green-600 font-medium">{productive} productivas</span>
            {' · '}
            <span className="text-red-500 font-medium">{unproductive} improductivas</span>
            {ignored > 0 && <>{' · '}<span className="font-medium">{ignored} ignoradas</span></>}
          </span>
        </div>
        <AppForm onSaved={load} />
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <InfinitySpinner size={52} />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-10">
          {apps.length === 0 ? 'No hay aplicaciones registradas.' : 'Sin resultados para la búsqueda.'}
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aplicación</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(app => (
              <TableRow key={app.id}>
                <TableCell className="font-medium font-mono text-sm">{app.name}</TableCell>
                <TableCell><CategoryBadge category={app.category} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <AppForm initial={app} onSaved={load} />
                    <DeleteButton id={app.id!} onDeleted={load} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}
    </div>
  )
}
