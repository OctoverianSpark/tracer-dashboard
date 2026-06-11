'use client'
import { motion, useAnimate } from 'framer-motion'
import { AnimatedInfinityLogo } from './AnimatedLogo'
import { useEffect, useState } from 'react'

interface Props { height?: number }

export function TracerLogo({ height = 64 }: Props) {
  const dotR = Math.round(height * 0.08)
  const [scope, animate] = useAnimate()
  const [showRipples, setShowRipples] = useState(false)

  useEffect(() => {
    const run = async () => {
      // Phase 1: "tracer" text slides up and fades in
      await animate(
        '.tracer-text',
        { opacity: [0, 1], y: [10, 0] },
        { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
      )

      // Phase 2: dot flies through with smear — stretch during travel, squash on landing
      await animate(
        '.dot-ball',
        {
          x:      [-(height * 4.2), -(height * 0.8), 0,    0   ],
          scaleX: [1,                3.0,             0.72, 1   ],
          scaleY: [1,                0.60,            1.28, 1   ],
        },
        {
          duration: 0.6,
          times:    [0, 0.35, 0.82, 1],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ease:     [[0.16, 1, 0.3, 1], 'easeOut', 'easeOut'] as any,
        }
      )

      // Phase 3: one-time big arrival pulse
      await animate(
        '.dot-pulse',
        { scale: [1, 9], opacity: [0.9, 0] },
        { duration: 0.5, ease: 'easeOut' }
      )

      // Phase 4: small repeating ripples
      setShowRipples(true)
    }
    run()
  }, [animate, height])

  return (
    <div ref={scope} className="flex items-center" style={{ height }}>

      <AnimatedInfinityLogo height={height} speed={3} />

      {/* Text starts hidden — animated in first */}
      <span
        className="tracer-text font-sans font-bold leading-none select-none text-[#6633CA]"
        style={{ opacity: 0, fontSize: height * 0.68, marginLeft: height * 0.02 }}
      >
        tracer
      </span>

      <div
        className="relative flex items-center justify-center flex-shrink-0"
        style={{ width: dotR * 10, height: dotR * 10, marginLeft: height * 0.005 }}
      >
        {/* One-time big pulse on arrival */}
        <motion.div
          className="dot-pulse absolute rounded-full border-2 border-[#FD2A9E]"
          style={{ width: dotR * 2, height: dotR * 2 }}
          initial={{ scale: 1, opacity: 0 }}
        />

        {/* Small repeating ripples — mount after entrance */}
        {showRipples && [0, 0.85, 1.7].map((delay, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border-[1.5px] border-[#FD2A9E]"
            style={{ width: dotR * 2, height: dotR * 2 }}
            animate={{ scale: [1, 1, 3.8, 3.8], opacity: [0, 0.65, 0, 0] }}
            transition={{
              times:    [0, 0.06, 0.68, 1],
              duration: 2.4,
              repeat:   Infinity,
              delay,
              ease:     'easeOut',
            }}
          />
        ))}

        {/* Solid dot — starts far left, flies in after text appears */}
        <motion.div
          className="dot-ball relative z-10 rounded-full bg-[#FD2A9E]"
          style={{ width: dotR * 2, height: dotR * 2 }}
          initial={{ x: -(height * 4.2) }}
        />
      </div>

    </div>
  )
}
