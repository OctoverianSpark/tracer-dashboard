'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginatorProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

function pageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  if (current > 3) pages.push('…')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}

export default function Paginator({ page, totalPages, total, pageSize, onPageChange }: PaginatorProps) {
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className='flex items-center justify-between gap-4 pt-2'>
      <span className='text-xs text-muted-foreground'>
        {from}–{to} de {total}
      </span>
      <div className='flex items-center gap-1'>
        <button
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className='p-1.5 rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors'
        >
          <ChevronLeft className='size-4' />
        </button>
        {pageRange(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className='px-1.5 text-muted-foreground text-sm'>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-8 h-8 text-sm rounded border transition-colors cursor-pointer
                ${page === p
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted'
                }`}
            >
              {p}
            </button>
          )
        )}
        <button
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          className='p-1.5 rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors'
        >
          <ChevronRight className='size-4' />
        </button>
      </div>
    </div>
  )
}
