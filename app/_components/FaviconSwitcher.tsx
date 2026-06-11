'use client'
import { useTheme } from 'next-themes'
import { useEffect } from 'react'

export function FaviconSwitcher() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) return
    link.href = resolvedTheme === 'light' ? '/favicon-light.ico' : '/favicon-dark.ico'
  }, [resolvedTheme])

  return null
}
