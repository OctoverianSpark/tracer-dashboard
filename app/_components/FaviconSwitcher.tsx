'use client'
import { useTheme } from 'next-themes'
import { useEffect } from 'react'

export function FaviconSwitcher() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (!resolvedTheme) return
    const href = resolvedTheme === 'light' ? '/favicon-light.ico' : '/favicon-dark.ico'
    // Next.js can render "icon", "shortcut icon", or both — update all of them
    document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]').forEach(link => {
      link.href = href
    })
  }, [resolvedTheme])

  return null
}
