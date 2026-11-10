import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiChevronLeft, FiChevronRight, FiRefreshCw } from 'react-icons/fi'
import { generateFlashcards } from '../services/aiService'
import { Spinner } from '../components/Common'
import { getErrorMessage } from '../services/api'

export default function FlashcardsPage() {
  const { noteId } = useParams()
  const [numCards, setNumCards] = useState(10)
  const [cards, setCards] = useState(null)
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setCards(null)
    setCurrent(0)
    setFlipped(false)
    try {
      const data = await generateFlashcards(noteId, numCards)
      if (!data.cards?.length) {
        toast.error('Could not generate flashcards. Please try again.')
        return
      }
      setCards(data.cards)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function goTo(index) {
    setFlipped(false)
    setCurrent(index)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/notes/${noteId}`} className="text-slate-400 hover:text-slate-600">
          <FiArrowLeft size={20} />
        </Link>
        <h1 className="page-title">Flashcards</h1>
      </div>

      {!cards && (
        <div className="card space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Number of Flashcards</label>
            <input
              type="range"
              min={5}
              max={30}
              step={5}
              value={numCards}
              onChange={(e) => setNumCards(Number(e.target.value))}
              className="w-full mt-2 accent-primary"
            />
            <p className="text-sm text-center text-primary font-semibold mt-1">{numCards} cards</p>
          </div>
          <button onClick={handleGenerate} disabled={loading} className="btn-primary w-full">
            {loading ? <Spinner size={18} /> : 'Generate Flashcards'}
          </button>
        </div>
      )}

      {cards && (
        <div className="space-y-5">
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Card {current + 1} of {cards.length} — tap to flip
          </p>

          <div
            className="flip-card h-64 cursor-pointer"
            onClick={() => setFlipped((prev) => !prev)}
          >
            <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
              <div className="flip-card-front card h-full flex items-center justify-center text-center">
                <p className="text-lg font-medium text-slate-800 dark:text-white">{cards[current].question}</p>
              </div>
              <div className="flip-card-back card h-full flex items-center justify-center text-center bg-primary/5">
                <p className="text-base text-slate-700 dark:text-slate-200">{cards[current].answer}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => goTo(Math.max(0, current - 1))}
              disabled={current === 0}
              className="btn-secondary"
            >
              <FiChevronLeft size={16} /> Prev
            </button>
            <button onClick={handleGenerate} className="btn-secondary text-xs">
              <FiRefreshCw size={13} /> New Set
            </button>
            <button
              onClick={() => goTo(Math.min(cards.length - 1, current + 1))}
              disabled={current === cards.length - 1}
              className="btn-secondary"
            >
              Next <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
