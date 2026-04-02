
export interface Employee {
  id?: number
  first_name: string
  middle_name: string
  last_name: string
  doc_type?: number
  document: string
  job_title: string
  corporative_email?: string
  mode_type?: number
}

export interface Mode {
  id?: number,
  name: string,
}


export interface DocType {
  id?: number,
  full_name: string,
  short_name: string
  value: string,
  active: number
}


