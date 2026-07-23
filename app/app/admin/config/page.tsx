import { getProductivitySettings } from './actions'
import ProductivitySettingsForm from '@/components/Admin/ProductivitySettingsForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/_components/_ui/tabs'

export default async function Page() {
  const settings = await getProductivitySettings()

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Ajustes globales de la aplicación.
        </p>
      </div>

      <Tabs defaultValue="indices">
        <TabsList>
          <TabsTrigger value="indices">Índices</TabsTrigger>
        </TabsList>
        <TabsContent value="indices" className="mt-4">
          <ProductivitySettingsForm initial={settings} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
