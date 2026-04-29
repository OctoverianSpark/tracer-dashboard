'use client'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/app/_components/_ui/sidebar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/app/_components/_ui/dropdown-menu'
import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Asset {
  name: string
  assetId: number
  downloadUrl: string
}

interface Release {
  tag_name: string
  html_url: string
  assets: Asset[]
}

export function LatestRelease() {
  const [release, setRelease] = useState<Release | null>(null)

  useEffect(() => {
    fetch('/api/releases/latest')
      .then(r => r.json())
      .then(data => data && setRelease(data))
      .catch(() => {})
  }, [])

  if (!release) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className='cursor-pointer'>
              <Download className='size-4 shrink-0' />
              <span>Actimetrics {release.tag_name}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side='right' align='end' className='w-56'>
            <DropdownMenuLabel>Descargar Actimetrics {release.tag_name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {release.assets.length > 0 ? (
              release.assets.map(asset => {
                const ext = asset.name.split('.').pop()?.toLowerCase() ?? ''
                return (
                  <DropdownMenuItem key={asset.assetId} asChild>
                    <a href={asset.downloadUrl} download={asset.name}>
                      <Download className='size-4' />
                      Instalar como .{ext}
                    </a>
                  </DropdownMenuItem>
                )
              })
            ) : (
              <DropdownMenuItem asChild>
                <a href={release.html_url} target='_blank' rel='noopener noreferrer'>
                  <Download className='size-4' />
                  Ver release en GitHub
                </a>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}