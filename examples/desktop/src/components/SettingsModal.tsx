import { useState, useEffect } from 'react'
import { IconX, IconEye, IconEyeOff, IconPlugConnected, IconLoader2 } from '@tabler/icons-react'
import type { AppConfig, MCPServerConfig } from '../types'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSettingsChanged?: () => void
}

export default function SettingsModal({ isOpen, onClose, onSettingsChanged }: SettingsModalProps) {
  const [config, setConfig] = useState<AppConfig>({})
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [mcpServers, setMcpServers] = useState<MCPServerConfig[]>([])
  const [connectingServerId, setConnectingServerId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadConfig()
      loadMcpServers()
    }
  }, [isOpen])

  const loadConfig = async () => {
    const loadedConfig = await window.dayai.getConfig()
    setConfig(loadedConfig)
  }

  const loadMcpServers = async () => {
    const servers = await window.dayai.mcp.getServers()
    setMcpServers(servers)
  }

  const handleMcpConnect = async (serverId: string) => {
    setConnectingServerId(serverId)
    try {
      await window.dayai.mcp.connect(serverId)
      await loadMcpServers()
    } catch (error) {
      console.error(`Failed to connect ${serverId}:`, error)
    } finally {
      setConnectingServerId(null)
    }
  }

  const handleMcpDisconnect = async (serverId: string) => {
    try {
      await window.dayai.mcp.disconnect(serverId)
      await loadMcpServers()
    } catch (error) {
      console.error(`Failed to disconnect ${serverId}:`, error)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { mcpServers: _ignored, ...configWithoutMcp } = config
      await window.dayai.setConfig(configWithoutMcp)
      onSettingsChanged?.()
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="glass-elevated rounded-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <IconX size={20} stroke={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Anthropic API Key */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Anthropic API Key
            </label>
            <div className="relative">
              <input
                type={showAnthropicKey ? 'text' : 'password'}
                value={config.anthropicApiKey || ''}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, anthropicApiKey: e.target.value }))
                }
                placeholder="sk-ant-..."
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
              >
                {showAnthropicKey ? (
                  <IconEyeOff size={18} stroke={1.5} />
                ) : (
                  <IconEye size={18} stroke={1.5} />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-white/40">
              Used for AI chat features. Get your key at{' '}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 hover:text-primary-400"
              >
                console.anthropic.com
              </a>
            </p>
          </div>

          {/* Integrations */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Integrations
            </label>
            <div className="space-y-2">
              {mcpServers.map((server) => (
                <div
                  key={server.id}
                  className="flex items-center justify-between bg-black/20 border border-white/10 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <IconPlugConnected
                      size={20}
                      stroke={1.5}
                      className={server.connected ? 'text-green-500' : 'text-white/40'}
                    />
                    <div>
                      <div className="text-sm font-medium text-white">{server.name}</div>
                      <div className="text-xs text-white/40">
                        {server.connected ? 'Connected' : 'Not connected'}
                      </div>
                    </div>
                  </div>
                  {server.connected ? (
                    <button
                      type="button"
                      onClick={() => handleMcpDisconnect(server.id)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/30 transition-all duration-200"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleMcpConnect(server.id)}
                      disabled={connectingServerId === server.id}
                      className="px-3 py-1.5 text-xs rounded-lg glass-button text-white transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {connectingServerId === server.id && (
                        <IconLoader2 size={14} className="animate-spin" />
                      )}
                      {connectingServerId === server.id ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
                </div>
              ))}
              {mcpServers.length === 0 && (
                <div className="text-sm text-white/40 py-2">
                  No integrations available
                </div>
              )}
            </div>
            <p className="mt-1.5 text-xs text-white/40">
              Connect to Day AI to access CRM data, contacts, and meeting insights.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-transparent border border-white/20 text-white/80 hover:bg-white/10 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl glass-button text-white font-medium transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
