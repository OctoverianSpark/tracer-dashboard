'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
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
import ListToolbar from '@/components/shared/ListToolbar'
import Paginator from '@/components/ComputerManager/Paginator'
import { useResetPageOnChange } from '@/components/shared/usePageReset'
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
import { useStaggerChildren, STAGGER_ITEM_INITIAL_STYLE } from '@/lib/animation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/_components/_ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/_components/_ui/alert-dialog'
import { Loader2, Pencil, Plus, Trash2, FileDown } from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'

function exportXLSX(apps: CategorizationApp[]) {
  const catLabel = (c: CategorizationApp['category']) =>
    c === 'productive' ? 'Productiva' : c === 'unproductive' ? 'Improductiva' : 'Ignorar'
  const rows = apps.map(a => ({
    'Aplicación': a.name,
    'Categoría':  catLabel(a.category),
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: 1 } }) }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Aplicaciones')
  XLSX.writeFile(wb, `aplicaciones_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// Sin categoría precargada — si quien registra la app no elige explícitamente, debe fallar el
// guardado en vez de quedar "Productiva" por defecto en silencio (ver handleSave).
type DraftApp = Omit<CategorizationApp, 'category'> & { category?: CategorizationApp['category'] }
const EMPTY: DraftApp = { name: '', category: undefined }

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
  const [values, setValues] = useState<DraftApp>(initial ?? EMPTY)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!values.name.trim()) {
      toast.error('El nombre de la aplicación es requerido')
      return
    }
    if (!values.category) {
      toast.error('Selecciona una categoría')
      return
    }
    setLoading(true)
    try {
      if (initial?.id) {
        await updateCategorizationApp({ ...values, category: values.category, id: initial.id })
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
              value={values.category ?? ''}
              onValueChange={val => setValues(v => ({ ...v, category: val as CategorizationApp['category'] }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
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

const PAGE_SIZE = 15

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

type CategoryFilter = CategorizationApp['category'] | 'all'

export default function AppCategorization() {
  const [apps, setApps] = useState<CategorizationApp[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [page, setPage] = useState(1)

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

  const filtered = useMemo(
    () => apps
      .filter(a => categoryFilter === 'all' || a.category === categoryFilter)
      .filter(a => a.name.toLowerCase().includes(search.toLowerCase())),
    [apps, search, categoryFilter]
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )
  useResetPageOnChange(search, setPage)
  useResetPageOnChange(categoryFilter, setPage)

  const bodyRef = useRef<HTMLTableSectionElement>(null)
  useStaggerChildren(bodyRef, { deps: [paged.map(a => a.id).join(',')] })

  return (
    <div className="space-y-4">
      <span className="text-sm text-muted-foreground">
        <span className="text-green-600 font-medium">{productive} productivas</span>
        {' · '}
        <span className="text-red-500 font-medium">{unproductive} improductivas</span>
        {ignored > 0 && <>{' · '}<span className="font-medium">{ignored} ignoradas</span></>}
      </span>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar aplicación…"
        leftExtra={
          <Select value={categoryFilter} onValueChange={v => setCategoryFilter(v as CategoryFilter)}>
            <SelectTrigger className="w-full sm:w-44 cursor-pointer">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              <SelectItem value="productive">Productivas</SelectItem>
              <SelectItem value="unproductive">Improductivas</SelectItem>
              <SelectItem value="ignore">Ignoradas</SelectItem>
            </SelectContent>
          </Select>
        }
        rightSlot={
          <>
            {filtered.length > 0 && (
              <button
                onClick={() => exportXLSX(filtered)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border bg-muted/40 hover:bg-muted transition-colors cursor-pointer"
              >
                <FileDown className="size-3.5" />
                Exportar
              </button>
            )}
            <AppForm onSaved={load} />
          </>
        }
      />

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
          <TableBody ref={bodyRef}>
            {paged.map(app => (
              <TableRow key={app.id} data-stagger-item style={STAGGER_ITEM_INITIAL_STYLE}>
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
      {!loading && filtered.length > 0 && (
        <Paginator page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      )}
    </div>
  )
}
