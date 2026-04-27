import { Button } from '@/app/_components/_ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import {
  LayoutDashboard, LockIcon, Power, LogOut,
  RefreshCw, Camera, Send, Bell
} from 'lucide-react'
import React, { EventHandler, useState } from 'react'

interface MachineActionsProps {
  onLock: () => void
  onShutdown: () => void
  onRestart: () => void
  onLogoff: () => void
  onSendFile: (file: File) => void
  onSendNotice: (title: string, message: string) => void
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
}: MachineActionsProps) {
  const [notifOpen, setNotifOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const fileRef = React.useRef<HTMLInputElement>(null)

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
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <LayoutDashboard />
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-xs bg-card border border-border rounded-3xl">
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
                <span className={`text-[11px] font-semibold text-muted-foreground text-center leading-tight`}>
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification sub-dialog */}
      <Dialog open={notifOpen} onOpenChange={setNotifOpen}>
        <DialogContent className="max-w-xs bg-card border border-border rounded-3xl p-6 shadow-xl">
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
    </>
  )
}