import { useNavigate, useLocation } from 'react-router-dom'
import AuthButton from './AuthButton'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import { useTranslation } from '../hooks/useTranslation'
import { HomeIcon, NetworkIcon, LogoIcon } from './Icons'

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
    { path: '/', label: t('navigation.home'), icon: HomeIcon },
    { path: '/hosts', label: t('navigation.viewNetworks'), icon: NetworkIcon }
  ]

  if (location.pathname === '/login') {
    return <>{children}</>
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand">
            <div className="navbar-logo">
              <LogoIcon size={20} />
            </div>
            <h1 className="navbar-title">{t('app.name')}</h1>
          </div>
          
          <div className="navbar-menu">
            <div className="navbar-links">
              {navLinks.map(link => {
                const Icon = link.icon
                const active = isActive(link.path)
                return (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className={`nav-link ${active ? 'active' : ''}`}
                  >
                    <Icon size={18} />
                    <span>{link.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          
          <div className="navbar-actions">
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
