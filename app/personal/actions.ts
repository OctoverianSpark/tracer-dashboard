'use server'
import { DocType, Employee, Mode } from "@/types/Personal"
import { revalidatePath } from "next/cache"


export const getPersonal = async (): Promise<Array<Employee>> => {


  const employees = await (await fetch("https://tracerapi.asistentevirtualsas.com/personal/get")).json()


  return employees



}


export const deletePersonal = async (selected: number[]) => {

  await fetch("https://tracerapi.asistentevirtualsas.com/personal/delete", {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selected)
  })
}

export const saveDocumentType = async (body: Omit<DocType, 'id'>, id?: number) => {
  await fetch(`https://tracerapi.asistentevirtualsas.com/personal/document_types/save${id ? `/${id}` : ''}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  })
  revalidatePath('/settings/data')

}

export const getModes = async (): Promise<Array<Mode>> => {
  const data = (await fetch('https://tracerapi.asistentevirtualsas.com/personal/modes')).json()

  return data
}


export const saveModes = async (body: Mode) => {


  await fetch(`https://tracerapi.asistentevirtualsas.com/personal/modes/save${body.id ? `/${body.id}` : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  })


}

export const deleteModes = async (id: number) => {
  await fetch(`https://tracerapi.asistentevirtualsas.com/personal/modes/delete/${id}`, {
    method: 'DELETE'
  })
}

export const deleteDocumentType = async (id: number) => {
  await fetch(`https://tracerapi.asistentevirtualsas.com/personal/document_types/delete/${id}`)
}

export const savePersonal = async (body: Employee) => {

  await fetch("https://tracerapi.asistentevirtualsas.com/personal/save", {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  })
  revalidatePath('/personal/get')
}


export const getDocumentTypes = async () => {

  const document_types = await fetch("https://tracerapi.asistentevirtualsas.com/personal/document_types")


  return document_types.json()

}