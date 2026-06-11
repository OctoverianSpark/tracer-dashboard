'use client'
import { useEffect, useRef } from 'react'
import { motion, useMotionValue } from 'framer-motion'

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
  const rafRef     = useRef<number>(0)

  // ── Ball 1: ring that travels the ∞ (runs forever) ──────────────────────────
  const b1x   = useMotionValue(160)
  const b1y   = useMotionValue(80)
  const b1rot = useMotionValue(0)

  useEffect(() => {
    let start = 0
    const tick = (t: number) => {
      if (!start) start = t
      const path = infPathRef.current
      if (!path) { rafRef.current = requestAnimationFrame(tick); return }
      const len  = path.getTotalLength()
      const dist = (((t - start) / 4000) % 1) * len
      const { x, y } = path.getPointAtLength(dist)
      const ahead     = path.getPointAtLength((dist + 4) % len)
      b1x.set(x)
      b1y.set(y)
      b1rot.set(Math.atan2(ahead.y - y, ahead.x - x) * (180 / Math.PI))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [b1x, b1y, b1rot])

  // ── Ball 2: dot on the right — entrance + levitate + ripple ─────────────────
  // (just a motion.circle, animated declaratively — no rAF needed)

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
      <motion.text
        x={TEXT_X}
        y={112}
        textLength={TEXT_LENGTH}
        lengthAdjust="spacingAndGlyphs"
        fill="#6633CA"
        style={{
          fontFamily: 'var(--font-outfit), Outfit, sans-serif',
          fontSize: '88px',
          fontWeight: 700,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        tracer
      </motion.text>

      {/* ── Ball 1: oval ring riding the ∞ ── */}
      <motion.g style={{ x: b1x, y: b1y, rotate: b1rot }}>
        <ellipse rx="20" ry="12" fill="#FD2A9E" />
        <ellipse rx="10" ry="6"  fill="#6633CA" />
      </motion.g>

      {/* ── Ball 2: dot on the right — independent ── */}

      {/* Ripple rings */}
      {[0, 0.9, 1.8].map((delay, i) => (
        <motion.circle
          key={i}
          cx={DOT_X}
          fill="none"
          stroke="#FD2A9E"
          strokeWidth="1.5"
          initial={{ cy: DOT_Y, r: 10, opacity: 0.85, scale: 1 }}
          animate={{ r: 10, opacity: 0, scale: 5.5 }}
          transition={{
            duration: 5,
            repeat: Infinity,
            delay: 1.2 + delay,   // start after logo fades in
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Solid dot — floats up/down */}
      <motion.circle
        cx={DOT_X}
        r={10}
        fill="#FD2A9E"
        initial={{ cy: DOT_Y, opacity: 0, scale: 0 }}
        animate={{ cy: [DOT_Y - 4, DOT_Y + 4], opacity: 1, scale: 1 }}
        transition={{
          cy:      { duration: 2.2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: 1 },
          opacity: { duration: 0.3, delay: 0.5 },
          scale:   { type: 'spring', stiffness: 260, damping: 18, delay: 0.5 },
        }}
      />
    </svg>
  )
}
