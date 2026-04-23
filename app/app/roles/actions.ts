'use server'
import { Role } from "@/types/AppUser";
import { revalidatePath } from "next/cache";

export const saveRole = async (role: Role) => {

  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/roles${role.id ? `/update/${role.id}` : `/save`}`, {
    method: role.id ? 'PUT' : 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(role)
  })

  revalidatePath('/app/roles/get')

}

export const getRoles = async (): Promise<Array<Role>> => {
  const res = (await fetch(`${process.env.NEXT_PUBLIC_API_URL}/roles`)).json()

  return res
}