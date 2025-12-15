import { API_URL } from '../constants'

/**
 * Utility functions لمعالجة API calls مع تحسين معالجة الأخطاء
 */

/**
 * معالجة استجابة API مع فحص الأخطاء
 */
export async function handleApiResponse(response) {
  const contentType = response.headers.get('content-type')
  
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text()
    throw new Error(`استجابة غير صحيحة من الخادم: ${response.status} ${response.statusText}`)
  }

  if (!response.ok) {
    let errorMessage = `فشل في العملية: ${response.status} ${response.statusText}`
    try {
      const errorData = await response.json()
      if (errorData.error) {
        errorMessage = errorData.error
      }
    } catch (e) {
      // إذا فشل parse JSON، استخدم الرسالة الافتراضية
    }
    throw new Error(errorMessage)
  }

  return await response.json()
}

/**
 * GET request مع معالجة الأخطاء
 */
export async function apiGet(endpoint) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`)
    return await handleApiResponse(response)
  } catch (error) {
    console.error(`API GET Error (${endpoint}):`, error)
    throw error
  }
}

/**
 * POST request مع معالجة الأخطاء
 */
export async function apiPost(endpoint, data) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })
    return await handleApiResponse(response)
  } catch (error) {
    console.error(`API POST Error (${endpoint}):`, error)
    throw error
  }
}

/**
 * PUT request مع معالجة الأخطاء
 */
export async function apiPut(endpoint, data) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })
    return await handleApiResponse(response)
  } catch (error) {
    console.error(`API PUT Error (${endpoint}):`, error)
    throw error
  }
}

/**
 * DELETE request مع معالجة الأخطاء
 */
export async function apiDelete(endpoint) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE'
    })
    return await handleApiResponse(response)
  } catch (error) {
    console.error(`API DELETE Error (${endpoint}):`, error)
    throw error
  }
}

/**
 * PATCH request مع معالجة الأخطاء
 */
export async function apiPatch(endpoint, data = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })
    return await handleApiResponse(response)
  } catch (error) {
    console.error(`API PATCH Error (${endpoint}):`, error)
    throw error
  }
}

