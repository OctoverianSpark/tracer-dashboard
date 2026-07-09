'use client'
import { Button } from '@/app/_components/_ui/button'
import { syncHelpdesk } from '@/app/computers/actions'
import { Loader2, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export default function SyncHelpdeskButton() {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const result = await syncHelpdesk()
      toast.success(`HelpDESK sincronizado: ${result.sent} equipos enviados`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al sincronizar con HelpDESK')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      className="cursor-pointer gap-1.5"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
      Sincronizar con HelpDESK
    </Button>
  )
}
