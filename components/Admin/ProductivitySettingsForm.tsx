'use client'
import { useState } from 'react'
import { saveProductivitySettings } from '@/app/app/admin/config/actions'
import { ProductivitySettings } from '@/types/ProductivitySettings'
import { Button } from '@/app/_components/_ui/button'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/_components/_ui/card'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  initial: ProductivitySettings
}

export default function ProductivitySettingsForm({ initial }: Props) {
  // Se editan como porcentaje (70, 150) — el backend guarda la fracción (0.7, 1.5).
  const [uncategorizedPct, setUncategorizedPct] = useState(Math.round(initial.uncategorized_credit * 100))
  const [productivePct, setProductivePct] = useState(Math.round(initial.productive_credit * 100))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveProductivitySettings({
        uncategorized_credit: uncategorizedPct / 100,
        productive_credit: productivePct / 100,
      })
      toast.success('Configuración guardada')
    } catch {
      toast.error('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Índices del cálculo de productividad</CardTitle>
        <CardDescription>
          Pesos que usa la métrica &quot;Global&quot; de productividad — el resultado final siempre
          se topa en 100%, aunque los pesos sumen más.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 max-w-xl">
        <div className="grid gap-1.5">
          <Label htmlFor="productive-pct">Peso de apps productivas (%)</Label>
          <Input
            id="productive-pct"
            type="number"
            min={0}
            step={5}
            value={productivePct}
            onChange={e => setProductivePct(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Hoy 100% = cuenta 1:1. Subirlo hace que el tiempo productivo empuje el Global más rápido.
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="uncategorized-pct">Crédito de apps sin categorizar (%)</Label>
          <Input
            id="uncategorized-pct"
            type="number"
            min={0}
            max={100}
            step={5}
            value={uncategorizedPct}
            onChange={e => setUncategorizedPct(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Cuánto del tiempo en apps aún no categorizadas cuenta como productivo.
          </p>
        </div>
        <div className="sm:col-span-2">
          <Button onClick={handleSave} disabled={saving} className="cursor-pointer">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
