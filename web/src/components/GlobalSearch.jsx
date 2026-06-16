import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../utils/api'
import { useTranslation } from '../hooks/useTranslation'
import IpAddress from './IpAddress'

function GlobalSearch() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return undefined
    }
    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        const data = await apiGet(`/search?q=${encodeURIComponent(query.trim())}`)
        setResults(data)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = (host) => {
    setQuery('')
    setOpen(false)
    setResults([])
    if (host.networkId) {
      navigate(`/networks/${host.networkId}`)
    }
  }

  return (
    <div className="global-search" ref={wrapRef}>
      <input
        type="search"
        className="global-search-input"
        placeholder={t('search.placeholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        aria-label={t('search.placeholder')}
        aria-expanded={open}
        aria-controls="global-search-results"
      />
      {open && (results.length > 0 || loading) && (
        <ul id="global-search-results" className="global-search-results" role="listbox">
          {loading && <li className="global-search-item muted">{t('common.loading')}</li>}
          {!loading && results.length === 0 && query.length >= 2 && (
            <li className="global-search-item muted">{t('search.noResults')}</li>
          )}
          {results.map((host) => (
            <li key={host.id}>
              <button type="button" className="global-search-item" role="option" onClick={() => pick(host)}>
                <strong>{host.name}</strong>
                <span className="global-search-ip"><IpAddress>{host.ip}</IpAddress></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default GlobalSearch
