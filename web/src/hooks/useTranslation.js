import { useCallback, useMemo } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import arTranslations from '../locales/ar.json'
import enTranslations from '../locales/en.json'

const translations = {
  ar: arTranslations,
  en: enTranslations
}

/**
 * Get nested value from object using dot notation key
 * @param {Object} obj - Object to search
 * @param {string[]} keys - Array of keys
 * @returns {any} - The value or undefined
 */
function getNestedValue(obj, keys) {
  let value = obj
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k]
    } else {
      return undefined
    }
  }
  return value
}

/**
 * Replace template parameters in string
 * @param {string} str - String with {{param}} placeholders
 * @param {Object} params - Object with param values
 * @returns {string} - String with replaced values
 */
function replaceParams(str, params) {
  if (!params || Object.keys(params).length === 0) {
    return str
  }
  
  let result = str
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
  }
  return result
}

/**
 * Custom hook for translations with memoization
 * @returns {{ t: Function, language: string }}
 */
export function useTranslation() {
  const { language } = useLanguage()

  // Memoize the current translations object
  const currentTranslations = useMemo(() => translations[language], [language])
  const fallbackTranslations = useMemo(() => translations.ar, [])

  // Memoize the translation function
  const t = useCallback((key, params = {}) => {
    if (!key) return ''
    
    const keys = key.split('.')
    
    // Try current language first
    let value = getNestedValue(currentTranslations, keys)
    
    // Fallback to Arabic if not found
    if (value === undefined) {
      value = getNestedValue(fallbackTranslations, keys)
    }
    
    // Return key if translation not found
    if (typeof value !== 'string') {
      return key
    }

    // Replace parameters in translation string
    return replaceParams(value, params)
  }, [currentTranslations, fallbackTranslations])

  // Return memoized object
  return useMemo(() => ({ t, language }), [t, language])
}
