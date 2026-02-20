'use server'
import { DocType, Employee } from "@/types/Personal"
import { revalidatePath } from "next/cache"


export const getPersonal = async (): Promise<Array<Employee>> =>{


  const employees = await (await fetch("http://localhost:3000/personal/get")).json()

  
  return employees
  


}


export const deletePersonal = async (selected:number[]) =>{
  
  await fetch("http://localhost:3000/personal/delete",{
    method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify(selected)})
} 


export const savePersonal = async (body: Omit<Employee,'id'>) =>{

  await fetch("http://localhost:3000/personal/save",{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    revalidatePath('/personal/get')
}


export const getDocumentTypes =async  () =>{

  const document_types = await fetch("http://localhost:3000/personal/document_types")


  return document_types.json()

}