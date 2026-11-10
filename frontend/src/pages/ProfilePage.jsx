import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  FiUser, FiLock, FiClock, FiFileText, FiHelpCircle, FiLayers,
  FiMessageSquare, FiCalendar, FiBookOpen, FiTrash2,
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { updateProfile } from '../services/authService'
import { listHistory, deleteHistoryItem } from '../services/historyService'
import { PageLoader, EmptyState } from '../components/Common'
import { getErrorMessage } from '../services/api'

const TYPE_ICONS = {
  summary: FiFileText,
  quiz: FiHelpCircle,
  flashcards: FiLayers,
  question: FiMessageSquare,
  mock_paper: FiBookOpen,
  study_plan: FiCalendar,
  explain_simply: FiFileText,
}

const TYPE_LABELS = {
  summary: 'Summary',
  quiz: 'Quiz',
  flashcards: 'Flashcards',
  question: 'Question',
  mock_paper: 'Mock Paper',
  study_plan: 'Study Plan',
  explain_simply: 'Explain Simply',
}

export default function ProfilePage() {
  const { user, updateLocalUser } = useAuth()
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [])

  function loadHistory() {
    setLoadingHistory(true)
    listHistory()
      .then(setHistory)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoadingHistory(false))
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {}
      if (fullName !== user.full_name) payload.full_name = fullName
      if (newPassword) payload.password = newPassword

      if (Object.keys(payload).length === 0) {
        toast('Nothing to update.')
        return
      }

      const updatedUser = await updateProfile(payload)
      updateLocalUser(updatedUser)
      setNewPassword('')
      toast.success('Profile updated.')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteHistory(id) {
    try {
      await deleteHistoryItem(id)
      setHistory((prev) => prev.filter((h) => h.id !== id))
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Profile</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your account and view your activity history.</p>
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <FiUser size={16} /> Account Details
        </h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-field mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
            <input type="email" value={user?.email || ''} disabled className="input-field mt-1 opacity-60" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FiLock size={13} /> New Password (optional)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              placeholder="Leave blank to keep current password"
              className="input-field mt-1"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <FiClock size={16} /> Activity History
        </h2>

        {loadingHistory ? (
          <PageLoader />
        ) : history.length === 0 ? (
          <EmptyState
            icon={FiClock}
            title="No activity yet"
            description="Summaries, quizzes, flashcards, and questions you generate will show up here."
          />
        ) : (
          <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
            {history.map((item) => {
              const Icon = TYPE_ICONS[item.type] || FiFileText
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                    <Icon size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{item.title}</p>
                    <p className="text-xs text-slate-400">
                      {TYPE_LABELS[item.type] || item.type} · {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteHistory(item.id)}
                    className="text-slate-300 hover:text-red-500 p-1.5 shrink-0"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
