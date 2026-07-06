import { getGroups } from '@/app/app/groups/actions'
import { getReportTypeAssignments, getReportTypes } from '../actions'
import ReportTypeForm from '@/components/ReportTypes/ReportTypeForm'
import ReportTypeAssigner from '@/components/ReportTypes/ReportTypeAssigner'
import ReportTypeTable from '@/components/ReportTypes/ReportTypeTable'

export default async function Page() {
  const [reportTypes, assignments, groups] = await Promise.all([
    getReportTypes(),
    getReportTypeAssignments(),
    getGroups(),
  ])

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-semibold">Tipos de Reporte</h1>
      <p className="text-sm text-muted-foreground">
        Configura los tipos de reporte disponibles y qué grupos pueden usarlos. La app de escritorio
        consulta esta lista cada vez que se abre el formulario de reporte.
      </p>
      <div className="flex flex-wrap gap-2">
        <ReportTypeForm />
        <ReportTypeAssigner reportTypes={reportTypes} groups={groups} assignments={assignments} />
      </div>
      <ReportTypeTable reportTypes={reportTypes} groups={groups} assignments={assignments} />
    </div>
  )
}
