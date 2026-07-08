'use client'
import { Button } from '@/app/_components/_ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/app/_components/_ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/app/_components/_ui/alert-dialog'
import { lockMachine, restartMachine, shutdownMachine, sendNotice, syncMachine } from '@/app/computers/actions'
import { Group } from '@/types/AppUser'
import { MachineActionResult, MachineSyncResult } from '@/types/Machine'
import { Globe2, LockIcon, Power, RefreshCw, Bell, Satellite, ChevronLeft, Loader2, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

type ActionKey = 'lock' | 'restart' | 'shutdown' | 'notify' | 'sync'
type Target = { kind: 'all' } | { kind: 'group'; id: number; name: string }
type Step = 'action' | 'target' | 'notify-form' | 'confirm' | 'result'

interface Props {
  groups: Group[]
}

const ACTIONS: { key: ActionKey; icon: React.ReactNode; label: string; bg: string; iconColor: string }[] = [
  { key: 'lock',     icon: <LockIcon size={26} />,  label: 'Bloquear',     bg: 'bg-blue-500/15 hover:bg-blue-500/25',    iconColor: 'text-blue-400' },
  { key: 'notify',   icon: <Bell size={26} />,      label: 'Notificación', bg: 'bg-sky-500/15 hover:bg-sky-500/25',     iconColor: 'text-sky-400' },
  { key: 'restart',  icon: <RefreshCw size={26} />, label: 'Reiniciar',    bg: 'bg-amber-500/15 hover:bg-amber-500/25', iconColor: 'text-amber-400' },
  { key: 'shutdown', icon: <Power size={26} />,     label: 'Apagar',       bg: 'bg-red-500/15 hover:bg-red-500/25',     iconColor: 'text-red-400' },
  { key: 'sync',     icon: <Satellite size={26} />, label: 'Sincronizar',  bg: 'bg-violet-500/15 hover:bg-violet-500/25', iconColor: 'text-violet-400' },
]

function targetSerial(target: Target): string {
  return target.kind === 'all' ? '*' : `group:${target.id}`
}

function targetLabel(target: Target): string {
  return target.kind === 'all' ? 'todas las máquinas' : `el grupo "${target.name}"`
}

export default function GlobalMachineActions({ groups }: Props) {
  const [open, setOpen]     = useState(false)
  const [step, setStep]     = useState<Step>('action')
  const [action, setAction] = useState<ActionKey | null>(null)
  const [target, setTarget] = useState<Target | null>(null)
  const [title, setTitle]     = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<MachineActionResult | MachineSyncResult | null>(null)

  function reset() {
    setStep('action')
    setAction(null)
    setTarget(null)
    setTitle('')
    setMessage('')
    setResult(null)
  }

  function pickAction(key: ActionKey) {
    setAction(key)
    setStep('target')
  }

  function pickTarget(t: Target) {
    setTarget(t)
    if (action === 'notify') setStep('notify-form')
    else if (action === 'restart' || action === 'shutdown') setStep('confirm')
    else run(t)
  }

  async function run(t: Target, notification?: { title: string; message: string }) {
    if (!action) return
    setStep('result')
    setLoading(true)
    try {
      const serial = targetSerial(t)
      const res = action === 'lock'     ? await lockMachine(serial)
                : action === 'restart'  ? await restartMachine(serial)
                : action === 'shutdown' ? await shutdownMachine(serial)
                : action === 'sync'     ? await syncMachine(serial)
                : notification          ? await sendNotice(serial, notification)
                : null
      setResult(res)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al ejecutar la acción')
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const actionMeta = ACTIONS.find(a => a.key === action)

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className="cursor-pointer gap-1.5"
        onClick={() => { reset(); setOpen(true) }}
      >
        <Globe2 className="size-4" />
        Acciones globales
      </Button>

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
        <DialogContent className="max-w-xs border border-border rounded-3xl p-6 shadow-xl" style={{ background: 'oklch(0.240 0.032 278)' }}>

          {step === 'action' && (
            <>
              <DialogTitle className="text-muted-foreground text-xs font-semibold tracking-widest uppercase mb-5">
                Acciones globales
              </DialogTitle>
              <p className="text-xs text-muted-foreground -mt-3 mb-4">Elige una acción y luego a qué equipos se aplica.</p>
              <div className="grid grid-cols-3 gap-3">
                {ACTIONS.map(a => (
                  <button
                    key={a.key}
                    onClick={() => pickAction(a.key)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-2xl p-4 transition-all duration-150 active:scale-90 cursor-pointer shadow-md shadow-black/20 ${a.bg}`}
                  >
                    <span className={a.iconColor}>{a.icon}</span>
                    <span className="text-[11px] font-semibold text-muted-foreground text-center leading-tight">{a.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'target' && actionMeta && (
            <>
              <button
                onClick={() => setStep('action')}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 cursor-pointer"
              >
                <ChevronLeft className="size-3.5" /> Volver
              </button>
              <DialogTitle className="text-muted-foreground text-xs font-semibold tracking-widest uppercase mb-4">
                {actionMeta.label} — elegir destino
              </DialogTitle>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => pickTarget({ kind: 'all' })}
                  className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground hover:border-ring transition-colors cursor-pointer"
                >
                  <Globe2 className="size-4 text-muted-foreground" />
                  Todas las máquinas
                </button>
                {groups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => pickTarget({ kind: 'group', id: g.id!, name: g.name })}
                    className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground hover:border-ring transition-colors cursor-pointer"
                  >
                    <Users className="size-4 text-muted-foreground" />
                    {g.name}
                  </button>
                ))}
                {groups.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No hay grupos registrados.</p>
                )}
              </div>
            </>
          )}

          {step === 'notify-form' && target && (
            <>
              <button
                onClick={() => setStep('target')}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 cursor-pointer"
              >
                <ChevronLeft className="size-3.5" /> Volver
              </button>
              <DialogTitle className="text-muted-foreground text-xs font-semibold tracking-widest uppercase mb-4">
                Notificar a {targetLabel(target)}
              </DialogTitle>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Título"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring transition-colors"
                />
                <textarea
                  placeholder="Mensaje"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                  className="bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring transition-colors resize-none"
                />
                <button
                  onClick={() => { if (title && message) run(target, { title, message }) }}
                  className="bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl py-2.5 transition-all active:scale-95 shadow-md shadow-black/20"
                >
                  Enviar
                </button>
              </div>
            </>
          )}

          {step === 'result' && (
            <>
              <DialogTitle className="text-muted-foreground text-xs font-semibold tracking-widest uppercase mb-4">
                {actionMeta?.label}
              </DialogTitle>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Enviando…
                </div>
              ) : result ? (
                <div className="flex flex-col gap-2 text-sm">
                  {result.sent != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Enviados</span>
                      <span className="font-medium">{result.sent}</span>
                    </div>
                  )}
                  {result.failed != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fallidos</span>
                      <span className={`font-medium ${result.failed > 0 ? 'text-red-400' : ''}`}>{result.failed}</span>
                    </div>
                  )}
                  {result.sent == null && result.failed == null && (
                    <p className="text-muted-foreground">{result.ok ? 'Acción enviada correctamente.' : 'La acción no se pudo completar.'}</p>
                  )}
                  {'group' in result && result.group && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Grupo</span>
                      <span className="font-medium">{result.group}</span>
                    </div>
                  )}
                  {result.results && result.results.some(r => !r.ok) && (
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-muted-foreground text-xs uppercase tracking-wide">Fallaron</span>
                      <div className="max-h-32 overflow-y-auto flex flex-col gap-1">
                        {result.results.filter(r => !r.ok).map(r => (
                          <div key={r.serial} className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs">
                            <span className="font-mono">{r.serial}</span>
                            {r.error && <span className="text-muted-foreground"> — {r.error}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm restart / shutdown en bloque */}
      <AlertDialog open={step === 'confirm'} onOpenChange={v => { if (!v) setStep('target') }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === 'shutdown' ? '¿Apagar' : '¿Reiniciar'} {target ? targetLabel(target) : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción se aplicará a {target?.kind === 'all' ? 'todos los equipos registrados' : 'todos los equipos de ese grupo'} y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => target && run(target)}>
              {action === 'shutdown' ? 'Apagar' : 'Reiniciar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
