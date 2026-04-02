'use client'
import { Button } from '@/app/_components/_ui/button';
import { Dialog, DialogClose, DialogContent } from '@/app/_components/_ui/dialog';
import { Input } from '@/app/_components/_ui/input';
import { Label } from '@/app/_components/_ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table';
import { getModes, getPersonal, savePersonal } from '@/app/personal/actions'
import { Employee, Mode } from '@/types/Personal';
import React, { useEffect, useState } from 'react'

export default function MailLackTable() {

  const [employees,setEmployees] = useState<Employee[]>([]);
  const [modes,setModes] = useState<Mode[]>([])
  const [selected,setSelected] = useState<Employee | null>(null)
  useEffect(()=>{
    const getData =async ()=> {
      const data = await getPersonal()
      const m= await getModes()
      setEmployees(data.filter(employee=>!employee.corporative_email));
      setModes(m.modes)
    }
    getData()
  },[])



  const getMode = (mode_id: number): Mode | undefined => {
   
    console.log(mode_id)

    console.log(modes);
    const mode = modes.find(mode => mode.id === mode_id)
    
    return mode
  }
  const handleUpdate = () =>{
    savePersonal(selected!)
    setSelected(null)
  }

  return (
    <div>

      <Dialog open={Boolean(selected)}>
        <DialogContent>

          <Label>
            Correo
          </Label>
          <Input id='corporative_email' value={selected?.corporative_email} onChange={(e)=>{
            setSelected(prev=>({
              ...prev!,
              corporative_email: e.target.value
            }))
          }}/>

          <DialogClose asChild>
            <Button onClick={handleUpdate}>Guardar</Button>
          </DialogClose>

        </DialogContent>
      </Dialog>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
            {employees.filter(emp=>emp.corporative_email == '').map(employee=>(
              <TableRow key={employee.id}>
                <TableCell>{employee.first_name} {employee.middle_name} {employee.last_name}</TableCell>
                <TableCell>{getMode(employee.mode_type!)?.name}</TableCell>
                <TableCell><Button onClick={()=>setSelected(employee)}>Agregar Correo</Button></TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  )
}
