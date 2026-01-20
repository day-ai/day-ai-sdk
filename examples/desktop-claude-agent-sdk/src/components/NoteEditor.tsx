import { useState, useEffect, useCallback, useRef } from 'react'
import type { Note } from '../types'

interface NoteEditorProps {
  note: Note
  onUpdateNote: (id: string, updates: Partial<Note>) => Promise<void>
}

export default function NoteEditor({ note, onUpdateNote }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Update local state when note changes
  useEffect(() => {
    setTitle(note.title)
    setContent(note.content)
  }, [note.id, note.title, note.content])

  // Debounced save
  const debouncedSave = useCallback(
    (updates: Partial<Note>) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        onUpdateNote(note.id, updates)
      }, 500)
    },
    [note.id, onUpdateNote]
  )

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    debouncedSave({ title: newTitle })
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    debouncedSave({ content: newContent })
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-surface-900 border-b border-white/[0.06]">
        <input
          ref={titleInputRef}
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="flex-1 bg-transparent text-lg font-semibold text-neutral-100 placeholder-neutral-500 focus:outline-none"
        />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto p-6">
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing..."
          className="w-full h-full min-h-[calc(100vh-200px)] bg-transparent text-neutral-200 placeholder-neutral-500 focus:outline-none resize-none leading-relaxed"
        />
      </div>
    </div>
  )
}
