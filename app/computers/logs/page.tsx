'use client'
import { useEffect, useMemo, useState } from 'react'
import { getAgentLogs } from '../actions'
import { getappuser } from '../../app/actions'
import { getGroups } from '../../app/groups/actions'
import { AppUser, Group } from '@/types/AppUser'
import { AgentLogBatch, AgentLogContext, AgentLogLevel } from '@/types/AgentLog'
import { UserSelect } from '@/components/UserSelect'
import { Input } from '../../_components/_ui/input'
import { Button } from '../../_components/_ui/button'
import { Badge } from '../../_components/_ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../_components/_ui/select'
import InfinitySpinner from '@/components/InfinitySpinner'
import { RefreshCw } from 'lucide-react'

const PAGE_SIZE = 20

const today = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Bogota' })

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const LEVEL_STYLE: Record<string, string> = {
  ERR: 'text-red-500',
  FTL: 'text-red-600 font-semibold',
  WRN: 'text-yellow-600 dark:text-yellow-400',
  INF: 'text-muted-foreground',
  DBG: 'text-muted-foreground/70',
  VRB: 'text-muted-foreground/70',
}

const minutesAgo = (iso: string) => Math.round((Date.now() - new Date(iso).getTime()) / 60000)

// Resumen del estado de la ejecución que manda el agente en cada envío. Lo que suele explicar
// "no llegan capturas" (sesión desconectada, sin monitores, capturas en cola) va resaltado.
function ContextChips({ ctx }: { ctx: AgentLogContext }) {
  const chips: { label: string; warn?: boolean }[] = []
  if (ctx.app_version) chips.push({ label: `v${ctx.app_version}` })
  if (ctx.windows_user) chips.push({ label: `Windows: ${ctx.windows_user}${ctx.session_id != null ? ` (sesión ${ctx.session_id})` : ''}` })
  if (ctx.remote_session) chips.push({ label: 'Escritorio remoto' })
  if (ctx.session_active === false) chips.push({ label: 'Sesión desconectada', warn: true })
  if (ctx.monitors != null) chips.push({ label: `${ctx.monitors} monitor${ctx.monitors === 1 ? '' : 'es'}`, warn: ctx.monitors === 0 })
  if (ctx.pending_screenshots != null && ctx.pending_screenshots > 0)
    chips.push({ label: `${ctx.pending_screenshots} capturas sin enviar`, warn: true })
  if (ctx.memory_mb != null) chips.push({ label: `${ctx.memory_mb} MB` })
  if (ctx.uptime_minutes != null) chips.push({ label: `abierto hace ${ctx.uptime_minutes >= 60 ? `${Math.floor(ctx.uptime_minutes / 60)}h ${ctx.uptime_minutes % 60}m` : `${ctx.uptime_minutes}m`}` })
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(c => (
        <Badge key={c.label} variant={c.warn ? 'destructive' : 'outline'} className="font-normal">{c.label}</Badge>
      ))}
    </div>
  )
}

