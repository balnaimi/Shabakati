import { API_URL } from '../constants'

/**
 * Utility functions for handling API calls with improved error handling
 */

// Error messages (language-agnostic codes that components can translate)
const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  INVALID_RESPONSE: 'INVALID_RESPONSE'
}

/**
 * Handle unauthorized (401) response
 */
function handleUnauthorized() {
  localStorage.removeItem('visitorToken')
  localStorage.removeItem('authToken')
}

/**
 * Get authorization header with token from localStorage
 */
function getAuthHeaders(customToken = null) {
  let token = customToken
  
  if (!token) {
    // Check localStorage for visitor token first
    token = localStorage.getItem('visitorToken')
    
    // If no visitor token, check localStorage for admin token
    if (!token) {
      token = localStorage.getItem('authToken')
    }
  }
  
  const headers = {
    'Content-Type': 'application/json',
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return headers
}

/**
 * Handle API response with error checking
 */
export async function handleApiResponse(response) {
  // Handle 401 Unauthorized
  if (response.status === 401) {
    handleUnauthorized()
  }
  
  const contentType = response.headers.get('content-type')
  
  if (!response.ok) {
    let errorMessage = `${ERROR_CODES.SERVER_ERROR}: ${response.status} ${response.statusText}`
    try {
      const text = await response.text()
      
      if (contentType && contentType.includes('application/json')) {
        const errorData = JSON.parse(text)
        if (errorData.error) {
          errorMessage = errorData.error
        }
      } else if (text) {
        errorMessage = text.length > 200 ? text.substring(0, 200) : text
      }
    } catch (e) {
      // If parse fails, use the default message
    }
    throw new Error(errorMessage)
  }

  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text()
    throw new Error(`${ERROR_CODES.INVALID_RESPONSE}: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Create a fetch request with optional abort signal
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @param {AbortSignal} signal - Optional abort signal
 */
async function fetchWithAbort(url, options, signal = null) {
  const fetchOptions = { ...options }
  if (signal) {
    fetchOptions.signal = signal
  }
  
  try {
    return await fetch(url, fetchOptions)
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request was cancelled')
    }
    throw error
  }
}

/**
 * GET request with error handling
 * @param {string} endpoint - API endpoint
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 */
export async function apiGet(endpoint, signal = null) {
  try {
    const response = await fetchWithAbort(
      `${API_URL}${endpoint}`,
      { headers: getAuthHeaders() },
      signal
    )
    
    return await handleApiResponse(response)
  } catch (error) {
    if (error.message !== 'Request was cancelled') {
      console.error(`API GET Error (${endpoint}):`, error)
    }
    throw error
  }
}

/**
 * POST request with error handling
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body data
 * @param {string} customToken - Optional custom auth token
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 */
export async function apiPost(endpoint, data, customToken = null, signal = null) {
  try {
    const response = await fetchWithAbort(
      `${API_URL}${endpoint}`,
      {
        method: 'POST',
        headers: getAuthHeaders(customToken),
        body: JSON.stringify(data)
      },
      signal
    )
    
    return await handleApiResponse(response)
  } catch (error) {
    if (error.message !== 'Request was cancelled') {
      console.error(`API POST Error (${endpoint}):`, error)
    }
    throw error
  }
}

/**
 * PUT request with error handling
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body data
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 */
export async function apiPut(endpoint, data, signal = null) {
  try {
    const response = await fetchWithAbort(
      `${API_URL}${endpoint}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      },
      signal
    )
    
    return await handleApiResponse(response)
  } catch (error) {
    if (error.message !== 'Request was cancelled') {
      console.error(`API PUT Error (${endpoint}):`, error)
    }
    throw error
  }
}

/**
 * DELETE request with error handling
 * @param {string} endpoint - API endpoint
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 */
export async function apiDelete(endpoint, signal = null) {
  try {
    const response = await fetchWithAbort(
      `${API_URL}${endpoint}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders()
      },
      signal
    )
    
    return await handleApiResponse(response)
  } catch (error) {
    if (error.message !== 'Request was cancelled') {
      console.error(`API DELETE Error (${endpoint}):`, error)
    }
    throw error
  }
}

/**
 * PATCH request with error handling
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body data
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 */
export async function apiPatch(endpoint, data = {}, signal = null) {
  try {
    const response = await fetchWithAbort(
      `${API_URL}${endpoint}`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      },
      signal
    )
    
    return await handleApiResponse(response)
  } catch (error) {
    if (error.message !== 'Request was cancelled') {
      console.error(`API PATCH Error (${endpoint}):`, error)
    }
    throw error
  }
}

/**
 * Create an AbortController for request cancellation
 * Useful for cleanup in useEffect
 * @returns {{ controller: AbortController, signal: AbortSignal }}
 */
export function createAbortController() {
  const controller = new AbortController()
  return {
    controller,
    signal: controller.signal
  }
}
