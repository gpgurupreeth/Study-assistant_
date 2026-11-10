import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiMenu, FiMoon, FiSun, FiSearch, FiLogOut, FiChevronDown } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { searchNotes } from '../services/noteService'
import toast from 'react-hot-toast'

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  async function handleSearch(e) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    try {
      const results = await searchNotes(searchQuery.trim())
      if (results.length === 0) {
        toast('No notes matched your search.')
      } else {
        navigate(`/notes/${results[0].id}`)
      }
    } catch {
      toast.error('Search failed. Please try again.')
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 px-4 sm:px-6 sticky top-0 z-30">
      <button className="lg:hidden text-slate-500" onClick={onMenuClick} aria-label="Open menu">
        <FiMenu size={22} />
      </button>

      <form onSubmit={handleSearch} className="flex-1 max-w-md relative hidden sm:block">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search your notes..."
          className="input-field pl-9 py-2 text-sm"
        />
      </form>

      <div className="flex-1 sm:flex-none" />

      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
      </button>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 pl-2"
        >
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
            {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-200">
            {user?.full_name?.split(' ')[0]}
          </span>
          <FiChevronDown size={14} className="hidden sm:block text-slate-400" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-card z-20 overflow-hidden">
              <button
                onClick={() => { setMenuOpen(false); navigate('/profile') }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Profile Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-2"
              >
                <FiLogOut size={14} /> Logout
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
