import api from './api'

export async function getSummary(noteId, forceRegenerate = false) {
  const { data } = await api.post(`/api/ai/summary/${noteId}`, null, {
    params: { force_regenerate: forceRegenerate },
  })
  return data
}

export async function askAI(noteId, question) {
  const { data } = await api.post('/api/ai/ask', { note_id: noteId, question })
  return data
}

export async function generateQuiz(noteId, numQuestions) {
  const { data } = await api.post('/api/ai/quiz', { note_id: noteId, num_questions: numQuestions })
  return data
}

export async function generateFlashcards(noteId, numCards) {
  const { data } = await api.post('/api/ai/flashcards', { note_id: noteId, num_cards: numCards })
  return data
}

export async function explainSimply(text) {
  const { data } = await api.post('/api/ai/explain-simply', { text })
  return data
}

export async function generateMockPaper(noteId, numShort, numLong) {
  const { data } = await api.post('/api/ai/mock-paper', {
    note_id: noteId,
    num_short_questions: numShort,
    num_long_questions: numLong,
  })
  return data
}

export async function generateStudyPlan(subjectId, examDate, hoursPerDay) {
  const { data } = await api.post('/api/planner/generate', {
    subject_id: subjectId,
    exam_date: examDate,
    study_hours_per_day: hoursPerDay,
  })
  return data
}
