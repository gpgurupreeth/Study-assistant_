import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiSend, FiArrowLeft, FiAlertCircle } from 'react-icons/fi'
import { getNote } from '../services/noteService'
import { askAI } from '../services/aiService'
import { Spinner, PageLoader } from '../components/Common'
import { getErrorMessage } from '../services/api'

export default function AIChatPage() {
  const { noteId } = useParams()
  const [note, setNote] = useState(null)
  const [loadingNote, setLoadingNote] = useState(true)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [asking, setAsking] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    getNote(noteId)
      .then((data) => {
        setNote(data)
        setMessages([
          {
            role: 'assistant',
            text: `Hi! Ask me anything about "${data.title}" — I'll answer strictly using this note.`,
            grounded: true,
          },
        ])
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoadingNote(false))
  }, [noteId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    const question = input.trim()
    if (!question) return

    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setInput('')
    setAsking(true)

    try {
      const result = await askAI(noteId, question)
      setMessages((prev) => [...prev, { role: 'assistant', text: result.answer, grounded: result.grounded }])
    } catch (err) {
      toast.error(getErrorMessage(err))
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setAsking(false)
    }
  }

  if (loadingNote) return <PageLoader />

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 mb-4">
        <Link to={`/notes/${noteId}`} className="text-slate-400 hover:text-slate-600">
          <FiArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-semibold text-slate-800 dark:text-white">Ask AI</h1>
          <p className="text-xs text-slate-400">{note?.title}</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto card space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-sm'
              }`}
            >
              {msg.text}
              {msg.role === 'assistant' && msg.grounded === false && (
                <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <FiAlertCircle size={12} /> Not found in your notes
                </div>
              )}
            </div>
          </div>
        ))}
        {asking && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <Spinner size={16} />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this note..."
          className="input-field"
          disabled={asking}
        />
        <button type="submit" disabled={asking || !input.trim()} className="btn-primary px-4">
          <FiSend size={16} />
        </button>
      </form>
    </div>
  )
}
