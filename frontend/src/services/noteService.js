import api from './api'

export async function uploadNote({ subjectId, title, file, onProgress }) {
  const formData = new FormData()
  formData.append('subject_id', subjectId)
  formData.append('title', title)
  formData.append('file', file)

  const { data } = await api.post('/api/notes/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded * 100) / evt.total))
      }
    },
  })
  return data
}

export async function listNotes(subjectId) {
  const { data } = await api.get('/api/notes', { params: subjectId ? { subject_id: subjectId } : {} })
  return data
}

export async function getNote(id) {
  const { data } = await api.get(`/api/notes/${id}`)
  return data
}

export async function deleteNote(id) {
  await api.delete(`/api/notes/${id}`)
}

export async function searchNotes(query) {
  const { data } = await api.get('/api/notes/search', { params: { q: query } })
  return data
}
