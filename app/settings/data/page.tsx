'use client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/_components/_ui/tabs'
import DocumentTypeSettings from '@/components/SettingsSections/PersonalSettings/DocumentTypeSettings'
import MailLackTable from '@/components/SettingsSections/PersonalSettings/MailLackTable'
import ModalityManager from '@/components/SettingsSections/PersonalSettings/ModalityManager'
import React, { useState } from 'react'


const PERSONAL_SECTIONS = [
  {value:'mail',label:'Agregar correos'},
  {value:'docs',label:'Modificar tipos de documento'},
  {value:'modes',label: 'Registrar Modalidades'}
]

function renderSection(menu: string) {
  switch (menu) {
    case 'mail': return <MailLackTable />
    case 'docs': return <DocumentTypeSettings/>
    case 'modes': return <ModalityManager/>
    default: return null
  }
}



export default function page() {

  const [menu, setMenu] = useState('')


  return (
    <Tabs>
      <TabsList className=''>
        <TabsTrigger value='personal'>
          Personal
        </TabsTrigger>
        <TabsTrigger value='equipos'>
          Equipos
        </TabsTrigger>
      </TabsList> 

      <TabsContent value='personal'>
        <Select onValueChange={(val)=>setMenu(val)} value={menu} >
          <SelectTrigger>
            <SelectValue placeholder='Selecciona una accion' />
          </SelectTrigger>
          <SelectContent>

            {PERSONAL_SECTIONS.map((section)=>(
              <SelectItem value={section.value}>{section.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {
          renderSection(menu)
        }
      </TabsContent>
      <TabsContent value='equipos'>
      </TabsContent>
    </Tabs>
  )
}
