import { Sun, Moon } from 'lucide-react'

/**
 * Component لزر تبديل الثيم قابل لإعادة الاستخدام
 */
function ThemeToggle({ theme, toggleTheme }) {
  return (
    <div className="theme-toggle-container">
      <button 
        className={`theme-toggle ${theme === 'dark' ? 'dark' : 'light'}`}
        onClick={toggleTheme}
        title={theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
        aria-label="تبديل الثيم"
      >
        <div className="theme-toggle-track">
          <div className="theme-icons">
            <Sun size={16} className={`theme-icon ${theme === 'light' ? 'active' : ''}`} />
            <Moon size={16} className={`theme-icon ${theme === 'dark' ? 'active' : ''}`} />
          </div>
          <div className="theme-toggle-thumb"></div>
        </div>
      </button>
    </div>
  )
}

export default ThemeToggle

