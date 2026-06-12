'use client'
import { FlatAppUsageLog } from '@/types/AppUser'
import { FileDown } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Props {
  logs: FlatAppUsageLog[]
  ignoredApps?: Set<string>
}

function exportXLSX(logs: FlatAppUsageLog[]) {
  const rows = logs.map(l => ({
    'Aplicación': l.app,
    'Duración':   fmtSecs(l.seconds),
    'Segundos':   l.seconds,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: 2 } }) }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Uso de apps')
  XLSX.writeFile(wb, `uso_apps_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

const fmtSecs = (s: number) => {
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

export default function AppUsageList({ logs, ignoredApps }: Props) {
  const sorted = logs
    .filter(l => l.app != null && !ignoredApps?.has(l.app.toLowerCase()))
    .sort((a, b) => b.seconds - a.seconds)

  if (sorted.length === 0) {
    return (
      <p className='text-center text-sm text-muted-foreground py-6'>
        No hay registros de uso de aplicaciones para esta fecha.
      </p>
    )
  }

  const total = sorted.reduce((s, l) => s + l.seconds, 0)

  return (
    <div className='space-y-2'>
      <div className='flex justify-end'>
        <button
          onClick={() => exportXLSX(sorted)}
          className='flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border bg-muted/40 hover:bg-muted transition-colors cursor-pointer'
        >
          <FileDown className='size-3.5' />
          Exportar
        </button>
      </div>
      {sorted.map(l => {
        const pct = total > 0 ? (l.seconds / total) * 100 : 0
        return (
          <div key={crypto.randomUUID()} className='space-y-1'>
            <div className='flex items-center justify-between gap-2'>
              <span className='font-mono text-sm truncate min-w-0'>{l.app}</span>
              <span className='text-sm text-muted-foreground shrink-0'>{fmtSecs(l.seconds)}</span>
            </div>
            <div className='h-1.5 rounded-full bg-secondary overflow-hidden'>
              <div className='h-full rounded-full bg-primary/50' style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}