import { useEffect } from 'react'
import { useTranslation } from '../hooks/useTranslation'

/** Keeps document.title aligned with app language (avoids static English-only HTML title). */
export default function DocumentTitle() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = t('app.documentTitle', { appName: t('app.name') })
  }, [t])

  return null
}
