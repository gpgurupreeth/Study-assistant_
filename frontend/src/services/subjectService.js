import api from './api'

export async function listSubjects() {
  const { data } = await api.get('/api/subjects')
  return data
}

export async function getSubject(id) {
  const { data } = await api.get(`/api/subjects/${id}`)
  return data
}

export async function createSubject(payload) {
  const { data } = await api.post('/api/subjects', payload)
  return data
}

export async function updateSubject(id, payload) {
  const { data } = await api.put(`/api/subjects/${id}`, payload)
  return data
}

export async function deleteSubject(id) {
  await api.delete(`/api/subjects/${id}`)
}
