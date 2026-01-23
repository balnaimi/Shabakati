import { useLanguage } from '../contexts/LanguageContext'

function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar')
  }

  const label = language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'

  return (
    <button
      onClick={toggleLanguage}
      className="language-toggle"
      title={label}
      aria-label={label}
    >
      {language === 'ar' ? 'EN' : 'ع'}
    </button>
  )
}

export default LanguageToggle
