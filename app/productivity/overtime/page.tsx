import OvertimeReport from '@/components/Productivity/OvertimeReport'

export default function Page() {
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Horas Extra</h1>
        <p className="text-sm text-muted-foreground">
          Actividad detectada después de la hora de salida programada de cada persona.
        </p>
      </div>
      <OvertimeReport />
    </div>
  )
}
