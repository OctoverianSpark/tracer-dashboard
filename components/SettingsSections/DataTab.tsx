'use client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/_components/_ui/tabs'
import { Database, UserIcon } from 'lucide-react'
import React from 'react'

export default function DataTab () {
  return (
    <div>
      
      <Tabs>
        <TabsList className='rounded-full py-4'>
          <TabsTrigger value='emails' className='rounded-full p-4 cursor-pointer'>

            <UserIcon />
            appuser
          </TabsTrigger>
          <TabsTrigger value='data' className='rounded-full p-4 cursor-pointer'>
            <Database />
            Equipos
          </TabsTrigger>
        </TabsList>
        <TabsContent value='email'>
          
        </TabsContent>
        <TabsContent value='data'>
        </TabsContent>
      </Tabs>

    </div>
  )
}
