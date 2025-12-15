import { useState, useEffect } from 'react'

/**
 * Hook مخصص لإدارة الثيم
 * يقرأ الثيم من localStorage و document ويتابع التغييرات
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  })

  useEffect(() => {
    // قراءة الثيم من localStorage أولاً
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
    
    // ثم قراءة من document إذا كان موجوداً
    if (typeof document !== 'undefined' && document.documentElement) {
      const currentTheme = document.documentElement.getAttribute('data-theme') || savedTheme
      if (currentTheme !== savedTheme) {
        setTheme(currentTheme)
      }
      
      const observer = new MutationObserver(() => {
        const newTheme = document.documentElement.getAttribute('data-theme') || 'dark'
        setTheme(newTheme)
      })
      
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      })
      
      return () => observer.disconnect()
    }
  }, [])

  // تطبيق الثيم على document عند تغييره
  useEffect(() => {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem('theme', theme)
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return { theme, setTheme, toggleTheme }
}

