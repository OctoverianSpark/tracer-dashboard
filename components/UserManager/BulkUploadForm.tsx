// components/UserManager/BulkUploadForm.tsx
'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/app/_components/_ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { Label } from '@/app/_components/_ui/label'
import { saveappuser, getappuser } from '@/app/app/actions'
import { getGroups } from '@/app/app/groups/actions'
import { getRoles } from '@/app/app/roles/actions'
import { AppUser, Group, Role } from '@/types/AppUser'
import { Upload, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

type RowResult = { row: number; name: string; status: 'ok' | 'error'; action?: 'created' | 'updated'; error?: string }
type ColumnMap = Record<string, keyof AppUser | 'ignore'>
type Step      = 'upload' | 'map' | 'results'

const APP_FIELDS: { key: keyof AppUser; label: string; required: boolean }[] = [
  { key: 'full_name', label: 'Nombre completo', required: true  },
  { key: 'email',     label: 'Correo',          required: false },
]

const autoMap = (headers: string[]): ColumnMap => {
  const hints: Partial<Record<keyof AppUser, string[]>> = {
    full_name: ['nombre', 'name', 'full_name', 'nombre completo'],
    email:     ['email', 'correo', 'mail', 'e-mail'],
  }
  return Object.fromEntries(headers.map(h => {
    const lower = h.toLowerCase()
    const match = Object.entries(hints).find(([, keywords]) =>
      keywords!.some(k => lower.includes(k))
    )
    return [h, match ? match[0] as keyof AppUser : 'ignore']
  }))
}

const parseCSV = async (file: File) => {
  const text = await file.text()
  const [header, ...lines] = text.trim().split('\n')
  const headers = header.split(',').map(h => h.trim())
  const rows = lines.map(line => {
    const values = line.split(',').map(v => v.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
  return { headers, rows }
}

const parseXLSX = async (file: File) => {
  const XLSX   = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb     = XLSX.read(buffer)
  const ws     = wb.Sheets[wb.SheetNames[0]]
  const rows   = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, string>[]
  return { headers: rows.length ? Object.keys(rows[0]) : [], rows }
}

export default function BulkUploadForm() {
  const [open, setOpen]           = useState(false)
  const [step, setStep]           = useState<Step>('upload')
  const [loading, setLoading]     = useState(false)
  const [headers, setHeaders]     = useState<string[]>([])
  const [rows, setRows]           = useState<Record<string, string>[]>([])
  const [columnMap, setColumnMap] = useState<ColumnMap>({})
  const [results, setResults]     = useState<RowResult[]>([])
  const [groups, setGroups]       = useState<Group[]>([])
  const [roles, setRoles]         = useState<Role[]>([])
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null)
  const [selectedRole, setSelectedRole]   = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    getGroups().then(setGroups)
    getRoles().then(setRoles)
  }, [open])

  const reset = () => {
    setStep('upload')
    setHeaders([])
    setRows([])
    setColumnMap({})
    setResults([])
    setSelectedGroup(null)
    setSelectedRole(null)
  }

  const handleFile = async (file: File) => {
    setLoading(true)
    try {
      const parsed = file.name.endsWith('.csv')
        ? await parseCSV(file)
        : await parseXLSX(file)

      if (!parsed.rows.length) { toast.error('El archivo está vacío'); return }

      setHeaders(parsed.headers)
      setRows(parsed.rows)
      setColumnMap(autoMap(parsed.headers))
      setStep('map')
    } catch {
      toast.error('Error al leer el archivo')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    const mapped  = Object.values(columnMap).filter(v => v !== 'ignore')
    const missing = (['full_name'] as (keyof AppUser)[]).filter(f => !mapped.includes(f))

    if (missing.length) {
      toast.error('El campo Nombre completo es requerido')
      return
    }

    setLoading(true)
    const rowResults: RowResult[] = []

    // Cargar usuarios existentes para detectar duplicados por email
    const existing = await getappuser().catch(() => [] as AppUser[])
    const byEmail = new Map(
      existing.filter(u => u.email?.trim()).map(u => [u.email!.trim().toLowerCase(), u])
    )

    for (let i = 0; i < rows.length; i++) {
      const row  = rows[i]
      const user: Partial<AppUser> = {}

      Object.entries(columnMap).forEach(([col, field]) => {
        if (field !== 'ignore') (user as any)[field] = row[col]
      })

      if (selectedGroup) user.group_id = selectedGroup
      if (selectedRole)  user.role_id  = selectedRole

      // Upsert por email: si ya existe, asignar su id para que haga PUT
      const emailKey = user.email?.trim().toLowerCase()
      const match    = emailKey ? byEmail.get(emailKey) : undefined
      if (match?.id) user.id = match.id

      try {
        await saveappuser(user as AppUser)
        rowResults.push({ row: i + 2, name: user.full_name ?? `Fila ${i + 2}`, status: 'ok', action: match ? 'updated' : 'created' })
      } catch (e) {
        rowResults.push({ row: i + 2, name: user.full_name ?? `Fila ${i + 2}`, status: 'error', error: (e as Error).message })
      }
    }

    setResults(rowResults)
    setStep('results')
    setLoading(false)

    const ok      = rowResults.filter(r => r.status === 'ok').length
    const updated = rowResults.filter(r => r.action === 'updated').length
    const created = rowResults.filter(r => r.action === 'created').length
    const error   = rowResults.filter(r => r.status === 'error').length
    toast.success(`${created} creados, ${updated} actualizados${error ? `, ${error} con errores` : ''}`)
  }

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>

            <Button variant='outline' size='icon-sm' className='cursor-pointer'>
              <Upload className='size-4' />
            </Button>
          </DialogTrigger>

          </TooltipTrigger>
          <TooltipContent>Carga masiva de usuarios</TooltipContent>
        </Tooltip>

      <DialogContent className='max-w-lg max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Carga masiva de usuarios</DialogTitle>
        </DialogHeader>

        {/* STEP 1 - Upload */}
        {step === 'upload' && (
          <label className='flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-md p-10 cursor-pointer hover:bg-muted/40 transition-colors'>
            <Upload className='size-6 text-muted-foreground' />
            <p className='text-sm text-muted-foreground'>
              {loading ? 'Leyendo archivo...' : 'Arrastra o haz clic para subir .csv o .xlsx'}
            </p>
            <input
              type='file'
              accept='.csv,.xlsx,.xls'
              className='hidden'
              disabled={loading}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ''
              }}
            />
          </label>
        )}

        {/* STEP 2 - Mapear columnas + grupo/rol */}
        {step === 'map' && (
          <div className='space-y-4'>
            <p className='text-sm text-muted-foreground'>
              <span className='font-medium text-foreground'>{headers.length} columnas</span> •{' '}
              <span className='font-medium text-foreground'>{rows.length} filas</span>
            </p>

            {/* Mapeo de columnas */}
            <div className='space-y-2 max-h-40 overflow-y-auto pr-1'>
              {headers.map(header => (
                <div key={header} className='flex items-center gap-3'>
                  <span className='text-sm font-mono bg-muted px-2 py-1 rounded flex-1 truncate'>
                    {header}
                  </span>
                  <span className='text-muted-foreground text-xs'>→</span>
                  <Select
                    value={columnMap[header]}
                    onValueChange={val =>
                      setColumnMap(prev => ({ ...prev, [header]: val as keyof AppUser | 'ignore' }))
                    }
                  >
                    <SelectTrigger className='w-44 cursor-pointer'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='ignore'>Ignorar</SelectItem>
                      {APP_FIELDS.map(f => (
                        <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <hr />

            {/* Asignación en bloque */}
            <div className='space-y-3'>
              <p className='text-xs text-muted-foreground font-medium uppercase tracking-wide'>
                Asignar a todos los usuarios
              </p>

              <div className='grid gap-2'>
                <div className='flex items-baseline gap-2'>
                  <Label>Grupo</Label>
                  <span className='text-xs text-muted-foreground'>opcional — vacío los dejará sin grupo</span>
                </div>
                <Select
                  value={selectedGroup ? String(selectedGroup) : 'none'}
                  onValueChange={val => setSelectedGroup(val === 'none' ? null : Number(val))}
                >
                  <SelectTrigger className='cursor-pointer'>
                    <SelectValue placeholder='Sin grupo' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>Sin grupo</SelectItem>
                    {groups.map(g => (
                      <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='grid gap-2'>
                <div className='flex items-baseline gap-2'>
                  <Label>Rol</Label>
                  <span className='text-xs text-muted-foreground'>opcional — vacío los dejará sin rol</span>
                </div>
                <Select
                  value={selectedRole ? String(selectedRole) : 'none'}
                  onValueChange={val => setSelectedRole(val === 'none' ? null : Number(val))}
                >
                  <SelectTrigger className='cursor-pointer'>
                    <SelectValue placeholder='Sin rol' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>Sin rol</SelectItem>
                    {roles.map(r => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='flex gap-2 justify-end'>
              <Button variant='outline' onClick={reset} className='cursor-pointer'>Volver</Button>
              <Button onClick={handleSubmit} disabled={loading} className='cursor-pointer'>
                {loading ? 'Importando...' : `Importar ${rows.length} usuarios`}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3 - Resultados */}
        {step === 'results' && (
          <div className='space-y-4'>
            <div className='flex gap-4 text-sm flex-wrap'>
              <span className='text-green-600 font-medium'>
                ✓ {results.filter(r => r.action === 'created').length} creados
              </span>
              <span className='text-blue-600 font-medium'>
                ↑ {results.filter(r => r.action === 'updated').length} actualizados
              </span>
              <span className='text-red-500 font-medium'>
                ✗ {results.filter(r => r.status === 'error').length} con errores
              </span>
            </div>

            <div className='max-h-64 overflow-y-auto space-y-1'>
              {results.map(r => (
                <div key={r.row} className='flex items-center gap-2 text-xs px-2 py-1.5 rounded-md bg-muted/40'>
                  {r.status === 'ok'
                    ? <CheckCircle className={`size-3 shrink-0 ${r.action === 'updated' ? 'text-blue-500' : 'text-green-500'}`} />
                    : <XCircle    className='size-3 text-red-500 shrink-0' />
                  }
                  <span className='flex-1 truncate'>{r.name}</span>
                  {r.action === 'updated' && <span className='text-blue-500 text-[10px]'>actualizado</span>}
                  {r.error && <span className='text-red-500 truncate max-w-32'>{r.error}</span>}
                </div>
              ))}
            </div>

            <Button className='w-full cursor-pointer' onClick={() => { reset(); setOpen(false) }}>
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}