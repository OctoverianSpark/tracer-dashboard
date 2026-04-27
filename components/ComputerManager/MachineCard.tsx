import { Card, CardContent, CardHeader, CardTitle } from '@/app/_components/_ui/card'
import { Badge } from '@/app/_components/_ui/badge'
import { Machine } from '@/types/Machine'
import MachineDialog from './MachineDialog'

interface CardMachineProps {
  machine: Machine
}

export default function MachineCard({ machine }: CardMachineProps) {
  return (
    <Card className={`flex flex-col border-2 transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer
      ${machine.isAlive ? 'border-green-500' : 'border-red-500'}`}
    >
      <CardHeader className="w-full text-center pb-2">
        <CardTitle className="text-xl truncate">{machine.hostname}</CardTitle>
        <p className="text-sm text-muted-foreground">{machine.ip_address ?? 'Sin IP'}</p>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <Badge variant={machine.isAlive ? 'default' : 'destructive'}>
          {machine.isAlive ? '🟢 Online' : '🔴 Offline'}
        </Badge>
        <MachineDialog machine={machine} />
      </CardContent>
    </Card>
  )
}
