import { useState, useRef, useEffect } from 'react'
import useChatStore from '../../store/chatStore'
import useTreeStore from '../../store/treeStore'
import './InputBox.css'

export default function InputBox() {
  const [text, setText]       = useState('')
  const [mode, setMode]       = useState('ai')   // 'ai' | 'note'
  const textareaRef           = useRef(null)

  const sendMessage  = useChatStore(s => s.sendMessage)
  const addNote      = useChatStore(s => s.addNote)
  const isLoading    = useChatStore(s => s.isLoading)
  const activeParentId = useChatStore(s => s.activeParentId)
  const error        = useChatStore(s => s.error)

  const rawNodes       = useTreeStore(s => s.rawNodes)
  const activeSessionId = useTreeStore(s => s.activeSessionId)

  const isNote = mode === 'note'

  const activeNode = rawNodes.find(n => n.id === activeParentId)
  const branchLabel = activeNode
    ? `继续自：${activeNode.summary || activeNode.question.slice(0, 20)}`
    : '新的起点'

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const q = text.trim()
    if (!q || isLoading) return
    isNote ? addNote(q) : sendMessage(q)
    setText('')
    textareaRef.current?.focus()
  }

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [text])

  if (!activeSessionId) return null

  return (
    <div className="input-box">
      {/* 模式切换 */}
      <div className="input-box__mode-tabs">
        <button
          className={`input-box__tab ${!isNote ? 'active-ai' : ''}`}
          onClick={() => setMode('ai')}
        >
          AI 对话
        </button>
        <button
          className={`input-box__tab ${isNote ? 'active-note' : ''}`}
          onClick={() => setMode('note')}
        >
          笔记
        </button>
      </div>

      {error && <div className="input-box__error">{error}</div>}

      <div className={`input-box__branch-label ${isNote ? 'note-mode' : ''}`}>
        {branchLabel}
      </div>

      <div className="input-box__row">
        <textarea
          ref={textareaRef}
          className={`input-box__textarea ${isNote ? 'note-mode' : ''}`}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isNote ? '写下你的想法、洞察或笔记…' : '输入问题，Enter 发送，Shift+Enter 换行'}
          rows={1}
          disabled={isLoading}
        />
        <button
          className={`input-box__send ${isNote ? 'note-mode' : ''}`}
          onClick={submit}
          disabled={isLoading || !text.trim()}
        >
          {isLoading ? '…' : isNote ? '✓' : '↑'}
        </button>
      </div>
    </div>
  )
}
