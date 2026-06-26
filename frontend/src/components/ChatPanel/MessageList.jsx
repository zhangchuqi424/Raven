import { useEffect, useRef, useState } from 'react'
import useTreeStore from '../../store/treeStore'
import useChatStore from '../../store/chatStore'
import './MessageList.css'

export default function MessageList() {
  const rawNodes          = useTreeStore(s => s.rawNodes)
  const selectedNodeId    = useChatStore(s => s.selectedNodeId)
  const streamingText     = useChatStore(s => s.streamingText)
  const streamingQuestion = useChatStore(s => s.streamingQuestion)
  const isLoading         = useChatStore(s => s.isLoading)
  const error             = useChatStore(s => s.error)
  const updateNoteContent = useChatStore(s => s.updateNoteContent)

  const [editingId, setEditingId] = useState(null)
  const [editText,  setEditText]  = useState('')
  const textareaRef = useRef(null)
  const bottomRef   = useRef(null)

  // 找出所选节点的祖先链（根→叶）
  const nodeMap = new Map(rawNodes.map(n => [n.id, n]))

  function getAncestorChain(nodeId) {
    const chain = []
    let cur = nodeId
    while (cur) {
      const n = nodeMap.get(cur)
      if (!n) break
      chain.unshift(n)
      cur = n.parent_id
    }
    return chain
  }

  const chain = selectedNodeId ? getAncestorChain(selectedNodeId) : []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chain.length, streamingText])

  // 进入编辑时自动聚焦 & 撑高
  useEffect(() => {
    if (editingId && textareaRef.current) {
      const el = textareaRef.current
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [editingId])

  function startEdit(node) {
    setEditText(node.question)
    setEditingId(node.id)
  }

  async function commitEdit() {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== nodeMap.get(editingId)?.question) {
      await updateNoteContent(editingId, trimmed)
    }
    setEditingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') cancelEdit()
  }

  function handleTextareaChange(e) {
    setEditText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  if (!selectedNodeId && !isLoading) {
    return (
      <div className="msg-list msg-list--empty">
        <p>点击树上的节点查看对话历史</p>
      </div>
    )
  }

  return (
    <div className="msg-list">
      {chain.map((node) =>
        node.node_type === 'note' ? (
          /* ── 想法节点 ── */
          <div key={node.id} className="msg-note">
            <div className="msg-note__header">
              <span className="msg-note__label">想法</span>
              {editingId !== node.id && (
                <button
                  className="msg-note__edit-btn"
                  onClick={() => startEdit(node)}
                >
                  编辑
                </button>
              )}
            </div>

            {editingId === node.id ? (
              /* 编辑态 */
              <div className="msg-note__edit">
                <textarea
                  ref={textareaRef}
                  className="msg-note__textarea"
                  value={editText}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <div className="msg-note__edit-actions">
                  <button className="msg-note__save-btn"   onClick={commitEdit}>保存</button>
                  <button className="msg-note__cancel-btn" onClick={cancelEdit}>取消</button>
                </div>
              </div>
            ) : (
              /* 展示态 */
              <p className="msg-note__content">{node.question}</p>
            )}
          </div>
        ) : (
          /* ── AI 对话节点 ── */
          <div key={node.id} className="msg-pair">
            <div className="msg msg--user">
              <span className="msg__role">You</span>
              <p>{node.question}</p>
            </div>
            {node.answer && (
              <div className="msg msg--ai">
                <span className="msg__role">Raven</span>
                <p className="msg__content">{node.answer}</p>
              </div>
            )}
          </div>
        )
      )}

      {/* 流式输出中 */}
      {isLoading && (
        <div className="msg-pair">
          <div className="msg msg--user">
            <span className="msg__role">You</span>
            <p>{streamingQuestion}</p>
          </div>
          <div className="msg msg--ai msg--streaming">
            <span className="msg__role">Raven</span>
            <p className="msg__content">
              {streamingText || <span className="msg__cursor" />}
            </p>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="msg-error">{error}</div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
