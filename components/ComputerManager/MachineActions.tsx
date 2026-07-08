import { Button } from '@/app/_components/_ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/app/_components/_ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { MachineSyncResult } from '@/types/Machine'
import { LayoutDashboard, LockIcon, Power, RefreshCw, Send, Bell, Satellite, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import React, { useState } from 'react'

interface MachineActionsProps {
  onLock: () => void
  onShutdown: () => void
  onRestart: () => void
  onLogoff: () => void
  onSendFile: (file: File) => void
  onSendNotice: (title: string, message: string) => void
  onSync: () => Promise<MachineSyncResult>
}

interface ActionItem {
  icon: React.ReactNode
  label: string
  onClick: () => void
  bg: string
  iconColor: string
  shadow: string
}

export default function MachineActions({
  onLock,
  onShutdown,
  onRestart,
  onLogoff,
  onSendFile,
  onSendNotice,
  onSync,
}: MachineActionsProps) {
  const [notifOpen, setNotifOpen]       = useState(false)
  const [confirmAction, setConfirmAction] = useState<'shutdown' | 'restart' | null>(null)
  const [title, setTitle]               = useState('')
  const [message, setMessage]           = useState('')
  const [syncOpen, setSyncOpen]         = useState(false)
  const [syncing, setSyncing]           = useState(false)
  const [syncResult, setSyncResult]     = useState<MachineSyncResult | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  async function handleSync() {
    setSyncOpen(true)
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await onSync()
      setSyncResult(result)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al sincronizar')
      setSyncOpen(false)
    } finally {
      setSyncing(false)
    }
  }

  const actions: ActionItem[] = [
    {
      icon: <LockIcon size={26} />,
      label: 'Bloquear',
      onClick: onLock,
      bg: 'bg-blue-500/15 hover:bg-blue-500/25',
      iconColor: 'text-blue-400',
      shadow: 'shadow-black/20',
    },
    {
      icon: <Send size={26} />,
      label: 'Enviar archivo',
      onClick: () => fileRef.current?.click(),
      bg: 'bg-emerald-500/15 hover:bg-emerald-500/25',
      iconColor: 'text-emerald-400',
      shadow: 'shadow-black/20',
    },
    {
      icon: <Bell size={26} />,
      label: 'Notificación',
      onClick: () => setNotifOpen(true),
      bg: 'bg-sky-500/15 hover:bg-sky-500/25',
      iconColor: 'text-sky-400',
      shadow: 'shadow-black/20',
    },
    {
      icon: <RefreshCw size={26} />,
      label: 'Reiniciar',
      onClick: () => setConfirmAction('restart'),
      bg: 'bg-amber-500/15 hover:bg-amber-500/25',
      iconColor: 'text-amber-400',
      shadow: 'shadow-black/20',
    },
    {
      icon: <Power size={26} />,
      label: 'Apagar',
      onClick: () => setConfirmAction('shutdown'),
      bg: 'bg-red-500/15 hover:bg-red-500/25',
      iconColor: 'text-red-400',
      shadow: 'shadow-black/20',
    },
    {
      icon: <Satellite size={26} />,
      label: 'Sincronizar',
      onClick: handleSync,
      bg: 'bg-violet-500/15 hover:bg-violet-500/25',
      iconColor: 'text-violet-400',
      shadow: 'shadow-black/20',
    },
  ]

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onSendFile(file)
        }}
      />

      <Dialog>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                >
                  <LayoutDashboard />
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>Acciones del equipo</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DialogContent className="max-w-xs border border-border rounded-3xl" style={{ background: 'oklch(0.240 0.032 278)' }}>
          <DialogTitle className="text-muted-foreground text-xs font-semibold tracking-widest uppercase mb-5">
            Acciones del equipo
          </DialogTitle>

          <div className="grid grid-cols-3 gap-3">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className={`
                  flex flex-col items-center justify-center gap-2
                  rounded-2xl p-4 transition-all duration-150
                  active:scale-90 cursor-pointer shadow-md
                  ${action.bg} ${action.shadow}
                `}
              >
                <span className={action.iconColor}>{action.icon}</span>
                <span className="text-[11px] font-semibold text-muted-foreground text-center leading-tight">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm shutdown / restart */}
      <AlertDialog open={!!confirmAction} onOpenChange={open => { if (!open) setConfirmAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'shutdown' ? '¿Apagar equipo?' : '¿Reiniciar equipo?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'shutdown'
                ? 'El equipo se apagará de forma remota. Esta acción no se puede deshacer.'
                : 'El equipo se reiniciará de forma remota. Las sesiones activas se cerrarán.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction === 'shutdown') onShutdown()
                else onRestart()
                setConfirmAction(null)
              }}
            >
              {confirmAction === 'shutdown' ? 'Apagar' : 'Reiniciar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notification sub-dialog */}
      <Dialog open={notifOpen} onOpenChange={setNotifOpen}>
        <DialogContent className="max-w-xs border border-border rounded-3xl p-6 shadow-xl" style={{ background: 'oklch(0.240 0.032 278)' }}>
          <DialogTitle className="text-muted-foreground text-xs font-semibold tracking-widest uppercase mb-4">
            Enviar notificación
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
              onClick={() => {
                if (title && message) {
                  onSendNotice(title, message)
                  setTitle('')
                  setMessage('')
                  setNotifOpen(false)
                }
              }}
              className="bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl py-2.5 transition-all active:scale-95 shadow-md shadow-black/20"
            >
              Enviar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sync result sub-dialog */}
      <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
        <DialogContent className="max-w-xs border border-border rounded-3xl p-6 shadow-xl" style={{ background: 'oklch(0.240 0.032 278)' }}>
          <DialogTitle className="text-muted-foreground text-xs font-semibold tracking-widest uppercase mb-4">
            Sincronización
          </DialogTitle>

          {syncing ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Esperando respuesta del equipo…
            </div>
          ) : syncResult ? (
            syncResult.ok ? (
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Grupo</span>
                  <span className="font-medium">{syncResult.group ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Group ID</span>
                  <span className="font-medium font-mono">{syncResult.group_id ?? '—'}</span>
                </div>
                {syncResult.access_level && (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Access level</span>
                    <pre className="bg-secondary border border-border rounded-xl px-3 py-2 text-xs whitespace-pre-wrap break-all">
                      {syncResult.access_level}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                El equipo no respondió a la sincronización.
              </p>
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}