'use client'
import { animate, createTimeline } from 'animejs'
import { EASE } from '@/lib/animation'
import { AnimatedInfinityLogo } from './AnimatedLogo'
import { useEffect, useRef, useState } from 'react'

interface Props { height?: number }

export function TracerLogo({ height = 64 }: Props) {
  const dotR = Math.round(height * 0.08)
  const [showRipples, setShowRipples] = useState(false)

  const textRef     = useRef<HTMLSpanElement>(null)
  const dotBallRef   = useRef<HTMLDivElement>(null)
  const dotPulseRef  = useRef<HTMLDivElement>(null)
  const rippleRefs   = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!textRef.current || !dotBallRef.current || !dotPulseRef.current) return

    const tl = createTimeline({ defaults: { ease: EASE } })
      // Phase 1: text slides up and fades in
      .add(textRef.current, { opacity: [0, 1], translateY: [10, 0], duration: 450 })
      // Phase 2: dot flies through with smear — stretch during travel, squash on landing.
      // El times:[0,0.35,0.82,1] de Motion se traduce a keyframes por porcentaje; a diferencia
      // de Motion, acá un solo ease aplica a todo el tramo (no uno distinto por segmento).
      .add(dotBallRef.current, {
        keyframes: {
          '0%':   { translateX: -(height * 4.2), scaleX: 1,    scaleY: 1    },
          '35%':  { translateX: -(height * 0.8), scaleX: 3.0,  scaleY: 0.60 },
          '82%':  { translateX: 0,                scaleX: 0.72, scaleY: 1.28 },
          '100%': { translateX: 0,                scaleX: 1,    scaleY: 1    },
        },
        duration: 600,
      })
      // Phase 3: one-time big arrival pulse
      .add(dotPulseRef.current, { scale: [1, 9], opacity: [0.9, 0], duration: 500, ease: 'outQuad' })

    tl.then(() => setShowRipples(true))

    return () => { tl.revert() }
  }, [height])

  // Ripples: loop infinito, arranca solo tras showRipples (fin de la secuencia de arriba)
  useEffect(() => {
    if (!showRipples) return
    const anims = rippleRefs.current.filter((el): el is HTMLDivElement => el != null).map((el, i) =>
      animateRipple(el, i * 850)
    )
    return () => { anims.forEach(a => a.revert()) }
  }, [showRipples])

  return (
    <div className="flex items-center" style={{ height }}>

      <AnimatedInfinityLogo height={height} speed={3} />

      <span
        ref={textRef}
        className="font-sans font-bold leading-none select-none text-[#6633CA]"
        style={{ opacity: 0, fontSize: height * 0.68, marginLeft: height * 0.02 }}
      >
        tracer
      </span>

      <div
        className="relative flex items-center justify-center flex-shrink-0"
        style={{ width: dotR * 10, height: dotR * 10, marginLeft: height * 0.005 }}
      >
        <div
          ref={dotPulseRef}
          className="absolute rounded-full border-2 border-[#FD2A9E]"
          style={{ width: dotR * 2, height: dotR * 2, opacity: 0 }}
        />

        {showRipples && [0, 1, 2].map(i => (
          <div
            key={i}
            ref={el => { rippleRefs.current[i] = el }}
            className="absolute rounded-full border-[1.5px] border-[#FD2A9E]"
            style={{ width: dotR * 2, height: dotR * 2, opacity: 0 }}
          />
        ))}

        <div
          ref={dotBallRef}
          className="relative z-10 rounded-full bg-[#FD2A9E]"
          style={{ width: dotR * 2, height: dotR * 2, transform: `translateX(${-(height * 4.2)}px)` }}
        />
      </div>

    </div>
  )
}

// Motion: times:[0, 0.06, 0.68, 1] — mismo criterio de keyframes por porcentaje que arriba.
function animateRipple(el: HTMLDivElement, delay: number) {
  return animate(el, {
    keyframes: {
      '0%':   { scale: 1,   opacity: 0    },
      '6%':   { scale: 1,   opacity: 0.65 },
      '68%':  { scale: 3.8, opacity: 0    },
      '100%': { scale: 3.8, opacity: 0    },
    },
    duration: 2400,
    loop: true,
    delay,
    ease: 'outQuad',
  })
}
