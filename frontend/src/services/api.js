import axios from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
})

// Attach the JWT to every outgoing request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('asa_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Centralized handling of expired/invalid sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('asa_token')
      localStorage.removeItem('asa_user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export function getErrorMessage(error) {
  return (
    error?.response?.data?.detail ||
    error?.message ||
    'Something went wrong. Please try again.'
  )
}

export default api
