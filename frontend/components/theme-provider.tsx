'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Add this state to track client-side mounting
  const [mounted, setMounted] = React.useState(false)
  
  // Only run this effect on the client
  React.useEffect(() => {
    setMounted(true)
  }, [])
  
  // If not mounted yet, render children without theme context
  // This prevents hydration mismatch by not rendering any theme classes during SSR
  if (!mounted) {
    return <>{children}</>
  }
  
  // Once mounted on client, render with theme provider
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
