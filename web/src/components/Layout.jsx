import { useNavigate, useLocation } from 'react-router-dom'
import AuthButton from './AuthButton'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import GlobalSearch from './GlobalSearch'
import { useTranslation } from '../hooks/useTranslation'
import { APP_VERSION } from '../constants'
import { HomeIcon, NetworkIcon, LogoIcon, LinkIcon, TagIcon, ChartIcon, SettingsIcon } from './Icons'
import AutoScanNotifier from './AutoScanNotifier'

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
    { path: '/', label: t('navigation.home'), shortLabel: t('navigation.homeShort'), icon: HomeIcon },
    { path: '/hosts', label: t('navigation.dashboard'), shortLabel: t('navigation.dashboardShort'), icon: NetworkIcon },
    { path: '/networks', label: t('navigation.manageNetworks'), shortLabel: t('navigation.manageNetworksShort'), icon: SettingsIcon },
    { path: '/available-ips', label: t('navigation.getAvailableIP'), shortLabel: t('navigation.getAvailableIPShort'), icon: LinkIcon },
    { path: '/uptime', label: t('navigation.uptime'), shortLabel: t('navigation.uptimeShort'), icon: ChartIcon },
    { path: '/tags', label: t('navigation.manageTags'), shortLabel: t('navigation.manageTagsShort'), icon: TagIcon }
  ]

  if (location.pathname === '/login' || location.pathname === '/setup') {
    return <>{children}</>
  }

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">{t('a11y.skipToContent')}</a>
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand" title={t('app.name')}>
            <div className="navbar-logo" title={t('app.name')}>
              <LogoIcon size={20} />
            </div>
            <div className="navbar-brand-text">
              <h1 className="navbar-title">{t('app.name')}</h1>
              <span className="navbar-version">{t('app.version', { version: APP_VERSION })}</span>
            </div>
          </div>

          <div className="navbar-menu">
            <GlobalSearch />
            <div className="navbar-links">
              {navLinks.map(link => {
                const Icon = link.icon
                const active = isActive(link.path)
                return (
                  <button
                    key={link.path}
                    type="button"
                    onClick={() => navigate(link.path)}
                    className={`nav-link ${active ? 'active' : ''}`}
                    title={link.label}
                    aria-label={link.label}
                  >
                    <Icon size={18} aria-hidden />
                    <span className="nav-link-label-full">{link.label}</span>
                    <span className="nav-link-label-short">{link.shortLabel}</span>
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
      <main id="main-content">
        <AutoScanNotifier />
        {children}
      </main>
    </div>
  )
}

export default Layout
