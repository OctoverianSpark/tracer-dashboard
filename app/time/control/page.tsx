import { getappuser } from '@/app/app/actions'
import ProgramationForm from '@/components/TimeMesh/ProgramationForm'
import ProgramationTable from '@/components/TimeMesh/ProgramationTable'
import ScheduleAssigner from '@/components/TimeMesh/ScheduleAssigner'
import ScheduleTable from '@/components/TimeMesh/ScheduleTable'
import { getProgramations, getSchedules } from '../actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/_components/_ui/tabs'

export default async function Page() {
  const [appuser, programations, schedules] = await Promise.all([
    getappuser(),
    getProgramations(),
    getSchedules()
  ])
  console.log({ appuser, programations, schedules })
  return (
    <div>
      <h1 className="text-2xl">Administracion de Horarios</h1>
      <div className='flex gap-2'>
        <ProgramationForm />
        <ScheduleAssigner
          appuser={appuser}
          programations={programations}
          schedules={schedules}
        />
      </div>
      <Tabs>
        <TabsList>
          <TabsTrigger value='programations'>Horarios</TabsTrigger>
          <TabsTrigger value='schedules'>Asignaciones</TabsTrigger>
        </TabsList>
        <TabsContent value='programations'>
          <ProgramationTable programations={programations} />
        </TabsContent>
        <TabsContent value='schedules'>
          <ScheduleTable
            schedules={schedules}
            appuser={appuser}
            programations={programations}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}