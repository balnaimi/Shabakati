import { useState, useEffect } from 'react'
import { apiGet } from '../utils/api'

/**
 * Custom hook for managing tags
 * @returns {{tags: Array, loading: boolean, error: string|null, refetch: Function}}
 */
export function useTags() {
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
      setError(err.message)
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
