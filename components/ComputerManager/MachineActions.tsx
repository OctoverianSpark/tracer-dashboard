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
      bg: 'bg-blue-50 hover:bg-blue-100',
      iconColor: 'text-blue-500',
      shadow: 'shadow-blue-100',
    },
    {
      icon: <Power size={26} />,
      label: 'Apagar',
      onClick: onShutdown,
      bg: 'bg-red-50 hover:bg-red-100',
      iconColor: 'text-red-500',
      shadow: 'shadow-red-100',
    },
    {
      icon: <RefreshCw size={26} />,
      label: 'Reiniciar',
      onClick: onRestart,
      bg: 'bg-orange-50 hover:bg-orange-100',
      iconColor: 'text-orange-500',
      shadow: 'shadow-orange-100',
    },
    {
      icon: <LogOut size={26} />,
      label: 'Cerrar sesión',
      onClick: onLogoff,
      bg: 'bg-amber-50 hover:bg-amber-100',
      iconColor: 'text-amber-500',
      shadow: 'shadow-amber-100',
    },
    {
      icon: <Send size={26} />,
      label: 'Enviar archivo',
      onClick: () => fileRef.current?.click(),
      bg: 'bg-emerald-50 hover:bg-emerald-100',
      iconColor: 'text-emerald-500',
      shadow: 'shadow-emerald-100',
    },
    {
      icon: <Bell size={26} />,
      label: 'Notificación',
      onClick: () => setNotifOpen(true),
      bg: 'bg-sky-50 hover:bg-sky-100',
      iconColor: 'text-sky-500',
      shadow: 'shadow-sky-100',
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

        <DialogContent className="max-w-xs bg-white border border-neutral-200 rounded-3xl">
          <DialogTitle className="text-neutral-400 text-xs font-semibold tracking-widest uppercase mb-5">
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
                <span className={`text-[11px] font-semibold text-neutral-500 text-center leading-tight`}>
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification sub-dialog */}
      <Dialog open={notifOpen} onOpenChange={setNotifOpen}>
        <DialogContent className="max-w-xs bg-white border border-neutral-200 rounded-3xl p-6 shadow-xl">
          <DialogTitle className="text-neutral-400 text-xs font-semibold tracking-widest uppercase mb-4">
            Enviar notificación
          </DialogTitle>

          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Título"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-300 outline-none focus:border-sky-400 transition-colors"
            />
            <textarea
              placeholder="Mensaje"
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-300 outline-none focus:border-sky-400 transition-colors resize-none"
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
              className="bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl py-2.5 transition-all active:scale-95 shadow-md shadow-sky-100"
            >
              Enviar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}