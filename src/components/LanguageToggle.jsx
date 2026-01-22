import { useLanguage } from '../contexts/LanguageContext'

function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar')
  }

  return (
    <button
      onClick={toggleLanguage}
      className="btn-secondary"
      style={{
        minWidth: '60px',
        padding: '8px 12px',
        fontSize: '14px',
        fontWeight: 'bold'
      }}
      title={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      aria-label={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      {language === 'ar' ? 'EN' : 'ع'}
    </button>
  )
}

export default LanguageToggle
