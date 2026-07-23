'use client'
import { useEffect, useRef } from 'react'

const PATH = "M 160,80 C 160,30 80,30 80,80 C 80,130 160,130 160,80 C 160,30 240,30 240,80 C 240,130 160,130 160,80"

interface Props {
  height?: number
  speed?: number
  className?: string
}

export function AnimatedInfinityLogo({ height = 32, speed = 4, className }: Props) {
  const pathRef = useRef<SVGPathElement>(null)
  const ringRef = useRef<SVGGElement>(null)

  useEffect(() => {
    let rafId = 0
    const tick = (t: number) => {
      const path = pathRef.current
      const ring = ringRef.current
      if (path && ring) {
        const len   = path.getTotalLength()
        const pct   = (t / (speed * 1000)) % 1
        const { x, y } = path.getPointAtLength(pct * len)
        ring.setAttribute('transform', `translate(${x},${y})`)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [speed])

  return (
    <svg
      viewBox="52 4 216 158"
      height={height}
      width={height * (216 / 152)}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path ref={pathRef} d={PATH} fill="none" stroke="none" />

      <path
        d={PATH}
        fill="none"
        stroke="#6633CA"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <g ref={ringRef}>
        <circle r="20" fill="#FD2A9E" />
        <circle r="10" fill="#6633CA" />
      </g>
    </svg>
  )
}
