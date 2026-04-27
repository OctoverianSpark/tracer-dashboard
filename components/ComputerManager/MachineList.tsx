import { Machine } from '@/types/Machine'
import MachineCard from './MachineCard'

interface MachineListProps {
  machines: Machine[]
}

export default function MachineList({ machines }: MachineListProps) {
  if (machines.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-12">
        No hay equipos registrados.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {machines.map(pc => (
        <MachineCard machine={pc} key={pc.serial_number} />
      ))}
    </div>
  )
}
