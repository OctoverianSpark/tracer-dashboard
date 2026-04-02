'use client'
import { Button } from '@/app/_components/_ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { deleteModes, getModes, saveModes } from '@/app/personal/actions'
import { Mode } from '@/types/Personal'
import { Pencil, Trash2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'

export default function ModalityManager() {


  const [modes,setModes] = useState<Mode[]>([])

  const [selectedMode, setSelected] = useState<Mode|null>(null)
  const [modeName,setModeName] = useState<string>('')
  useEffect(()=>{
    const getData =async  () => {
      const data = await getModes()
      console.log(data);
      
      setModes(data.modes)
    }
    getData()
  },[])


  const handleSave = () =>{
    saveModes({name:modeName})
    setModeName('')
  }

  const handleUpdate = () =>{
    // saveModes(selectedMode!)
    setSelected(null)
  }
  const handleDelete = (id:number) =>{
    deleteModes(id)
  }

  return (
    <div className='grid'>
      

      <div className="flex">
          
        <Dialog >
          <DialogTrigger asChild>
            <Button className='cursor-pointer'>
              Agregar +
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Agregar modalidad</DialogTitle>

            <Label htmlFor='name'>Modalidad</Label>
            <Input id='name' value={modeName} onChange={(e)=>{setModeName(e.target.value)}} />
            <DialogClose asChild>
              <Button onClick={()=>{
              handleSave()
              
              }}>Guardar</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
        <Dialog open={Boolean(selectedMode)} onOpenChange={(open)=>open ? true : setSelected(null)}>
          <DialogContent>
            <DialogTitle>Editar modalidad</DialogTitle>

            <Label htmlFor='name'>Modalidad</Label>
            <Input id='name' value={selectedMode?.name} onChange={(e)=>{setSelected(prev=>{
              return {
                ...prev,
                'name':e.target.value
              }
            })}} />
            <DialogClose asChild>
              <Button onClick={()=>{
              handleUpdate()
              
              }}>Guardar</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              Modalidad
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {
            modes?.map((mode)=>(
              
              <TableRow key={mode.id}>
                <TableCell>{mode.name}</TableCell>
                <TableCell>
                  <Button className='cursor-pointer' size={'icon-sm'} variant={'ghost'} onClick={()=>setSelected(mode)}><Pencil /></Button>
                  <Button className='cursor-pointer' size={'icon-sm'} variant={'ghost'} onClick={()=>handleDelete(mode.id!)}><Trash2 className='text-destructive' /></Button>
                </TableCell>
                </TableRow>
            ))
          }
        </TableBody>
      </Table>


    </div>
  )
}
