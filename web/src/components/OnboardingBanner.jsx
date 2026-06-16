import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../hooks/useTranslation'
import { NetworkIcon, PlusIcon } from './Icons'

function OnboardingBanner({ onDismiss }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <section className="card onboarding-banner" aria-label={t('onboarding.title')}>
      <h2>{t('onboarding.title')}</h2>
      <p>{t('onboarding.description')}</p>
      <ol className="onboarding-steps">
        <li>{t('onboarding.step1')}</li>
        <li>{t('onboarding.step2')}</li>
        <li>{t('onboarding.step3')}</li>
      </ol>
      <div className="onboarding-actions">
        <button type="button" className="btn-primary" onClick={() => navigate('/networks')}>
          <NetworkIcon size={18} />
          <span>{t('onboarding.addNetwork')}</span>
        </button>
        <button type="button" className="btn-secondary" onClick={() => navigate('/networks')}>
          <PlusIcon size={18} />
          <span>{t('onboarding.scanLater')}</span>
        </button>
        {onDismiss && (
          <button type="button" className="btn-ghost" onClick={onDismiss}>
            {t('onboarding.dismiss')}
          </button>
        )}
      </div>
    </section>
  )
}

export default OnboardingBanner
