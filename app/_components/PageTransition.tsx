'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { animate } from 'animejs'
import { EASE, DURATIONS } from '@/lib/animation'

interface Displayed { key: string; node: React.ReactNode }

// Reemplaza AnimatePresence (framer): un solo contenedor persiste entre navegaciones, así que
// el estilo inline que deja la animación de salida (opacity/translateY) sirve de punto de
// partida para la de entrada sin flash — no hace falta un estado "initial" explícito como en
// los demás usos de animation.ts.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)
  const latestChildren = useRef(children)
  latestChildren.current = children

  const [displayed, setDisplayed] = useState<Displayed>(() => ({ key: pathname, node: children }))
  const isFirstRender = useRef(true)

  // Ruta cambió: animar la salida del contenido actual y, al terminar, hacer el swap.
  useEffect(() => {
    if (pathname === displayed.key) return
    let cancelled = false
    const el = containerRef.current

    if (!el) {
      setDisplayed({ key: pathname, node: latestChildren.current })
      return
    }

    animate(el, {
      opacity: [1, 0],
      translateY: [0, -8],
      duration: DURATIONS.pageExit,
      ease: EASE,
    }).then(() => {
      // Si mientras salía llegó otra navegación más reciente, esta corrida quedó obsoleta —
      // el swap lo hace la corrida vigente, no esta.
      if (!cancelled) setDisplayed({ key: pathname, node: latestChildren.current })
    })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // El contenido mostrado cambió: animar la entrada (salvo la carga inicial, igual que
  // AnimatePresence initial={false}).
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    const el = containerRef.current
    if (!el) return
    animate(el, {
      opacity: [0, 1],
      translateY: [8, 0],
      duration: DURATIONS.pageEnter,
      ease: EASE,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayed.key])

  return <div ref={containerRef}>{displayed.node}</div>
}
