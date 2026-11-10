import { Link } from 'react-router-dom'
import {
  FiZap, FiUploadCloud, FiMessageSquare, FiHelpCircle, FiLayers,
  FiCalendar, FiArrowRight,
} from 'react-icons/fi'

const features = [
  {
    icon: FiUploadCloud,
    title: 'Upload Any Notes',
    description: 'Drop in PDFs, Word docs, or plain text lecture notes and let the AI take over.',
  },
  {
    icon: FiMessageSquare,
    title: 'Ask AI Anything',
    description: 'Get answers grounded strictly in your own notes — no hallucinated content.',
  },
  {
    icon: FiHelpCircle,
    title: 'Instant Quizzes',
    description: 'Generate 5, 10, or 15 MCQs with explanations to test your understanding.',
  },
  {
    icon: FiLayers,
    title: 'Flashcards',
    description: 'Auto-generated flip flashcards for fast spaced-repetition revision.',
  },
  {
    icon: FiCalendar,
    title: 'Study Planner',
    description: 'Tell us your exam date and daily hours — get a day-by-day revision schedule.',
  },
  {
    icon: FiZap,
    title: 'Mock Papers',
    description: 'Practice with exam-style short and long questions generated from your notes.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark">
      <header className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <FiZap className="text-white" size={20} />
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-white">Study Assistant</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-secondary">Log In</Link>
          <Link to="/register" className="btn-primary">Get Started</Link>
        </div>
      </header>

      <section className="max-w-4xl mx-auto text-center px-6 pt-16 pb-20">
        <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-5">
          Built for students, by students
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight">
          Stop re-reading lecture notes. <span className="text-primary">Start understanding them.</span>
        </h1>
        <p className="mt-5 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          Upload your notes and let AI generate summaries, quizzes, flashcards, mock papers,
          and personalized study plans — so you spend less time reading and more time learning.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/register" className="btn-primary text-base px-6 py-3">
            Try it Free <FiArrowRight />
          </Link>
          <Link to="/login" className="btn-secondary text-base px-6 py-3">
            I already have an account
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="card">
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Icon size={20} />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-white">{title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-100 dark:border-slate-800 py-6 text-center text-sm text-slate-400">
        Built with React, FastAPI, and Groq LLaMA.
      </footer>
    </div>
  )
}
