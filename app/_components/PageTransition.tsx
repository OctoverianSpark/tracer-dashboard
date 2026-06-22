'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { pageVariants } from '@/lib/motion'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode='wait' initial={false}>
      <motion.div
        key={pathname}
        initial='initial'
        animate='animate'
        exit='exit'
        variants={pageVariants}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
