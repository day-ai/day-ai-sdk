import { useState, useEffect } from 'react'
import { IconLayoutSidebar, IconSparkles, IconPlus, IconSettings } from '@tabler/icons-react'

interface TopBarProps {
  leftSidebarVisible: boolean
  rightSidebarVisible: boolean
  onToggleLeftSidebar: () => void
  onToggleRightSidebar: () => void
  onNewNote: () => void
  onOpenSettings: () => void
}

export default function TopBar({
  leftSidebarVisible,
  rightSidebarVisible,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onNewNote,
  onOpenSettings,
}: TopBarProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    window.dayai.getIsFullscreen().then(setIsFullscreen)
    const unsubscribe = window.dayai.onFullscreenChange(setIsFullscreen)
    return unsubscribe
  }, [])

  return (
    <div className="h-[52px] flex-shrink-0 glass-panel border-b border-white/[0.06] drag-region flex items-center justify-between px-3">
      {/* Left side - traffic lights area + sidebar toggle + new note */}
      <div className="flex items-center gap-1 no-drag">
        {/* Spacer for traffic lights (macOS) - hide in fullscreen */}
        {!isFullscreen && <div className="w-[70px]" />}

        <button
          onClick={onToggleLeftSidebar}
          className={`p-2 rounded-lg transition-all duration-200 ${
            leftSidebarVisible
              ? 'text-white hover:bg-white/10'
              : 'text-white/50 hover:bg-white/10 hover:text-white/80'
          }`}
          title={leftSidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
        >
          <IconLayoutSidebar size={20} stroke={1.5} />
        </button>

        <button
          onClick={onNewNote}
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
          title="New note"
        >
          <IconPlus size={20} stroke={1.5} />
        </button>
      </div>

      {/* Center spacer for drag region */}
      <div className="flex-1" />

      {/* Right side - settings + chat sidebar toggle */}
      <div className="flex items-center gap-1 no-drag">
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
          title="Settings"
        >
          <IconSettings size={20} stroke={1.5} />
        </button>

        <button
          onClick={onToggleRightSidebar}
          className={`p-2 rounded-lg transition-all duration-200 ${
            rightSidebarVisible
              ? 'text-white hover:bg-white/10'
              : 'text-white/50 hover:bg-white/10 hover:text-white/80'
          }`}
          title={rightSidebarVisible ? 'Hide chat' : 'Show chat'}
        >
          <IconSparkles size={20} stroke={1.5} />
        </button>
      </div>
    </div>
  )
}
