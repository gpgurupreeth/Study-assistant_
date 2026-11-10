import api from './api'

export async function registerUser({ full_name, email, password }) {
  const { data } = await api.post('/api/auth/register', { full_name, email, password })
  return data
}

export async function loginUser({ email, password }) {
  const { data } = await api.post('/api/auth/login', { email, password })
  return data
}

export async function getCurrentUser() {
  const { data } = await api.get('/api/auth/me')
  return data
}

export async function updateProfile(payload) {
  const { data } = await api.put('/api/auth/me', payload)
  return data
}
