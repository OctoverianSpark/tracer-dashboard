import { useEffect, useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react'
import { animate, stagger } from 'animejs'

export const EASE = 'cubicBezier(0.22, 1, 0.36, 1)'

export const DURATIONS = {
  fadeUp: 450,
  fadeIn: 350,
  scaleIn: 350,
  staggerItem: 400,
  pageEnter: 320,
  pageExit: 200,
}

export const STAGGER = { each: 60, start: 40 }

type EnterVariant = 'fadeUp' | 'fadeIn' | 'scaleIn'

// Estado pre-animación como style inline literal (SSR-safe: ya está en el HTML antes de que
// corra JS, así que no hay flash de contenido totalmente visible como lo habría si se aplicara
// solo vía JS al montar).
export const INITIAL_STYLE: Record<EnterVariant, CSSProperties> = {
  fadeUp:  { opacity: 0, transform: 'translateY(16px)' },
  fadeIn:  { opacity: 0 },
  scaleIn: { opacity: 0, transform: 'scale(0.94)' },
}

export const STAGGER_ITEM_INITIAL_STYLE: CSSProperties = { opacity: 0, transform: 'translateY(14px)' }

// useLayoutEffect en cliente (mismo timing que antes con Motion), useEffect en SSR para evitar
// el warning de React ("useLayoutEffect does nothing on the server").
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

const VARIANT_PROPS: Record<EnterVariant, Record<string, [number, number]>> = {
  fadeUp:  { opacity: [0, 1], translateY: [16, 0] },
  fadeIn:  { opacity: [0, 1] },
  scaleIn: { opacity: [0, 1], scale: [0.94, 1] },
}

/** Anima un solo elemento al montar, desde INITIAL_STYLE[variant] hacia su estado final. */
export function useEnterAnimation<T extends HTMLElement | SVGElement>(
  ref: RefObject<T | null>,
  variant: EnterVariant,
  opts?: { delay?: number; duration?: number },
) {
  useIsomorphicLayoutEffect(() => {
    if (!ref.current) return
    const anim = animate(ref.current, {
      ...VARIANT_PROPS[variant],
      duration: opts?.duration ?? DURATIONS[variant],
      delay: opts?.delay ?? 0,
      ease: EASE,
    })
    // React 19 Strict Mode monta/desmonta/monta en desarrollo — revert() deja el elemento en su
    // estado pre-animación para que el segundo mount real anime limpio, sin arrancar a mitad.
    return () => { anim.revert() }
  }, [])
}

/**
 * Anima los hijos marcados con `data-stagger-item` (o `opts.selector`) dentro del contenedor,
 * en cascada. Reemplaza el par staggerContainer/staggerItem de Motion — cada hijo debe llevar
 * `style={STAGGER_ITEM_INITIAL_STYLE}` en el JSX para el estado pre-animación (SSR-safe).
 *
 * `opts.deps` permite re-disparar el efecto cuando se agregan más hijos sin remontar el
 * contenedor (ej. "cargar más" en una lista paginada) — un WeakSet por instancia del hook
 * recuerda qué elementos ya se animaron para no volver a animarlos ni dejarlos a mitad de
 * camino si el efecto corre de nuevo mientras el primero ya terminó.
 */
export function useStaggerChildren<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  opts?: { selector?: string; each?: number; start?: number; deps?: unknown[] },
) {
  const animatedRef = useRef<WeakSet<Element>>(new WeakSet())

  useIsomorphicLayoutEffect(() => {
    if (!containerRef.current) return
    const all = containerRef.current.querySelectorAll(opts?.selector ?? '[data-stagger-item]')
    const items = Array.from(all).filter(el => !animatedRef.current.has(el))
    if (!items.length) return
    items.forEach(el => animatedRef.current.add(el))
    animate(items, {
      opacity: [0, 1],
      translateY: [14, 0],
      duration: DURATIONS.staggerItem,
      ease: EASE,
      delay: stagger(opts?.each ?? STAGGER.each, { start: opts?.start ?? STAGGER.start }),
    })
  }, opts?.deps ?? [])
}
