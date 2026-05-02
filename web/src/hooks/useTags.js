import { useState, useEffect } from 'react'
import { apiGet } from '../utils/api'
import { useTranslation } from './useTranslation'
import { formatClientError } from '../utils/formatClientError'

/**
 * Custom hook for managing tags
 * @returns {{tags: Array, loading: boolean, error: string|null, refetch: Function}}
 */
export function useTags() {
  const { t } = useTranslation()
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTags = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiGet('/tags')
      setTags(data)
    } catch (err) {
      setError(formatClientError(err, t))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTags()
  }, [])

  return {
    tags,
    loading,
    error,
    refetch: fetchTags
  }
}
