import { getappuser } from '@/app/app/actions'
import { getGroups } from '@/app/app/groups/actions'
import ProgramationForm from '@/components/TimeMesh/ProgramationForm'
import ProgramationTable from '@/components/TimeMesh/ProgramationTable'
import ScheduleAssigner from '@/components/TimeMesh/ScheduleAssigner'
import BulkScheduleAssigner from '@/components/TimeMesh/BulkScheduleAssigner'
import ScheduleTable from '@/components/TimeMesh/ScheduleTable'
import { getProgramations, getSchedules, getAllRotations } from '../actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/_components/_ui/tabs'

export default async function Page() {
  const [appuser, programations, schedules, groups, rotations] = await Promise.all([
    getappuser(),
    getProgramations(),
    getSchedules(),
    getGroups(),
    getAllRotations(),
  ])
  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-semibold">Administración de Horarios</h1>
      <div className="flex flex-wrap gap-2">
        <ProgramationForm />
        <ScheduleAssigner
          appuser={appuser}
          programations={programations}
          schedules={schedules}
          rotations={rotations}
          groups={groups}
        />
        <BulkScheduleAssigner
          appuser={appuser}
          programations={programations}
          schedules={schedules}
          rotations={rotations}
          groups={groups}
        />
      </div>
      <Tabs defaultValue="programations">
        <TabsList>
          <TabsTrigger value="programations">Horarios</TabsTrigger>
          <TabsTrigger value="schedules">Asignaciones</TabsTrigger>
        </TabsList>
        <TabsContent value="programations">
          <ProgramationTable programations={programations} />
        </TabsContent>
        <TabsContent value="schedules">
          <ScheduleTable
            schedules={schedules}
            appuser={appuser}
            programations={programations}
            rotations={rotations}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
