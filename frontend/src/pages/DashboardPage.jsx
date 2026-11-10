import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  FiBook, FiFileText, FiHelpCircle, FiLayers, FiUploadCloud,
  FiCalendar, FiFile, FiArrowRight,
} from 'react-icons/fi'
import { getDashboardStats } from '../services/historyService'
import { useAuth } from '../context/AuthContext'
import { PageLoader, EmptyState } from '../components/Common'
import { getErrorMessage } from '../services/api'

const quickActions = [
  { to: '/subjects', label: 'Manage Subjects', icon: FiBook },
  { to: '/planner', label: 'Study Planner', icon: FiCalendar },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  const statCards = [
    { label: 'Total Subjects', value: stats?.total_subjects ?? 0, icon: FiBook, color: 'bg-blue-50 text-primary dark:bg-blue-950' },
    { label: 'Total Notes', value: stats?.total_notes ?? 0, icon: FiFileText, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950' },
    { label: 'Quizzes Generated', value: stats?.total_quizzes_generated ?? 0, icon: FiHelpCircle, color: 'bg-amber-50 text-amber-600 dark:bg-amber-950' },
    { label: 'Flashcard Sets', value: stats?.total_flashcard_sets ?? 0, icon: FiLayers, color: 'bg-purple-50 text-purple-600 dark:bg-purple-950' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Welcome back, {user?.full_name?.split(' ')[0]} 👋</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Here's an overview of your study activity.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 dark:text-white">Recent Uploads</h2>
            <Link to="/subjects" className="text-sm text-primary font-medium flex items-center gap-1">
              View all <FiArrowRight size={14} />
            </Link>
          </div>

          {stats?.recent_uploads?.length ? (
            <div className="space-y-2">
              {stats.recent_uploads.map((note) => (
                <Link
                  key={note.id}
                  to={`/notes/${note.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                    <FiFile size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{note.title}</p>
                    <p className="text-xs text-slate-400 uppercase">{note.file_type}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FiUploadCloud}
              title="No notes yet"
              description="Upload your first set of notes to get started."
              action={
                <Link to="/subjects" className="btn-primary">
                  Go to Subjects
                </Link>
              }
            />
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {quickActions.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon size={16} />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
