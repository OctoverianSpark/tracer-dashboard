import SettingsTabs from '@/components/SettingsSections/Navigation/SettingsTabs'
import React from 'react'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='relative'>
      <SettingsTabs />
      <div className='flex-1 overflow-auto p-6'>
        {children}
      </div>
    </div>
  )
}