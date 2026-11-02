import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
})

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem('aji_theme')
      if (saved === 'light' || saved === 'dark') return saved
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark'
      }
    } catch {}
    return 'light'
  })

  useEffect(() => {
    try {
      const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')
      if (!mq) return
      const handler = (e) => {
        try {
          const saved = localStorage.getItem('aji_theme')
          if (!saved) {
            setThemeState(e.matches ? 'dark' : 'light')
          }
        } catch {}
      }
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }

      const metaThemeColor = document.querySelector('meta[name="theme-color"]')
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#101211' : '#F7F8F5')
      }
    } catch {}
  }, [theme])

  const setTheme = (nextTheme) => {
    if (nextTheme !== 'light' && nextTheme !== 'dark') return
    try {
      localStorage.setItem('aji_theme', nextTheme)
    } catch {}
    setThemeState(nextTheme)
  }

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  const value = {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export default ThemeContext
