import React from 'react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../_components/_ui/tabs'
import { Database, User } from 'lucide-react'
import UserTab from '@/components/SettingsSections/UserTab'
import DataTab from '@/components/SettingsSections/DataTab'

export default function page () {
  return (
    <div>
      <Tabs>
        <TabsList className='rounded-full py-4'>
          <TabsTrigger value='user' className='rounded-full p-4 cursor-pointer'>
            <User />
            User
          </TabsTrigger>
          <TabsTrigger value='data' className='rounded-full p-4 cursor-pointer'>
            <Database />
            Data
          </TabsTrigger>
        </TabsList>
        <TabsContent value='user'>
          <UserTab />
        </TabsContent>
        <TabsContent value='data'>
          <DataTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
