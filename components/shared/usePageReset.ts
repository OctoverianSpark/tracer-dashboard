import { useState } from 'react'

/**
 * Vuelve a la página 1 cuando `key` cambia respecto al render anterior — ajuste de estado
 * durante el render (patrón recomendado por React para "resetear estado cuando cambia una
 * prop"), no vía `useEffect` — un `useEffect(() => setPage(1), [deps])` dispara un render de
 * más y lo marca el linter (`react-hooks/set-state-in-effect`).
 */
export function useResetPageOnChange(key: unknown, setPage: (page: number) => void) {
  const [prevKey, setPrevKey] = useState(key)
  if (key !== prevKey) {
    setPrevKey(key)
    setPage(1)
  }
}
