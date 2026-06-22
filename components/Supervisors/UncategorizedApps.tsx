'use client'
import { useEffect, useState } from 'react'
import InfinitySpinner from '@/components/InfinitySpinner'
import {
  CategorizationApp,
  createCategorizationApp,
  getUncategorizedApps,
} from '@/app/supervisors/categorization-actions'
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/_components/_ui/table'
import { MotionTableBody, MotionTableRow } from '@/components/motion/MotionTable'
import { staggerContainer, staggerItem } from '@/lib/motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/_components/_ui/dialog'
import { Loader2, Tag } from 'lucide-react'
import { toast } from 'sonner'

function CategorizarDialog({ appName, onSaved }: { appName: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<CategorizationApp['category']>('productive')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      await createCategorizationApp({ name: appName, category })
      toast.success('Aplicación categorizada')
      setOpen(false)
      onSaved()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (o) setCategory('productive') }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Tag className="h-3.5 w-3.5 mr-1.5" />
          Categorizar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Categorizar aplicación</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Aplicación</Label>
            <Input value={appName} readOnly className="font-mono" />
          </div>
          <div className="grid gap-1.5">
            <Label>Categoría</Label>
            <Select
              value={category}
              onValueChange={val => setCategory(val as CategorizationApp['category'])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="productive">Productiva</SelectItem>
                <SelectItem value="unproductive">Improductiva</SelectItem>
                <SelectItem value="ignore">Ignorar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Categorizar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function UncategorizedApps() {
  const today = new Date().toLocaleDateString('sv', { timeZone: 'America/Bogota' })
  const [date, setDate] = useState(today)
  const [apps, setApps] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async (d: string) => {
    setLoading(true)
    try {
      setApps(await getUncategorizedApps(d))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(date) }, [date])

  const filtered = apps.filter(a => a.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <Input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full sm:w-40"
        />
        <Input
          placeholder="Buscar aplicación…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-60"
        />
        {!loading && (
          <span className="text-sm text-muted-foreground">
            <span className="font-medium">{apps.length}</span> sin categorizar
          </span>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <InfinitySpinner size={52} />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-10">
          {apps.length === 0
            ? 'No hay aplicaciones sin categorizar para esta fecha.'
            : 'Sin resultados para la búsqueda.'}
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aplicación</TableHead>
                <TableHead className="w-36" />
              </TableRow>
            </TableHeader>
            <MotionTableBody variants={staggerContainer} initial="initial" animate="animate">
              {filtered.map(app => (
                <MotionTableRow key={app} variants={staggerItem}>
                  <TableCell className="font-medium font-mono text-sm">{app}</TableCell>
                  <TableCell>
                    <CategorizarDialog appName={app} onSaved={() => load(date)} />
                  </TableCell>
                </MotionTableRow>
              ))}
            </MotionTableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
