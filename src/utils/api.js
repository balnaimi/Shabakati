import { API_URL } from '../constants'

/**
 * Utility functions for handling API calls with improved error handling
 */

/**
 * Get authorization header with token from sessionStorage (visitor) or localStorage (admin)
 */
function getAuthHeaders(customToken = null) {
  let token = customToken;
  
  if (!token) {
    // Check localStorage for visitor token first
    token = localStorage.getItem('visitorToken');
    
    // If no visitor token, check localStorage for admin token
    if (!token) {
      token = localStorage.getItem('authToken');
    }
  }
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Handle API response with error checking
 */
export async function handleApiResponse(response) {
  const contentType = response.headers.get('content-type')
  
  if (!response.ok) {
    let errorMessage = `فشل في العملية: ${response.status} ${response.statusText}`
    try {
      // Try to read JSON even if contentType is incorrect
      const text = await response.text()
      
      if (contentType && contentType.includes('application/json')) {
        const errorData = JSON.parse(text)
      if (errorData.error) {
        errorMessage = errorData.error
        }
      } else if (text) {
        // If it's text and not JSON, use the text
        errorMessage = text.length > 200 ? text.substring(0, 200) : text
      }
    } catch (e) {
      // If parse fails, use the default message
    }
    throw new Error(errorMessage)
  }

  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text()
    throw new Error(`استجابة غير صحيحة من الخادم: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

/**
 * GET request with error handling
 */
export async function apiGet(endpoint) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: getAuthHeaders()
    })
    
    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      localStorage.removeItem('visitorToken');
      localStorage.removeItem('authToken');
      // Don't redirect automatically, let the component handle it
    }
    
    return await handleApiResponse(response)
  } catch (error) {
    console.error(`API GET Error (${endpoint}):`, error)
    throw error
  }
}

/**
 * POST request with error handling
 */
export async function apiPost(endpoint, data, customToken = null) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(customToken),
      body: JSON.stringify(data)
    })
    
    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      localStorage.removeItem('visitorToken');
      localStorage.removeItem('authToken');
      // Don't redirect automatically, let the component handle it
    }
    
    return await handleApiResponse(response)
  } catch (error) {
    console.error(`API POST Error (${endpoint}):`, error)
    throw error
  }
}

/**
 * PUT request with error handling
 */
export async function apiPut(endpoint, data) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
    
    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      localStorage.removeItem('visitorToken');
      localStorage.removeItem('authToken');
      // Don't redirect automatically, let the component handle it
    }
    
    return await handleApiResponse(response)
  } catch (error) {
    console.error(`API PUT Error (${endpoint}):`, error)
    throw error
  }
}

/**
 * DELETE request with error handling
 */
export async function apiDelete(endpoint) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    
    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      localStorage.removeItem('visitorToken');
      localStorage.removeItem('authToken');
      // Don't redirect automatically, let the component handle it
    }
    
    return await handleApiResponse(response)
  } catch (error) {
    console.error(`API DELETE Error (${endpoint}):`, error)
    throw error
  }
}

/**
 * PATCH request with error handling
 */
export async function apiPatch(endpoint, data = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
    
    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      localStorage.removeItem('visitorToken');
      localStorage.removeItem('authToken');
      // Don't redirect automatically, let the component handle it
    }
    
    return await handleApiResponse(response)
  } catch (error) {
    console.error(`API PATCH Error (${endpoint}):`, error)
    throw error
  }
}

