import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { FiCalendar, FiClock, FiBookOpen } from 'react-icons/fi'
import { listSubjects } from '../services/subjectService'
import { generateStudyPlan } from '../services/aiService'
import { Spinner, PageLoader, EmptyState } from '../components/Common'
import { getErrorMessage } from '../services/api'

const today = new Date().toISOString().split('T')[0]

export default function StudyPlannerPage() {
  const [subjects, setSubjects] = useState([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [subjectId, setSubjectId] = useState('')
  const [examDate, setExamDate] = useState('')
  const [hoursPerDay, setHoursPerDay] = useState(2)
  const [plan, setPlan] = useState(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    listSubjects()
      .then((data) => {
        setSubjects(data)
        if (data.length > 0) setSubjectId(String(data[0].id))
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoadingSubjects(false))
  }, [])

  async function handleGenerate(e) {
    e.preventDefault()
    if (!subjectId) {
      toast.error('Please select a subject.')
      return
    }
    if (!examDate) {
      toast.error('Please choose your exam date.')
      return
    }

    setGenerating(true)
    setPlan(null)
    try {
      const data = await generateStudyPlan(Number(subjectId), examDate, Number(hoursPerDay))
      setPlan(data)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setGenerating(false)
    }
  }

  if (loadingSubjects) return <PageLoader />

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Study Planner</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Get a personalized day-by-day revision schedule.
        </p>
      </div>

      {subjects.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FiBookOpen}
            title="No subjects yet"
            description="Create a subject and upload notes first, so we can build a plan around them."
          />
        </div>
      ) : (
        <form onSubmit={handleGenerate} className="card space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Subject</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="input-field mt-1"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FiCalendar size={14} /> Exam Date
              </label>
              <input
                type="date"
                min={today}
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="input-field mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FiClock size={14} /> Study Hours / Day
              </label>
              <input
                type="number"
                min={0.5}
                max={16}
                step={0.5}
                required
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(e.target.value)}
                className="input-field mt-1"
              />
            </div>
          </div>

          <button type="submit" disabled={generating} className="btn-primary w-full">
            {generating ? <Spinner size={18} /> : 'Generate Study Plan'}
          </button>
        </form>
      )}

      {plan && (
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-800 dark:text-white">Your Schedule</h2>
          {plan.days.map((day, i) => (
            <div key={i} className="card flex items-start gap-4">
              <div className="shrink-0 h-12 w-12 rounded-xl bg-primary/10 text-primary flex flex-col items-center justify-center">
                <span className="text-xs font-medium">Day</span>
                <span className="text-sm font-bold">{i + 1}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{day.date}</p>
                  <span className="text-xs text-slate-400">{day.hours}h</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {day.topics.map((topic, tIndex) => (
                    <li key={tIndex} className="text-sm text-slate-600 dark:text-slate-300 flex gap-2">
                      <span className="text-primary">•</span> {topic}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
