import LanguageToggle from './LanguageToggle'
import ThemeToggle from './ThemeToggle'
import { LogoIcon } from './Icons'
import { cn } from '../utils/cn'

export const AuthPage = ({ children, wide = false }) => (
  <div className="auth-page">
    <div className="auth-page-toolbar">
      <LanguageToggle />
      <ThemeToggle />
    </div>
    <div className={cn('auth-card', 'card', 'card-static', wide && 'auth-card-wide')}>
      {children}
    </div>
  </div>
)

export const AuthPageHeader = ({ title, subtitle }) => (
  <header className="auth-card-header">
    <div className="auth-logo" aria-hidden="true">
      <LogoIcon size={32} />
    </div>
    <h1 className="auth-title">{title}</h1>
    {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
  </header>
)

export const AuthPageCenter = ({ children }) => (
  <div className="auth-page auth-page-center">{children}</div>
)
