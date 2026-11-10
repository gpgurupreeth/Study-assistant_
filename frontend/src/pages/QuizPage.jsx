import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi'
import { generateQuiz } from '../services/aiService'
import { Spinner } from '../components/Common'
import { getErrorMessage } from '../services/api'

export default function QuizPage() {
  const { noteId } = useParams()
  const [numQuestions, setNumQuestions] = useState(5)
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(false)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setQuiz(null)
    setAnswers({})
    setSubmitted(false)
    try {
      const data = await generateQuiz(noteId, numQuestions)
      if (!data.questions?.length) {
        toast.error('Could not generate quiz questions. Please try again.')
        return
      }
      setQuiz(data)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function selectAnswer(qIndex, option) {
    if (submitted) return
    setAnswers((prev) => ({ ...prev, [qIndex]: option }))
  }

  function handleSubmit() {
    if (Object.keys(answers).length < quiz.questions.length) {
      toast.error('Please answer all questions before submitting.')
      return
    }
    setSubmitted(true)
  }

  const score = quiz && submitted
    ? quiz.questions.filter((q, i) => answers[i] === q.correct_answer).length
    : 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/notes/${noteId}`} className="text-slate-400 hover:text-slate-600">
          <FiArrowLeft size={20} />
        </Link>
        <h1 className="page-title">Quiz</h1>
      </div>

      {!quiz && (
        <div className="card space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Number of Questions</label>
            <div className="flex gap-2 mt-2">
              {[5, 10, 15].map((n) => (
                <button
                  key={n}
                  onClick={() => setNumQuestions(n)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${
                    numQuestions === n
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {n} Questions
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleGenerate} disabled={loading} className="btn-primary w-full">
            {loading ? <Spinner size={18} /> : 'Generate Quiz'}
          </button>
        </div>
      )}

      {quiz && (
        <div className="space-y-4">
          {submitted && (
            <div className="card text-center bg-primary/5 border-primary/20">
              <p className="text-3xl font-bold text-primary">{score}/{quiz.questions.length}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {score === quiz.questions.length ? 'Perfect score! 🎉' : 'Review the explanations below.'}
              </p>
            </div>
          )}

          {quiz.questions.map((q, qIndex) => {
            const selected = answers[qIndex]
            return (
              <div key={qIndex} className="card">
                <p className="font-medium text-slate-800 dark:text-white mb-3">
                  {qIndex + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((option, oIndex) => {
                    const isSelected = selected === option
                    const isCorrect = option === q.correct_answer
                    let optionStyle = 'border-slate-200 dark:border-slate-700 hover:border-primary/40'
                    if (submitted) {
                      if (isCorrect) optionStyle = 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950'
                      else if (isSelected && !isCorrect) optionStyle = 'border-red-400 bg-red-50 dark:bg-red-950'
                    } else if (isSelected) {
                      optionStyle = 'border-primary bg-primary/5'
                    }

                    return (
                      <button
                        key={oIndex}
                        onClick={() => selectAnswer(qIndex, option)}
                        disabled={submitted}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border-2 text-sm text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-between ${optionStyle}`}
                      >
                        {option}
                        {submitted && isCorrect && <FiCheck className="text-emerald-500 shrink-0" size={16} />}
                        {submitted && isSelected && !isCorrect && <FiX className="text-red-500 shrink-0" size={16} />}
                      </button>
                    )
                  })}
                </div>
                {submitted && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                    <strong>Explanation:</strong> {q.explanation}
                  </p>
                )}
              </div>
            )
          })}

          <div className="flex gap-3">
            {!submitted ? (
              <button onClick={handleSubmit} className="btn-primary flex-1">Submit Quiz</button>
            ) : (
              <button onClick={handleGenerate} className="btn-primary flex-1">
                <FiRefreshCw size={15} /> New Quiz
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
