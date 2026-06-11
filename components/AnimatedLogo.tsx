'use client'
import { useRef } from 'react'
import { useAnimationFrame } from 'framer-motion'

const PATH = "M 160,80 C 160,30 80,30 80,80 C 80,130 160,130 160,80 C 160,30 240,30 240,80 C 240,130 160,130 160,80"

interface Props {
  height?: number
  speed?: number
  className?: string
}

export function AnimatedInfinityLogo({ height = 32, speed = 4, className }: Props) {
  const pathRef = useRef<SVGPathElement>(null)
  const ringRef = useRef<SVGGElement>(null)

  useAnimationFrame((t) => {
    if (!pathRef.current || !ringRef.current) return
    const len   = pathRef.current.getTotalLength()
    const pct   = (t / (speed * 1000)) % 1
    const { x, y } = pathRef.current.getPointAtLength(pct * len)
    ringRef.current.setAttribute('transform', `translate(${x},${y})`)
  })

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
