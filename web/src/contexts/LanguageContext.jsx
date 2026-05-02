import { createContext, useContext, useState, useEffect } from 'react'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  // Get initial language from localStorage or default to Arabic
  const getInitialLanguage = () => {
    const savedLanguage = localStorage.getItem('language')
    if (savedLanguage && (savedLanguage === 'ar' || savedLanguage === 'en')) {
      return savedLanguage
    }
    return 'ar' // Default to Arabic
  }

  const [language, setLanguage] = useState(getInitialLanguage)

  useEffect(() => {
    // Update HTML lang and dir attributes
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    localStorage.setItem('language', language)
  }, [language])

  const value = {
    language,
    setLanguage,
    isRTL: language === 'ar',
    isLTR: language === 'en'
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
