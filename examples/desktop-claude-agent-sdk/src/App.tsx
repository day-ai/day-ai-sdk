import { useState, useEffect, useCallback } from 'react'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import ChatPane from './components/ChatPane'
import SettingsModal from './components/SettingsModal'
import NoteEditor from './components/NoteEditor'
import type { Note } from './types'

function App() {
  const [notes, setNotes] = useState<Note[]>([])
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null)

  // Sidebar visibility state
  const [leftSidebarVisible, setLeftSidebarVisible] = useState(true)
  const [rightSidebarVisible, setRightSidebarVisible] = useState(true)

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false)
  const [configVersion, setConfigVersion] = useState(0)

  const currentNote = notes.find((n) => n.id === currentNoteId) || null

  // Load notes on mount
  useEffect(() => {
    loadNotes()
  }, [])

  // Keyboard shortcuts for sidebar toggles
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+B (Mac) or Ctrl+B (Windows/Linux) - toggle left sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setLeftSidebarVisible((prev) => !prev)
      }
      // Cmd+L (Mac) or Ctrl+L (Windows/Linux) - toggle right sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        setRightSidebarVisible((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadNotes = async () => {
    const loadedNotes = await window.dayai.getNotes()
    setNotes(loadedNotes)
    if (loadedNotes.length > 0 && !currentNoteId) {
      setCurrentNoteId(loadedNotes[0].id)
    }
  }

  const handleCreateNote = async () => {
    const newNote = await window.dayai.createNote()
    setNotes((prev) => [newNote, ...prev])
    setCurrentNoteId(newNote.id)
  }

  const handleUpdateNote = useCallback(
    async (id: string, updates: Partial<Note>) => {
      await window.dayai.updateNote(id, updates)
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
        )
      )
    },
    []
  )

  const handleDeleteNote = async (id: string) => {
    await window.dayai.deleteNote(id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (currentNoteId === id) {
      const remaining = notes.filter((n) => n.id !== id)
      setCurrentNoteId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  // Handle note update from chat (agent updated the note)
  const handleNoteUpdateFromChat = useCallback(
    async (noteId: string) => {
      const updatedNote = await window.dayai.getNote(noteId)
      if (updatedNote) {
        setNotes((prev) => prev.map((n) => (n.id === noteId ? updatedNote : n)))
      }
    },
    []
  )

  // Handle notes changed from chat (agent created a new note)
  const handleNotesChangedFromChat = useCallback(async () => {
    await loadNotes()
  }, [])

  return (
    <div className="flex flex-col h-screen bg-surface-950 text-neutral-100">
      {/* Top bar */}
      <TopBar
        leftSidebarVisible={leftSidebarVisible}
        rightSidebarVisible={rightSidebarVisible}
        onToggleLeftSidebar={() => setLeftSidebarVisible((prev) => !prev)}
        onToggleRightSidebar={() => setRightSidebarVisible((prev) => !prev)}
        onNewNote={handleCreateNote}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        {leftSidebarVisible && (
          <div className="w-64 flex-shrink-0">
            <Sidebar
              notes={notes}
              currentNoteId={currentNoteId}
              onSelectNote={setCurrentNoteId}
              onDeleteNote={handleDeleteNote}
            />
          </div>
        )}

        {/* Main content - Editor */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {currentNote ? (
            <NoteEditor
              note={currentNote}
              onUpdateNote={handleUpdateNote}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-white/50">
              <div className="text-center">
                <p className="mb-4">No note selected</p>
                <button
                  onClick={handleCreateNote}
                  className="px-4 py-2 rounded-xl glass-button text-white font-medium"
                >
                  Create a note
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar - Chat */}
        {rightSidebarVisible && (
          <div className="w-80 flex-shrink-0">
            <ChatPane
              currentNote={currentNote}
              onNoteUpdate={handleNoteUpdateFromChat}
              onNotesChanged={handleNotesChangedFromChat}
              configVersion={configVersion}
            />
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsChanged={() => setConfigVersion((v) => v + 1)}
      />
    </div>
  )
}

export default App
