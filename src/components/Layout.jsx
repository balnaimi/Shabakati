import { useNavigate, useLocation } from 'react-router-dom'
import AuthButton from './AuthButton'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import { useTranslation } from '../hooks/useTranslation'

function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  const navLinks = [
    { path: '/', label: t('navigation.home') },
    { path: '/hosts', label: t('navigation.viewNetworks') }
  ]

  // لا نعرض navbar في صفحة Login
  if (location.pathname === '/login') {
    return <>{children}</>
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-content">
          <h1 className="navbar-title">{t('pages.favorites.title')}</h1>
          <div className="navbar-links">
            {navLinks.map(link => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={isActive(link.path) ? 'btn-primary' : ''}
                style={{
                  backgroundColor: isActive(link.path) ? 'var(--primary)' : 'transparent',
                  color: isActive(link.path) ? 'white' : 'var(--text-primary)',
                  border: `1px solid ${isActive(link.path) ? 'var(--primary)' : 'var(--border-color)'}`
                }}
              >
                {link.label}
              </button>
            ))}
            <LanguageToggle />
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>
      </nav>
      {children}
    </div>
  )
}

export default Layout
