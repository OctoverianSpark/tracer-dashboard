'use client'
import { useEffect, useRef } from 'react'
import { animate, createSpring } from 'animejs'
import { EASE } from '@/lib/animation'

// ∞ center-line
const INF_PATH =
  'M 160,80 C 160,30 80,30 80,80 C 80,130 160,130 160,80 C 160,30 240,30 240,80 C 240,130 160,130 160,80'

// "tracer" text: x=268, textLength=358 → dot at x = 268+358+12 = 638
const TEXT_X      = 268
const TEXT_LENGTH = 358   // forced width so dot position is predictable
const DOT_X       = TEXT_X + TEXT_LENGTH + 14
const DOT_Y       = 108   // sits on the text baseline

interface Props { height?: number }

export function TracerLogoAnimated({ height = 80 }: Props) {
  const infPathRef = useRef<SVGPathElement>(null)
  const ringRef     = useRef<SVGGElement>(null)
  const textRef     = useRef<SVGTextElement>(null)
  const rippleRefs  = useRef<(SVGCircleElement | null)[]>([])
  const dotRef      = useRef<SVGCircleElement>(null)

  // ── Ball 1: ring que recorre el ∞ (para siempre) — escritura directa de transform en cada
  // frame, sin pasar por el motor de animejs (igual que AnimatedLogo.tsx) ────────────────────
  useEffect(() => {
    let rafId = 0
    let start = 0
    const tick = (t: number) => {
      if (!start) start = t
      const path = infPathRef.current
      const ring = ringRef.current
      if (path && ring) {
        const len  = path.getTotalLength()
        const dist = (((t - start) / 4000) % 1) * len
        const { x, y } = path.getPointAtLength(dist)
        const ahead = path.getPointAtLength((dist + 4) % len)
        const rot = Math.atan2(ahead.y - y, ahead.x - x) * (180 / Math.PI)
        ring.setAttribute('transform', `translate(${x},${y}) rotate(${rot})`)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // ── Texto "tracer": fade-in único ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!textRef.current) return
    const anim = animate(textRef.current, { opacity: [0, 1], duration: 500, delay: 300, ease: EASE })
    return () => { anim.revert() }
  }, [])

  // ── Anillos de "ripple" — se repiten para siempre, desfasados entre sí ─────────────────────
  useEffect(() => {
    const anims = rippleRefs.current.filter((el): el is SVGCircleElement => el != null).map((el, i) =>
      animate(el, {
        opacity: [0.85, 0],
        scale: [1, 5.5],
        duration: 5000,
        loop: true,
        delay: 1200 + i * 900, // arranca después de que el logo termine de aparecer
        ease: 'outQuad',
      })
    )
    return () => { anims.forEach(a => a.revert()) }
  }, [])

  // ── Punto sólido — entrada (única) + levitación (infinita) + rebote de resorte ─────────────
  // `loop`/`alternate` son de toda la llamada a animate(), no por propiedad — por eso son dos
  // llamadas separadas sobre el mismo elemento (una para cy en loop, otra de una sola vez).
  useEffect(() => {
    if (!dotRef.current) return
    const entrance = animate(dotRef.current, {
      opacity: { from: 0, to: 1, duration: 300, delay: 500 },
      scale: { from: 0, to: 1, delay: 500, ease: createSpring({ stiffness: 260, damping: 18 }) },
    })
    const levitate = animate(dotRef.current, {
      cy: [DOT_Y - 4, DOT_Y + 4],
      duration: 2200,
      loop: true,
      alternate: true,
      ease: 'inOutSine',
      delay: 1000,
    })
    return () => { entrance.revert(); levitate.revert() }
  }, [])

  return (
    // viewBox tight around the full logo
    // x: 55 (∞ left edge) to 660 (dot + ripple room) → width 605
    // y: 18 (∞ top) to 142 (∞ bottom)               → height 124
    <svg
      viewBox="55 18 605 124"
      height={height}
      width={height * (605 / 124)}
      xmlns="http://www.w3.org/2000/svg"
      overflow="visible"
    >
      {/* Hidden reference path for rAF */}
      <path ref={infPathRef} d={INF_PATH} fill="none" stroke="none" />

      {/* ∞ body */}
      <path
        d={INF_PATH}
        fill="none"
        stroke="#6633CA"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* "tracer" wordmark — textLength forces predictable width */}
      <text
        ref={textRef}
        x={TEXT_X}
        y={112}
        textLength={TEXT_LENGTH}
        lengthAdjust="spacingAndGlyphs"
        fill="#6633CA"
        style={{
          fontFamily: 'var(--font-outfit), Outfit, sans-serif',
          fontSize: '88px',
          fontWeight: 700,
          opacity: 0,
        }}
      >
        tracer
      </text>

      {/* ── Ball 1: oval ring riding the ∞ ── */}
      <g ref={ringRef}>
        <ellipse rx="20" ry="12" fill="#FD2A9E" />
        <ellipse rx="10" ry="6"  fill="#6633CA" />
      </g>

      {/* ── Ball 2: dot on the right — independent ── */}

      {/* Ripple rings */}
      {[0, 1, 2].map(i => (
        <circle
          key={i}
          ref={el => { rippleRefs.current[i] = el }}
          cx={DOT_X}
          cy={DOT_Y}
          r={10}
          fill="none"
          stroke="#FD2A9E"
          strokeWidth="1.5"
          style={{ opacity: 0.85, transform: 'scale(1)' }}
        />
      ))}

      {/* Solid dot — floats up/down */}
      <circle
        ref={dotRef}
        cx={DOT_X}
        cy={DOT_Y}
        r={10}
        fill="#FD2A9E"
        style={{ opacity: 0, transform: 'scale(0)' }}
      />
    </svg>
  )
}
