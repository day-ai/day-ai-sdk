import { IconTrash } from '@tabler/icons-react'
import type { Note } from '../types'

interface SidebarProps {
  notes: Note[]
  currentNoteId: string | null
  onSelectNote: (id: string) => void
  onDeleteNote: (id: string) => void
}

export default function Sidebar({
  notes,
  currentNoteId,
  onSelectNote,
  onDeleteNote,
}: SidebarProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="h-full flex flex-col glass-panel">
      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-2 pt-2">
        {notes.map((note) => (
          <div
            key={note.id}
            onClick={() => onSelectNote(note.id)}
            className={`group flex items-center justify-between px-3 py-2 mb-1 rounded-xl cursor-pointer transition-all duration-200 ${
              currentNoteId === note.id
                ? 'bg-white/15 text-white'
                : 'hover:bg-white/10 text-white/80'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {note.title || 'Untitled'}
              </div>
              <div className="text-xs text-white/40">
                {formatDate(note.updatedAt)}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteNote(note.id)
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-red-400 transition-all duration-200"
            >
              <IconTrash size={14} />
            </button>
          </div>
        ))}

        {notes.length === 0 && (
          <div className="px-3 py-8 text-center text-white/40 text-sm">
            No notes yet
          </div>
        )}
      </div>
    </div>
  )
}
