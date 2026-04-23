'use client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/_components/_ui/tabs'

export default function page() {
  return (
    <Tabs>
      <TabsList>
        <TabsTrigger value='equipos'>
          Equipos
        </TabsTrigger>
      </TabsList>
      <TabsContent value='equipos'>
      </TabsContent>
    </Tabs>
  )
}
