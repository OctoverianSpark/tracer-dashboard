'use client'
import { Button } from '@/app/_components/_ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/app/_components/_ui/dialog'
import { syncHelpdesk } from '@/app/computers/actions'
import { Group } from '@/types/AppUser'
import { Globe2, Loader2, UploadCloud, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

type Target = { kind: 'all' } | { kind: 'group'; id: number; name: string }

function targetKey(target: Target): string {
  return target.kind === 'all' ? '*' : `group:${target.id}`
}

function targetLabel(target: Target): string {
  return target.kind === 'all' ? 'todos los equipos' : `el grupo "${target.name}"`
}

interface Props {
  groups: Group[]
}

export default function SyncHelpdeskButton({ groups }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function run(target: Target) {
    setLoading(true)
    try {
      const result = await syncHelpdesk(targetKey(target))
      toast.success(`HelpDESK sincronizado (${targetLabel(target)}): ${result.sent} equipos enviados`)
      setOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al sincronizar con HelpDESK')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className="cursor-pointer gap-1.5"
        onClick={() => setOpen(true)}
      >
        <UploadCloud className="size-4" />
        Sincronizar con HelpDESK
      </Button>

      <Dialog open={open} onOpenChange={v => { if (!loading) setOpen(v) }}>
        <DialogContent className="max-w-xs border border-border rounded-3xl p-6 shadow-xl" style={{ background: 'oklch(0.240 0.032 278)' }}>
          <DialogTitle className="text-muted-foreground text-xs font-semibold tracking-widest uppercase mb-4">
            Sincronizar con HelpDESK
          </DialogTitle>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Enviando…
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground -mt-1 mb-2">Elige qué equipos enviar al inventario de HelpDESK.</p>
              <button
                onClick={() => run({ kind: 'all' })}
                className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground hover:border-ring transition-colors cursor-pointer"
              >
                <Globe2 className="size-4 text-muted-foreground" />
                Todos los equipos
              </button>
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => run({ kind: 'group', id: g.id!, name: g.name })}
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
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
