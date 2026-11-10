import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { loginUser, registerUser, getCurrentUser } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('asa_user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('asa_token')
    if (!token) {
      setLoading(false)
      return
    }
    // Validate the stored token against the backend on app load
    getCurrentUser()
      .then((freshUser) => {
        setUser(freshUser)
        localStorage.setItem('asa_user', JSON.stringify(freshUser))
      })
      .catch(() => {
        localStorage.removeItem('asa_token')
        localStorage.removeItem('asa_user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await loginUser({ email, password })
    localStorage.setItem('asa_token', data.access_token)
    localStorage.setItem('asa_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (fullName, email, password) => {
    const data = await registerUser({ full_name: fullName, email, password })
    localStorage.setItem('asa_token', data.access_token)
    localStorage.setItem('asa_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('asa_token')
    localStorage.removeItem('asa_user')
    setUser(null)
  }, [])

  const updateLocalUser = useCallback((updatedUser) => {
    setUser(updatedUser)
    localStorage.setItem('asa_user', JSON.stringify(updatedUser))
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateLocalUser, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
