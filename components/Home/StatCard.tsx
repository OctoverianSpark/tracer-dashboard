// app/_components/StatCard.tsx - puede ser Server Component también
import { Card, CardContent } from '@/app/_components/_ui/card'
import { LucideIcon } from 'lucide-react'


interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
}

export default function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className='pt-6'>
        <div className='flex items-center gap-3'>
          <div className='p-2 rounded-md bg-primary/10'>
            <Icon className='size-4 text-primary' />
          </div>
          <div>
            <p className='text-xs text-muted-foreground'>{label}</p>
            <p className='text-xl font-semibold'>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}