import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit2, FiTrash2, FiFileText, FiUploadCloud, FiBook } from 'react-icons/fi'
import { listSubjects, createSubject, updateSubject, deleteSubject } from '../services/subjectService'
import { listNotes } from '../services/noteService'
import { PageLoader, EmptyState, Modal } from '../components/Common'
import { getErrorMessage } from '../services/api'

const COLOR_OPTIONS = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2']

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', color: COLOR_OPTIONS[0] })
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [notesBySubject, setNotesBySubject] = useState({})

  function loadSubjects() {
    setLoading(true)
    listSubjects()
      .then(setSubjects)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadSubjects()
  }, [])

  function openCreateModal() {
    setEditingSubject(null)
    setForm({ name: '', description: '', color: COLOR_OPTIONS[0] })
    setModalOpen(true)
  }

  function openEditModal(subject) {
    setEditingSubject(subject)
    setForm({ name: subject.name, description: subject.description || '', color: subject.color })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Subject name is required.')
      return
    }
    setSaving(true)
    try {
      if (editingSubject) {
        await updateSubject(editingSubject.id, form)
        toast.success('Subject updated.')
      } else {
        await createSubject(form)
        toast.success('Subject created.')
      }
      setModalOpen(false)
      loadSubjects()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(subject) {
    if (!window.confirm(`Delete "${subject.name}" and all its notes? This cannot be undone.`)) return
    try {
      await deleteSubject(subject.id)
      toast.success('Subject deleted.')
      loadSubjects()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  async function toggleExpand(subject) {
    if (expandedId === subject.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(subject.id)
    if (!notesBySubject[subject.id]) {
      try {
        const notes = await listNotes(subject.id)
        setNotesBySubject((prev) => ({ ...prev, [subject.id]: notes }))
      } catch (err) {
        toast.error(getErrorMessage(err))
      }
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Organize your notes by subject.</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <FiPlus size={16} /> New Subject
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FiBook}
            title="No subjects yet"
            description="Create your first subject to start uploading notes."
            action={<button onClick={openCreateModal} className="btn-primary">Create Subject</button>}
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <div key={subject.id} className="card flex flex-col">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: subject.color }}
                  >
                    {subject.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">{subject.name}</h3>
                    <p className="text-xs text-slate-400">{subject.note_count} note(s)</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditModal(subject)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg">
                    <FiEdit2 size={15} />
                  </button>
                  <button onClick={() => handleDelete(subject)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg">
                    <FiTrash2 size={15} />
                  </button>
                </div>
              </div>

              {subject.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">{subject.description}</p>
              )}

              <div className="mt-4 flex gap-2">
                <Link to={`/subjects/${subject.id}/upload`} className="btn-secondary flex-1 text-sm py-2">
                  <FiUploadCloud size={15} /> Upload
                </Link>
                <button onClick={() => toggleExpand(subject)} className="btn-secondary flex-1 text-sm py-2">
                  <FiFileText size={15} /> Notes
                </button>
              </div>

              {expandedId === subject.id && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  {!notesBySubject[subject.id] ? (
                    <p className="text-xs text-slate-400 py-2">Loading notes...</p>
                  ) : notesBySubject[subject.id].length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">No notes uploaded yet.</p>
                  ) : (
                    notesBySubject[subject.id].map((note) => (
                      <Link
                        key={note.id}
                        to={`/notes/${note.id}`}
                        className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <span className="truncate text-slate-700 dark:text-slate-200">{note.title}</span>
                        <span className="text-xs text-slate-400 uppercase ml-2 shrink-0">{note.file_type}</span>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSubject ? 'Edit Subject' : 'New Subject'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field mt-1"
              placeholder="e.g. Data Structures"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field mt-1"
              rows={2}
              placeholder="Short description"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Color</label>
            <div className="flex gap-2 mt-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setForm({ ...form, color })}
                  className={`h-8 w-8 rounded-full border-2 ${form.color === color ? 'border-slate-800 dark:border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
