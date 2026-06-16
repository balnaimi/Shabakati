const DATE_TIME_OPTIONS = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
}

function localeForLanguage(language) {
  return language === 'ar' ? 'ar' : 'en-GB'
}

/** Day/month/year (not US month/day/year). */
export function formatDateTime(value, language = 'en') {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    ...DATE_TIME_OPTIONS,
    hour12: false
  }).format(date)
}
