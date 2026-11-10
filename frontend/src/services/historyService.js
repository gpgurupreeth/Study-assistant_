import api from './api'

export async function listHistory(type) {
  const { data } = await api.get('/api/history', { params: type ? { type } : {} })
  return data
}

export async function getHistoryItem(id) {
  const { data } = await api.get(`/api/history/${id}`)
  return data
}

export async function deleteHistoryItem(id) {
  await api.delete(`/api/history/${id}`)
}

export async function getDashboardStats() {
  const { data } = await api.get('/api/dashboard/stats')
  return data
}
