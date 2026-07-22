import ProductivityReport from '@/components/Productivity/ProductivityReport'

export default function Page() {
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Cumplimiento y Productividad</h1>
        <p className="text-sm text-muted-foreground">
          Reporte detallado por usuario: cumplimiento de jornada, productividad y desglose de apps.
        </p>
      </div>
      <ProductivityReport />
    </div>
  )
}
