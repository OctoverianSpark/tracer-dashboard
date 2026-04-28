'use client'
import { Machine } from '@/types/Machine'
import MachineCard from './MachineCard'
import { deleteComputer } from '@/app/computers/actions'

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
  const deleteMachine = (serial: string) => {
    deleteComputer(serial)
    console.log(`Eliminar máquina con serial: ${serial}`)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {machines.map(pc => (
        <MachineCard onDelete={deleteMachine} machine={pc} key={pc.serial_number} />
      ))}
    </div>
  )
}
