'use client'
import { useRef, useState } from 'react'
import { getProductivityReport } from '@/app/supervisors/actions'
import { getDailyProductivity, getGlobalDailyProductivity, getGroupDailyProductivity } from '@/app/productivity/actions'
import { DailyProductivity, UserProductivity } from '@/lib/productivity'
import { AppUser, Group } from '@/types/AppUser'
import { Card } from '@/app/_components/_ui/card'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Button } from '@/app/_components/_ui/button'
import { UserSelect } from '@/components/UserSelect'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/_components/_ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import ProductivityPodium from './ProductivityPodium'
import ProductivityCurveChart from './ProductivityCurveChart'
import { Loader2, FileDown } from 'lucide-react'

interface ProductivityDashboardProps {
  users: AppUser[]
  groups: Group[]
}

type ViewMode = 'global' | 'user' | 'group'
type Section = 'podium' | 'curve'

const today = () => {
  const bogota = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  return bogota.toLocaleDateString('sv')
}

const daysAgo = (n: number) => {
  const bogota = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  bogota.setDate(bogota.getDate() - n)
  return bogota.toLocaleDateString('sv')
}

const fmtHM = (secs: number) => {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const fmtDate = (date: string) => {
  const [y, m, d] = date.split('-')
  return `${y}-${m}-${d}`
}

export default function ProductivityDashboard({ users, groups }: ProductivityDashboardProps) {
  const [dateFrom, setDateFrom] = useState(daysAgo(6))
  const [dateTo, setDateTo] = useState(today())
  const [section, setSection] = useState<Section>('podium')
  const [viewMode, setViewMode] = useState<ViewMode>('global')
  const [userId, setUserId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [report, setReport] = useState<UserProductivity[] | null>(null)
  const [daily, setDaily] = useState<DailyProductivity[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const curveSectionRef = useRef<HTMLDivElement>(null)

  const rangeInvalid = dateTo < dateFrom

  const loadDaily = async (mode: ViewMode, selectedUserId: string, selectedGroupId: string) => {
    if (mode === 'global') {
      setDaily(await getGlobalDailyProductivity(dateFrom, dateTo))
      return
    }
    if (mode === 'group') {
      if (selectedGroupId) setDaily(await getGroupDailyProductivity(Number(selectedGroupId), dateFrom, dateTo))
      else setDaily([])
      return
    }
    if (selectedUserId) setDaily(await getDailyProductivity(Number(selectedUserId), dateFrom, dateTo))
    else setDaily([])
  }

  const defaultTopUserId = (rep: UserProductivity[]) => {
    const topUser = [...rep]
      .filter(r => r.totalSeconds > 0)
      .sort((a, b) => b.overallProductivityPercent - a.overallProductivityPercent)[0]?.user.id
    return topUser ? String(topUser) : ''
  }

  const load = async () => {
    if (rangeInvalid) return
    setLoading(true)
    try {
      const rep = await getProductivityReport(dateFrom, dateTo)
      setReport(rep)

      let effectiveUserId = userId
      if (viewMode === 'user' && !effectiveUserId) {
        effectiveUserId = defaultTopUserId(rep)
        if (effectiveUserId) setUserId(effectiveUserId)
      }
      let effectiveGroupId = groupId
      if (viewMode === 'group' && !effectiveGroupId && groups[0]?.id != null) {
        effectiveGroupId = String(groups[0].id)
        setGroupId(effectiveGroupId)
      }

      await loadDaily(viewMode, effectiveUserId, effectiveGroupId)
    } finally {
      setLoading(false)
    }
  }

  // La curva ya NO se refresca sola al cambiar de pestaña (Global/Por grupo/Por usuario) ni al
  // elegir usuario/grupo — solo cambia el estado local y se limpia `daily` para que se vea el
  // placeholder "Genera el reporte..." en vez de datos desactualizados; solo "Generar" pide
  // datos nuevos.
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    setDaily(null)
    if (mode === 'user' && !userId) {
      const defaultId = defaultTopUserId(report ?? [])
      if (defaultId) setUserId(defaultId)
    }
    if (mode === 'group' && !groupId && groups[0]?.id != null) {
      setGroupId(String(groups[0].id))
    }
  }

  const handleUserChange = (value: string) => {
    setUserId(value)
    setDaily(null)
  }

  const handleGroupChange = (value: string) => {
    setGroupId(value)
    setDaily(null)
  }

  const handleExportPdf = async () => {
    if (!curveSectionRef.current) return
    setExportingPdf(true)
    try {
      // Import dinámico: html2canvas/jsPDF tocan `document`/`window` — deben cargar solo en el
      // cliente, nunca durante el render en el servidor de un componente 'use client'.
      // html2canvas-pro (no el html2canvas original) — el proyecto usa colores oklch() (Tailwind
      // v4/shadcn, ver app/globals.css) y el html2canvas clásico no sabe parsear ese formato.
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ])

      const canvas = await html2canvas(curveSectionRef.current, {
        scale: 2,
        backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff',
      })

      const imgData = canvas.toDataURL('image/png')
      const orientation = canvas.width >= canvas.height ? 'landscape' : 'portrait'
      const pdf = new jsPDF({ orientation, unit: 'pt', format: [canvas.width, canvas.height] })
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)

      const scopeLabel = viewMode === 'global'
        ? 'global'
        : viewMode === 'group'
          ? (selectedGroup?.name ?? 'grupo').toLowerCase().replace(/\s+/g, '_')
          : (selectedUser?.full_name ?? 'usuario').toLowerCase().replace(/\s+/g, '_')

      pdf.save(`curva_productividad_${scopeLabel}_${dateFrom}_a_${dateTo}.pdf`)
    } finally {
      setExportingPdf(false)
    }
  }

  const top3 = (report ?? [])
    .filter(r => r.totalSeconds > 0)
    .sort((a, b) => b.overallProductivityPercent - a.overallProductivityPercent)
    .slice(0, 3)

  const selectedUser = users.find(u => String(u.id) === userId)
  const selectedGroup = groups.find(g => String(g.id) === groupId)

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5 w-full sm:w-auto">
          <Label>Desde</Label>
          <Input
            type="date" value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); if (e.target.value > dateTo) setDateTo(e.target.value) }}
            className="w-full sm:w-44"
          />
        </div>
        <div className="grid gap-1.5 w-full sm:w-auto">
          <Label>Hasta</Label>
          <Input
            type="date" value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className={`w-full sm:w-44 ${rangeInvalid ? 'border-destructive' : ''}`}
          />
        </div>
        <Button onClick={load} disabled={loading || rangeInvalid}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Cargando…</> : 'Generar'}
        </Button>
      </div>
      {rangeInvalid && (
        <p className="text-xs text-destructive">La fecha &quot;Hasta&quot; no puede ser anterior a &quot;Desde&quot;.</p>
      )}

      {/* Podio / Curva */}
      <Tabs value={section} onValueChange={v => setSection(v as Section)}>
        <TabsList>
          <TabsTrigger value="podium" className="cursor-pointer">Podio</TabsTrigger>
          <TabsTrigger value="curve" className="cursor-pointer">Curva</TabsTrigger>
        </TabsList>

        <TabsContent value="podium" className="mt-4">
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg font-medium mb-4">Podio de productividad</h2>
            {report === null ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Selecciona un rango y genera el reporte.</p>
            ) : (
              <ProductivityPodium top3={top3} />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="curve" className="mt-4">
          <Card className="p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-medium">Curva de productividad</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Tabs value={viewMode} onValueChange={v => handleViewModeChange(v as ViewMode)}>
                  <TabsList>
                    <TabsTrigger value="global" className="cursor-pointer">Global</TabsTrigger>
                    <TabsTrigger value="group" className="cursor-pointer">Por grupo</TabsTrigger>
                    <TabsTrigger value="user" className="cursor-pointer">Por usuario</TabsTrigger>
                  </TabsList>
                </Tabs>
                {viewMode === 'user' && (
                  <div className="w-56">
                    <UserSelect users={users} value={userId} onValueChange={handleUserChange} placeholder="Seleccionar usuario" />
                  </div>
                )}
                {viewMode === 'group' && (
                  <Select value={groupId} onValueChange={handleGroupChange}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Seleccionar grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map(g => (
                        <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  variant="outline" size="sm" className="cursor-pointer"
                  onClick={handleExportPdf}
                  disabled={exportingPdf || !daily || daily.length === 0}
                >
                  {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
                  Exportar PDF
                </Button>
              </div>
            </div>

            {daily === null ? (
              <p className="text-sm text-muted-foreground py-10 text-center">Genera el reporte para ver la curva.</p>
            ) : (
              <div ref={curveSectionRef} className="bg-background p-2">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {viewMode === 'global' && 'Global — todos los usuarios'}
                  {viewMode === 'group' && `Grupo: ${selectedGroup?.name ?? ''}`}
                  {viewMode === 'user' && `Usuario: ${selectedUser?.full_name ?? ''}`}
                  {' · '}{fmtDate(dateFrom)} a {fmtDate(dateTo)}
                </p>
                <ProductivityCurveChart data={daily} />

                <div className="rounded-md border overflow-x-auto mt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Productivo</TableHead>
                        <TableHead className="text-right">No productivo</TableHead>
                        <TableHead className="text-right">Sin categorizar</TableHead>
                        <TableHead className="text-right">Duración</TableHead>
                        <TableHead className="text-right">Productividad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {daily.map(d => (
                        <TableRow key={d.date}>
                          <TableCell className="font-medium">{fmtDate(d.date)}</TableCell>
                          <TableCell className="text-right text-sm">{fmtHM(d.productiveSeconds)}</TableCell>
                          <TableCell className="text-right text-sm">{fmtHM(d.unproductiveSeconds)}</TableCell>
                          <TableCell className="text-right text-sm">{fmtHM(d.uncategorizedSeconds)}</TableCell>
                          <TableCell className="text-right text-sm">{fmtHM(d.totalSeconds)}</TableCell>
                          <TableCell className="text-right font-medium">{d.overallProductivityPercent}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            {viewMode === 'user' && selectedUser && (
              <p className="text-xs text-muted-foreground mt-2">Mostrando la curva de {selectedUser.full_name}.</p>
            )}
            {viewMode === 'group' && selectedGroup && (
              <p className="text-xs text-muted-foreground mt-2">Promedio por persona del grupo {selectedGroup.name}, entre quienes tenían turno cada día.</p>
            )}
            {viewMode === 'global' && daily !== null && (
              <p className="text-xs text-muted-foreground mt-2">Promedio por persona entre todos los usuarios con turno cada día del rango seleccionado.</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
