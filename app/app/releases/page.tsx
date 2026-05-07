import ReleasePanel from '@/components/ReleasesManager/ReleasePanel'
import { getReleaseInfo } from './actions'

export default async function Page() {
  const info = await getReleaseInfo()

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Actualizaciones del agente</h1>
      <ReleasePanel initialInfo={info} />
    </div>
  )
}
