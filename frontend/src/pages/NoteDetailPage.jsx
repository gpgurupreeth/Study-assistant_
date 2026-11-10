import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  FiMessageSquare, FiHelpCircle, FiLayers, FiRefreshCw, FiTrash2,
  FiBookOpen, FiFileText, FiEdit3,
} from 'react-icons/fi'
import { getNote, deleteNote } from '../services/noteService'
import { getSummary, explainSimply, generateMockPaper } from '../services/aiService'
import { PageLoader, Spinner, Modal } from '../components/Common'
import { getErrorMessage } from '../services/api'

const TABS = ['Summary', 'Original Text', 'Mock Paper']

const featureLinks = [
  { to: (id) => `/notes/${id}/chat`, label: 'Ask AI', icon: FiMessageSquare, color: 'bg-blue-50 text-primary dark:bg-blue-950' },
  { to: (id) => `/notes/${id}/quiz`, label: 'Generate Quiz', icon: FiHelpCircle, color: 'bg-amber-50 text-amber-600 dark:bg-amber-950' },
  { to: (id) => `/notes/${id}/flashcards`, label: 'Flashcards', icon: FiLayers, color: 'bg-purple-50 text-purple-600 dark:bg-purple-950' },
]

export default function NoteDetailPage() {
  const { noteId } = useParams()
  const navigate = useNavigate()

  const [note, setNote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Summary')

  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  const [mockPaper, setMockPaper] = useState(null)
  const [mockPaperLoading, setMockPaperLoading] = useState(false)

  const [explainModalOpen, setExplainModalOpen] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [simpleExplanation, setSimpleExplanation] = useState('')
  const [explaining, setExplaining] = useState(false)

  useEffect(() => {
    setLoading(true)
    getNote(noteId)
      .then(setNote)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [noteId])

  useEffect(() => {
    if (activeTab === 'Summary' && !summary) {
      loadSummary(false)
    }
    if (activeTab === 'Mock Paper' && !mockPaper) {
      loadMockPaper()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  async function loadSummary(force) {
    setSummaryLoading(true)
    try {
      const data = await getSummary(noteId, force)
      setSummary(data)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSummaryLoading(false)
    }
  }

  async function loadMockPaper() {
    setMockPaperLoading(true)
    try {
      const data = await generateMockPaper(noteId, 5, 3)
      setMockPaper(data)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setMockPaperLoading(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    try {
      await deleteNote(noteId)
      toast.success('Note deleted.')
      navigate('/subjects')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  function handleTextSelection() {
    const selection = window.getSelection()?.toString().trim()
    if (selection && selection.length > 0) {
      setSelectedText(selection)
      setSimpleExplanation('')
      setExplainModalOpen(true)
    }
  }

  async function handleExplainSimply() {
    setExplaining(true)
    try {
      const result = await explainSimply(selectedText)
      setSimpleExplanation(result.simple_explanation)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setExplaining(false)
    }
  }

  if (loading) return <PageLoader />
  if (!note) return null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">{note.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm uppercase tracking-wide">
            {note.file_type} · {note.file_name}
          </p>
        </div>
        <button onClick={handleDelete} className="btn-danger">
          <FiTrash2 size={15} /> Delete Note
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {featureLinks.map(({ to, label, icon: Icon, color }) => (
          <Link key={label} to={to(note.id)} className="card flex items-center gap-3 hover:border-primary/40 transition-colors">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={18} />
            </div>
            <span className="font-medium text-sm text-slate-700 dark:text-slate-200">{label}</span>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="flex gap-1 border-b border-slate-100 dark:border-slate-800 mb-5 -mt-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Summary' && (
          <div>
            <div className="flex justify-end mb-3">
              <button
                onClick={() => loadSummary(true)}
                disabled={summaryLoading}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                <FiRefreshCw size={13} /> Regenerate
              </button>
            </div>

            {summaryLoading ? (
              <div className="py-10 flex justify-center"><Spinner size={30} /></div>
            ) : summary ? (
              <div className="space-y-6">
                <div>
                  <h3 className="section-label mb-2">Summary</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{summary.summary_text}</p>
                </div>

                {summary.key_points?.length > 0 && (
                  <div>
                    <h3 className="section-label mb-2">Key Points</h3>
                    <ul className="space-y-1.5">
                      {summary.key_points.map((point, i) => (
                        <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
                          <span className="text-primary mt-0.5">•</span> {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.definitions?.length > 0 && (
                  <div>
                    <h3 className="section-label mb-2">Definitions</h3>
                    <ul className="space-y-1.5">
                      {summary.definitions.map((def, i) => (
                        <li key={i} className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">{def}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.formulas?.length > 0 && (
                  <div>
                    <h3 className="section-label mb-2">Important Formulas</h3>
                    <ul className="space-y-1.5">
                      {summary.formulas.map((formula, i) => (
                        <li key={i} className="text-sm font-mono text-primary bg-primary/5 rounded-lg px-3 py-2">{formula}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.exam_tips?.length > 0 && (
                  <div>
                    <h3 className="section-label mb-2">Exam Tips</h3>
                    <ul className="space-y-1.5">
                      {summary.exam_tips.map((tip, i) => (
                        <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
                          <span className="text-amber-500 mt-0.5">★</span> {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {activeTab === 'Original Text' && (
          <div>
            <p className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
              <FiEdit3 size={12} /> Select any text to get a simplified explanation.
            </p>
            <div
              onMouseUp={handleTextSelection}
              className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto p-1 select-text"
            >
              {note.extracted_text}
            </div>
          </div>
        )}

        {activeTab === 'Mock Paper' && (
          <div>
            {mockPaperLoading ? (
              <div className="py-10 flex justify-center"><Spinner size={30} /></div>
            ) : mockPaper ? (
              <div className="space-y-6">
                <div>
                  <h3 className="section-label mb-2 flex items-center gap-1.5"><FiFileText size={13} /> Short Questions</h3>
                  <ol className="space-y-2 list-decimal list-inside">
                    {mockPaper.short_questions.map((q, i) => (
                      <li key={i} className="text-sm text-slate-700 dark:text-slate-300">{q}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="section-label mb-2 flex items-center gap-1.5"><FiBookOpen size={13} /> Long Questions</h3>
                  <ol className="space-y-3 list-decimal list-inside">
                    {mockPaper.long_questions.map((q, i) => (
                      <li key={i} className="text-sm text-slate-700 dark:text-slate-300">{q}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <Modal
        open={explainModalOpen}
        onClose={() => setExplainModalOpen(false)}
        title="Explain Simply"
        footer={
          !simpleExplanation && (
            <button onClick={handleExplainSimply} disabled={explaining} className="btn-primary">
              {explaining ? 'Explaining...' : 'Explain like I\'m 12'}
            </button>
          )
        }
      >
        <div className="space-y-3">
          <div>
            <h4 className="section-label mb-1">Selected Text</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">{selectedText}</p>
          </div>
          {explaining && <div className="flex justify-center py-4"><Spinner size={26} /></div>}
          {simpleExplanation && (
            <div>
              <h4 className="section-label mb-1">Simple Explanation</h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{simpleExplanation}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
