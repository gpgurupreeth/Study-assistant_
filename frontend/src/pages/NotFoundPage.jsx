import { Link } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface dark:bg-surface-dark px-4 text-center">
      <p className="text-7xl font-extrabold text-primary">404</p>
      <h1 className="text-xl font-semibold text-slate-800 dark:text-white mt-3">Page not found</h1>
      <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/dashboard" className="btn-primary mt-6">
        <FiArrowLeft size={16} /> Back to Dashboard
      </Link>
    </div>
  )
}
