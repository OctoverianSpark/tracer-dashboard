import { cn } from '@/app/_components/_lib/utils'

interface Props {
  size?: number
  className?: string
}

const PATH = 'M 50,25 C 60,5 90,5 90,25 C 90,45 60,45 50,25 C 40,5 10,5 10,25 C 10,45 40,45 50,25 Z'

export default function InfinitySpinner({ size = 56, className }: Props) {
  return (
    <svg
      width={size}
      height={size * 0.52}
      viewBox="0 0 100 52"
      fill="none"
      aria-label="Cargando"
      className={cn('text-primary', className)}
    >
      {/* track */}
      <path
        d={PATH}
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="100"
        opacity="0.15"
      />
      {/* arco animado */}
      <path
        d={PATH}
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="100"
        strokeDasharray="28 72"
        className="infinity-dash"
      />
    </svg>
  )
}