export default function Page() {
  const [appusers, setAppusers]       = useState<AppUser[]>([])
  const [groups, setGroups]           = useState<Group[]>([])
  const [selectedUser, setSelectedUser] = useState<AppUser | undefined>()
  const [date, setDate]               = useState(today)
  const [minLevel, setMinLevel]       = useState<AgentLogLevel | 'ALL'>('ALL')
  const [machine, setMachine]         = useState<string>('ALL')
  const [search, setSearch]           = useState('')
  const [batches, setBatches]         = useState<AgentLogBatch[] | null>(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [page, setPage]               = useState(1)

  useEffect(() => {
    getappuser().then(setAppusers)
    getGroups().then(setGroups)
  }, [])

  const load = async (user = selectedUser, day = date, level = minLevel) => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      setBatches(await getAgentLogs(String(user.id), day, level === 'ALL' ? undefined : level))
    } catch (e) {
      setError((e as Error).message)
      setBatches(null)
    } finally {
      setLoading(false)
    }
  }

  const machines = useMemo(() => [...new Set((batches ?? []).map(b => b.machine))].sort(), [batches])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (batches ?? [])
      .filter(b => machine === 'ALL' || b.machine === machine)
      .map(b => q ? { ...b, entries: b.entries.filter(e => e.message.toLowerCase().includes(q)) } : b)
      // Al buscar o filtrar por nivel, los envíos sin coincidencias no aportan nada.
      .filter(b => !(q || minLevel !== 'ALL') || b.entries.length > 0)
  }, [batches, machine, search, minLevel])

  // Último envío por equipo (batches viene del más reciente al más viejo).
  const latestByMachine = useMemo(() => {
    const map = new Map<string, AgentLogBatch>()
    for (const b of batches ?? []) if (!map.has(b.machine)) map.set(b.machine, b)
    return [...map.values()]
  }, [batches])

  const visible = filtered.slice(0, page * PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap rounded-xl border bg-card backdrop-blur-sm px-4 py-3">
        <UserSelect
          users={appusers}
          groups={groups}
          value={selectedUser?.id?.toString()}
          onValueChange={val => {
            const user = appusers.find(u => u.id === Number(val))
            setSelectedUser(user)
            setMachine('ALL')
            setPage(1)
            load(user)
          }}
          placeholder="Usuario"
          triggerClassName="h-8 text-sm flex-1 min-w-36"
        />
        <Input
          type="date"
          value={date}
          onChange={e => { setDate(e.target.value); setPage(1); load(selectedUser, e.target.value) }}
          className="h-8 text-sm w-auto"
        />
        <Select value={minLevel} onValueChange={val => { const l = val as AgentLogLevel | 'ALL'; setMinLevel(l); setPage(1); load(selectedUser, date, l) }}>
          <SelectTrigger className="h-8 text-sm w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los niveles</SelectItem>
            <SelectItem value="WRN">Avisos y errores</SelectItem>
            <SelectItem value="ERR">Solo errores</SelectItem>
          </SelectContent>
        </Select>
        {machines.length > 1 && (
          <Select value={machine} onValueChange={val => { setMachine(val); setPage(1) }}>
            <SelectTrigger className="h-8 text-sm w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los equipos</SelectItem>
              {machines.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar en los mensajes…"
          className="h-8 text-sm flex-1 min-w-40"
        />
        <Button variant="outline" size="sm" className="h-8" disabled={!selectedUser || loading} onClick={() => load()}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {!selectedUser && (
        <p className="text-center text-sm text-muted-foreground py-12">
          Selecciona un usuario para ver los logs que envía GoTracer cada 5 minutos.
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading && batches === null && (
        <div className="flex justify-center py-12"><InfinitySpinner size={64} /></div>
      )}

      {selectedUser && batches !== null && (
        <>
          {latestByMachine.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              No hay logs de este usuario para el {date}. El agente necesita una versión con envío de logs.
            </p>
          ) : (
            <div className="grid gap-2">
              {latestByMachine.map(b => {
                const ago = minutesAgo(b.received_at)
                const stale = date === today() && ago > 10
                return (
                  <div key={b.machine} className="rounded-lg border px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`size-2 rounded-full ${stale ? 'bg-red-500' : 'bg-green-500'}`} />
                      <span className="font-medium">{b.machine}</span>
                      <span className="text-muted-foreground">
                        último envío {fmtTime(b.received_at)}{date === today() && ` (hace ${ago} min)`}
                      </span>
                    </div>
                    <ContextChips ctx={b.context} />
                  </div>
                )
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground">{filtered.length} envíos</p>

          <div className="space-y-3">
            {visible.map(b => (
              <div key={`${b.machine}_${b.received_at}`} className="rounded-lg border">
                <div className="flex items-center justify-between gap-2 flex-wrap px-3 py-2 border-b bg-muted/30">
                  <span className="text-sm font-medium">
                    {b.from ? `${fmtTime(b.from)} – ` : ''}{fmtTime(b.to ?? b.received_at)}
                    {machines.length > 1 && <span className="text-muted-foreground font-normal"> · {b.machine}</span>}
                  </span>
                  <ContextChips ctx={b.context} />
                </div>
                {b.entries.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Sin líneas nuevas en este intervalo.</p>
                ) : (
                  <pre className="px-3 py-2 text-xs font-mono max-h-80 overflow-auto whitespace-pre-wrap break-all">
                    {b.truncated ? <span className="text-yellow-600">… {b.truncated} líneas anteriores omitidas{'\n'}</span> : null}
                    {b.entries.map((e, i) => (
                      <span key={i} className={LEVEL_STYLE[e.level] ?? ''}>
                        {fmtTime(e.ts)} [{e.level}] {e.message}{'\n'}
                      </span>
                    ))}
                  </pre>
                )}
              </div>
            ))}
          </div>

          {filtered.length > visible.length && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setPage(p => p + 1)}>
                Cargar más ({filtered.length - visible.length} restantes)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
