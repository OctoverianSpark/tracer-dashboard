'use client'
import { Machine } from '@/types/Machine'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/_components/_ui/tabs'
import MachineList from './MachineList'
import AppCategorization from '@/components/Supervisors/AppCategorization'

interface Props {
  machines: Machine[]
}

export default function ComputersControlTabs({ machines }: Props) {
  return (
    <Tabs defaultValue="machines">
      <TabsList>
        <TabsTrigger value="machines">Equipos</TabsTrigger>
        <TabsTrigger value="categorization">Categorización de apps</TabsTrigger>
      </TabsList>
      <TabsContent value="machines" className="mt-4">
        <MachineList machines={machines} />
      </TabsContent>
      <TabsContent value="categorization" className="mt-4">
        <AppCategorization />
      </TabsContent>
    </Tabs>
  )
}
