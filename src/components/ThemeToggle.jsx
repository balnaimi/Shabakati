import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from '../hooks/useTranslation'
import { SunIcon, MoonIcon } from './Icons'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()

  const isDark = theme === 'dark'
  const label = isDark ? t('theme.light') : t('theme.dark')

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={label}
      title={label}
    >
      {isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
    </button>
  )
}

export default ThemeToggle
