export interface ReportType {
  id?: number
  name: string
  description?: string
}

export interface ReportTypeAssignment {
  id?: number
  report_type_id: number
  group_id: number
}
