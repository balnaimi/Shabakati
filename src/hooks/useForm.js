import { useState, useCallback, useMemo } from 'react'

/**
 * Custom hook for form state management
 * 
 * @param {Object} initialValues - Initial form values
 * @param {Object} options - Hook options
 * @param {Function} options.validate - Validation function (values) => errors
 * @param {Function} options.onSubmit - Submit handler (values) => Promise
 * 
 * @returns {Object} Form state and handlers
 * 
 * @example
 * const { values, errors, handleChange, handleSubmit, isSubmitting, reset } = useForm(
 *   { email: '', password: '' },
 *   {
 *     validate: (values) => {
 *       const errors = {}
 *       if (!values.email) errors.email = 'Email is required'
 *       return errors
 *     },
 *     onSubmit: async (values) => {
 *       await api.login(values)
 *     }
 *   }
 * )
 */
export function useForm(initialValues = {}, options = {}) {
  const { validate, onSubmit } = options
  
  // Form values state
  const [values, setValues] = useState(initialValues)
  
  // Validation errors
  const [errors, setErrors] = useState({})
  
  // Touched fields (for showing errors only after interaction)
  const [touched, setTouched] = useState({})
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // General error (e.g., API error)
  const [submitError, setSubmitError] = useState(null)
  
  // Success state
  const [isSuccess, setIsSuccess] = useState(false)

  /**
   * Handle input change
   */
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value
    
    setValues(prev => ({
      ...prev,
      [name]: newValue
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const { [name]: _, ...rest } = prev
        return rest
      })
    }
    
    // Clear submit error when user makes changes
    if (submitError) {
      setSubmitError(null)
    }
  }, [errors, submitError])

  /**
   * Set a specific field value programmatically
   */
  const setValue = useCallback((name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }))
  }, [])

  /**
   * Handle input blur (mark as touched)
   */
  const handleBlur = useCallback((e) => {
    const { name } = e.target
    
    setTouched(prev => ({
      ...prev,
      [name]: true
    }))
    
    // Validate single field on blur if validate function exists
    if (validate) {
      const fieldErrors = validate(values)
      if (fieldErrors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: fieldErrors[name]
        }))
      }
    }
  }, [values, validate])

  /**
   * Validate all fields
   */
  const validateForm = useCallback(() => {
    if (!validate) return true
    
    const validationErrors = validate(values)
    setErrors(validationErrors)
    
    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key] = true
      return acc
    }, {})
    setTouched(allTouched)
    
    return Object.keys(validationErrors).length === 0
  }, [values, validate])

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e) => {
    if (e) {
      e.preventDefault()
    }
    
    setSubmitError(null)
    setIsSuccess(false)
    
    // Validate before submit
    const isValid = validateForm()
    if (!isValid) return
    
    if (!onSubmit) return
    
    setIsSubmitting(true)
    
    try {
      await onSubmit(values)
      setIsSuccess(true)
    } catch (error) {
      setSubmitError(error.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }, [values, validateForm, onSubmit])

  /**
   * Reset form to initial values
   */
  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
    setSubmitError(null)
    setIsSuccess(false)
    setIsSubmitting(false)
  }, [initialValues])

  /**
   * Set form values (useful for editing existing data)
   */
  const setFormValues = useCallback((newValues) => {
    setValues(prev => ({
      ...prev,
      ...newValues
    }))
  }, [])

  /**
   * Set a specific error manually
   */
  const setError = useCallback((name, error) => {
    setErrors(prev => ({
      ...prev,
      [name]: error
    }))
  }, [])

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({})
    setSubmitError(null)
  }, [])

  /**
   * Get field props for easy binding to inputs
   */
  const getFieldProps = useCallback((name) => ({
    name,
    value: values[name] || '',
    onChange: handleChange,
    onBlur: handleBlur,
    'aria-invalid': touched[name] && errors[name] ? 'true' : 'false'
  }), [values, handleChange, handleBlur, touched, errors])

  /**
   * Check if form has any errors
   */
  const hasErrors = useMemo(() => {
    return Object.keys(errors).length > 0
  }, [errors])

  /**
   * Check if form is dirty (values changed from initial)
   */
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues)
  }, [values, initialValues])

  return {
    // State
    values,
    errors,
    touched,
    isSubmitting,
    submitError,
    isSuccess,
    hasErrors,
    isDirty,
    
    // Handlers
    handleChange,
    handleBlur,
    handleSubmit,
    
    // Utilities
    setValue,
    setFormValues,
    setError,
    setSubmitError,
    clearErrors,
    reset,
    validateForm,
    getFieldProps
  }
}

/**
 * Common validation functions
 */
export const validators = {
  required: (value, message = 'This field is required') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return message
    }
    return null
  },
  
  minLength: (min, message) => (value) => {
    if (value && value.length < min) {
      return message || `Minimum ${min} characters required`
    }
    return null
  },
  
  maxLength: (max, message) => (value) => {
    if (value && value.length > max) {
      return message || `Maximum ${max} characters allowed`
    }
    return null
  },
  
  email: (value, message = 'Invalid email address') => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (value && !emailRegex.test(value)) {
      return message
    }
    return null
  },
  
  match: (otherValue, message = 'Values do not match') => (value) => {
    if (value !== otherValue) {
      return message
    }
    return null
  },
  
  ip: (value, message = 'Invalid IP address') => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (value && !ipRegex.test(value)) {
      return message
    }
    // Validate each octet
    if (value) {
      const octets = value.split('.')
      for (const octet of octets) {
        const num = parseInt(octet, 10)
        if (num < 0 || num > 255) {
          return message
        }
      }
    }
    return null
  }
}
