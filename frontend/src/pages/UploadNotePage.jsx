import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiUploadCloud, FiFile, FiX } from 'react-icons/fi'
import { uploadNote } from '../services/noteService'
import { getErrorMessage } from '../services/api'

const ACCEPTED_TYPES = ['.pdf', '.txt', '.docx']
const MAX_SIZE_MB = 15

export default function UploadNotePage() {
  const { subjectId } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  function validateAndSetFile(selectedFile) {
    if (!selectedFile) return
    const ext = '.' + selectedFile.name.split('.').pop().toLowerCase()
    if (!ACCEPTED_TYPES.includes(ext)) {
      toast.error('Only PDF, TXT, and DOCX files are supported.')
      return
    }
    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File must be smaller than ${MAX_SIZE_MB}MB.`)
      return
    }
    setFile(selectedFile)
    if (!title) setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''))
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragActive(false)
    validateAndSetFile(e.dataTransfer.files?.[0])
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) {
      toast.error('Please select a file to upload.')
      return
    }
    if (!title.trim()) {
      toast.error('Please give this note a title.')
      return
    }

    setUploading(true)
    setProgress(0)
    try {
      const note = await uploadNote({
        subjectId,
        title: title.trim(),
        file,
        onProgress: setProgress,
      })
      toast.success('Note uploaded and processed!')
      navigate(`/notes/${note.id}`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Upload Notes</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Upload a PDF, DOCX, or TXT file to generate AI-powered study material.
        </p>
      </div>

      <form onSubmit={handleUpload} className="card space-y-5">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="hidden"
            onChange={(e) => validateAndSetFile(e.target.files?.[0])}
          />

          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FiFile className="text-primary" size={28} />
              <div className="text-left">
                <p className="font-medium text-slate-800 dark:text-white text-sm">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null) }}
                className="text-slate-400 hover:text-red-500"
              >
                <FiX size={18} />
              </button>
            </div>
          ) : (
            <>
              <FiUploadCloud className="mx-auto text-slate-400" size={32} />
              <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                Drag & drop your file here, or click to browse
              </p>
              <p className="text-xs text-slate-400 mt-1">PDF, DOCX, or TXT — up to {MAX_SIZE_MB}MB</p>
            </>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Note Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field mt-1"
            placeholder="e.g. Lecture 5 - Binary Trees"
          />
        </div>

        {uploading && (
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div className="bg-primary h-2 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <button type="submit" disabled={uploading} className="btn-primary w-full">
          {uploading ? `Uploading... ${progress}%` : 'Upload & Process'}
        </button>
      </form>
    </div>
  )
}
