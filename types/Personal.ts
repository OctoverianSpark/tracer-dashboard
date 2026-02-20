
export interface Employee {
  id?:number
  first_name: string
  middle_name: string
  last_name: string
  doc_type?: number
  document: string
  job_title: string
}

export interface DocType {
  id:number,
  full_name: string,
  short_name: string
  value: string,
  active: boolean
}


