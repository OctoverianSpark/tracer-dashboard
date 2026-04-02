'use client'
import { Button } from '@/app/_components/_ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { Toggle } from '@/app/_components/_ui/toggle'
import { deleteDocumentType, getDocumentTypes, saveDocumentType } from '@/app/personal/actions'
import { DocType } from '@/types/Personal'
import { Pencil, Trash2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'

const EMPTY_DOC: DocType = {
  full_name: '',
  short_name: '',
  value: '',
  active: 1,
}

export default function DocumentTypeSettings() {
  const [docTypes, setDocTypes] = useState<DocType[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [createDoc, setCreateDoc] = useState<DocType>(EMPTY_DOC)
  const [editDoc, setEditDoc] = useState<DocType | null>(null)

  useEffect(() => {
    const getData = async () => {
      const data = await getDocumentTypes()
      setDocTypes(data)
    }
    getData()
  }, [])

  const updateTable = (data: DocType, type: 'save' | 'delete') => {

    setDocTypes((prev)=>{
      const updated = [...prev]



      if(type === 'delete'){
        updated.filter((d)=>d.id != data.id)
      }else{
        if(data.id){
          
            return prev.map((d) => d.id === data.id ? { ...d, ...data } : d);
          
          
        }else{

          updated.push(data)
        }

        }
      
      return updated
    })
  }

  const handleDelete= (doc:DocType) =>{
    deleteDocumentType(doc.id!)
    updateTable(doc,'delete')
  }

  const handleCreate = () => {
    // tu lógica de crear con createDoc
    console.log(createDoc)
    saveDocumentType(createDoc)
    setCreateOpen(false)
    setCreateDoc(EMPTY_DOC)
    updateTable(createDoc,'save')
  
  }

  const handleEdit = () => {
    // tu lógica de editar con editDoc
    console.log(editDoc)
    saveDocumentType(editDoc!,editDoc!.id)
    updateTable(editDoc!,'save')

    setEditDoc(null)
  }

  return (
    <div className='relative'>

      {/* Dialog: Crear */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setCreateDoc(EMPTY_DOC) }}>
        <DialogTrigger asChild>
          <Button className='absolute right-0 z-10'>Agregar Tipo +</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo tipo de Documento</DialogTitle>
          </DialogHeader>
          <div className='grid gap-2'>
            <Label>Nombre del Documento</Label>
            <Input
              value={createDoc.full_name}
              onChange={e => setCreateDoc(prev => ({ ...prev, full_name: e.target.value }))}
            />
          </div>
          <div className='grid gap-2'>
            <Label>Nombre corto</Label>
            <Input
              value={createDoc.short_name}
              onChange={e => setCreateDoc(prev => ({ ...prev, short_name: e.target.value, value: e.target.value.toLowerCase() }))}
            />
          </div>
          <div className='grid gap-2'>
            <Label>¿Está activo?</Label>
            <div className='flex'>
              <Toggle
                pressed={Boolean(createDoc.active)}
                onPressedChange={pressed => setCreateDoc(prev => ({ ...prev, active: Number(pressed) }))}
                className='cursor-pointer'
              >
                {Boolean(createDoc.active) ? 'Sí' : 'No'}
              </Toggle>
            </div>
          </div>
          <Button onClick={handleCreate} className='mt-2 w-full'>Guardar</Button>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar */}
      <Dialog open={Boolean(editDoc)} onOpenChange={(open) => { if (!open) setEditDoc(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar tipo de Documento</DialogTitle>
          </DialogHeader>
          <div className='grid gap-2'>
            <Label>Nombre del Documento</Label>
            <Input
              value={editDoc?.full_name ?? ''}
              onChange={e => setEditDoc(prev => prev ? { ...prev, full_name: e.target.value } : prev)}
            />
          </div>
          <div className='grid gap-2'>
            <Label>Nombre corto</Label>
            <Input
              value={editDoc?.short_name ?? ''}
              onChange={e => setEditDoc(prev => prev ? { ...prev, short_name: e.target.value, value: e.target.value.toLowerCase()} : prev)}
            />
          </div>
          <div className='grid gap-2'>
            <Label>¿Está activo?</Label>
            <div className='flex'>
              <Toggle
                pressed={Boolean(editDoc?.active) ?? true}
                onPressedChange={pressed => setEditDoc(prev => prev ? { ...prev, active: Number(pressed) } : prev)}
                className='cursor-pointer'
              >
                {Boolean(editDoc?.active) ? 'Sí' : 'No'}
              </Toggle>
            </div>
          </div>
          <Button onClick={handleEdit} className='mt-2 w-full'>Actualizar</Button>
        </DialogContent>
      </Dialog>

      {/* Tabla */}
      <Table className='mt-12'>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Nombre corto</TableHead>
            <TableHead>Activo</TableHead>
            <TableHead className='w-24 text-right'>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {docTypes.map(doc => (
            <TableRow key={doc.id}>
              <TableCell>{doc.full_name}</TableCell>
              <TableCell>{doc.short_name}</TableCell>
              <TableCell>{doc.active ? 'Sí' : 'No'}</TableCell>
              <TableCell className='flex justify-end gap-2'>
                <Button
                className='cursor-pointer'
                  variant='ghost'
                  size='icon'
                  onClick={() => setEditDoc(doc)}
                >
                  <Pencil className='w-4 h-4' />
                </Button>
                <Button onClick={()=>handleDelete(doc)} variant='ghost' size='icon' className='text-destructive hover:text-destructive cursor-pointer'>
                  <Trash2 className='w-4 h-4' />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}