import { useNavigate, useLocation } from 'react-router-dom'
import AuthButton from './AuthButton'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import { useTranslation } from '../hooks/useTranslation'
import { APP_VERSION } from '../constants'
import { HomeIcon, NetworkIcon, LogoIcon, LinkIcon } from './Icons'

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
    { path: '/hosts', label: t('navigation.viewNetworks'), icon: NetworkIcon },
    { path: '/available-ips', label: t('navigation.getAvailableIP'), icon: LinkIcon }
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
            <div className="navbar-brand-text">
              <h1 className="navbar-title">{t('app.name')}</h1>
              <span className="navbar-version">{t('app.version', { version: APP_VERSION })}</span>
            </div>
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
