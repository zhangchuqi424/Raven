import { useEffect, useState } from 'react'
import useTreeStore from '../../store/treeStore'
import useChatStore from '../../store/chatStore'
import useSettingsStore from '../../store/settingsStore'
import socket from '../../api/socket'
import SettingsPanel from '../SettingsPanel'
import './SessionSidebar.css'

export default function SessionSidebar() {
  const sessions         = useTreeStore(s => s.sessions)
  const activeSessionId  = useTreeStore(s => s.activeSessionId)
  const loadSessions     = useTreeStore(s => s.loadSessions)
  const newSession       = useTreeStore(s => s.newSession)
  const removeSession    = useTreeStore(s => s.removeSession)
  const setActiveSession = useTreeStore(s => s.setActiveSession)
  const addNode          = useTreeStore(s => s.addNode)
  const updateNodeInStore = useTreeStore(s => s.updateNodeInStore)

  const setActiveParent  = useChatStore(s => s.setActiveParent)

  const provider         = useSettingsStore(s => s.provider)
  const loadSettings     = useSettingsStore(s => s.load)

  const [creating, setCreating]       = useState(false)
  const [newName, setNewName]         = useState('')
  const [showSettings, setShowSettings] = useState(false)

  // 初始加载
  useEffect(() => {
    loadSessions()
    loadSettings()
  }, [loadSessions, loadSettings])

  // 当 activeSession 变化时，重连 WebSocket
  useEffect(() => {
    if (!activeSessionId) return
    socket.connect(activeSessionId)

    const unsubCreated = socket.on('node_created', (node) => {
      addNode(node)
    })
    const unsubUpdated = socket.on('node_updated', (node) => {
      updateNodeInStore(node)
    })
    return () => { unsubCreated(); unsubUpdated() }
  }, [activeSessionId, addNode])

  async function handleNew() {
    if (creating) {
      const name = newName.trim() || '新会话'
      await newSession(name)
      setActiveParent(null)
      setCreating(false)
      setNewName('')
    } else {
      setCreating(true)
      setTimeout(() => document.getElementById('new-session-input')?.focus(), 50)
    }
  }

  function handleSelect(id) {
    if (id === activeSessionId) return
    setActiveSession(id)
    setActiveParent(null)
    socket.connect(id)
  }

  return (
    <aside className="session-sidebar">
      <div className="session-sidebar__header">
        <span className="session-sidebar__logo">🪶</span>
        <span className="session-sidebar__title">Raven</span>
      </div>

      <button className="session-sidebar__new-btn" onClick={handleNew}>
        {creating ? '确认创建' : '+ 新建会话'}
      </button>

      {creating && (
        <input
          id="new-session-input"
          className="session-sidebar__name-input"
          placeholder="会话名称"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleNew() }}
        />
      )}

      <ul className="session-sidebar__list">
        {sessions.map(s => (
          <li
            key={s.id}
            className={`session-sidebar__item ${s.id === activeSessionId ? 'active' : ''}`}
            onClick={() => handleSelect(s.id)}
          >
            <span className="session-sidebar__item-name">{s.name}</span>
            <button
              className="session-sidebar__delete-btn"
              onClick={(e) => { e.stopPropagation(); removeSession(s.id) }}
              title="删除会话"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {/* 底部设置区 */}
      <div className="session-sidebar__footer">
        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}
        <button
          className={`session-sidebar__settings-btn ${showSettings ? 'active' : ''}`}
          onClick={() => setShowSettings(v => !v)}
        >
          <span>⚙</span>
          <span>模型设置</span>
          {provider && (
            <span className="session-sidebar__provider-badge">{provider}</span>
          )}
        </button>
      </div>
    </aside>
  )
}
