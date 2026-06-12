'use client'
import { Machine } from '@/types/Machine'
import { AppUser } from '@/types/AppUser'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/_components/_ui/tabs'
import MachineList from './MachineList'
import AppCategorization from '@/components/Supervisors/AppCategorization'
import UncategorizedApps from '@/components/Supervisors/UncategorizedApps'

interface Props {
  machines: Machine[]
  appusers: AppUser[]
}

export default function ComputersControlTabs({ machines, appusers }: Props) {
  return (
    <Tabs defaultValue="machines">
      <TabsList>
        <TabsTrigger value="machines">Equipos</TabsTrigger>
        <TabsTrigger value="categorization">Categorización de apps</TabsTrigger>
        <TabsTrigger value="uncategorized">Apps sin categorizar</TabsTrigger>
      </TabsList>
      <TabsContent value="machines" className="mt-4">
        <MachineList machines={machines} appusers={appusers} />
      </TabsContent>
      <TabsContent value="categorization" className="mt-4">
        <AppCategorization />
      </TabsContent>
      <TabsContent value="uncategorized" className="mt-4">
        <UncategorizedApps />
      </TabsContent>
    </Tabs>
  )
}
