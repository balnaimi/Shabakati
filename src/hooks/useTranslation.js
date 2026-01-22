import { useLanguage } from '../contexts/LanguageContext'
import arTranslations from '../locales/ar.json'
import enTranslations from '../locales/en.json'

const translations = {
  ar: arTranslations,
  en: enTranslations
}

export function useTranslation() {
  const { language } = useLanguage()

  const t = (key, params = {}) => {
    const keys = key.split('.')
    let value = translations[language]

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k]
      } else {
        // Fallback to Arabic if key not found
        value = translations.ar
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object') {
            value = value[fallbackKey]
          } else {
            return key // Return key if translation not found
          }
        }
        break
      }
    }

    if (typeof value !== 'string') {
      return key // Return key if translation not found
    }

    // Replace parameters in translation string
    let translated = value
    Object.keys(params).forEach(param => {
      translated = translated.replace(`{{${param}}}`, params[param])
    })

    return translated
  }

  return { t, language }
}
