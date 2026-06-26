import { useState, useRef, useEffect } from 'react'
import { Handle, Position } from '@xyflow/react'
import useChatStore from '../../store/chatStore'
import './ConversationNode.css'

export default function ConversationNode({ id, data }) {
  const selectedNodeId    = useChatStore(s => s.selectedNodeId)
  const activeParentId    = useChatStore(s => s.activeParentId)
  const selectNode        = useChatStore(s => s.selectNode)
  const setActiveParent   = useChatStore(s => s.setActiveParent)
  const updateNoteContent = useChatStore(s => s.updateNoteContent)

  const isSelected = selectedNodeId === id
  const isActive   = activeParentId === id
  const isNote     = data.node_type === 'note'

  const [editing,  setEditing]  = useState(false)
  const [editText, setEditText] = useState('')
  const textareaRef = useRef(null)

  // 进入编辑态时自动聚焦 & 调整高度
  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [editing])

  function startEdit(e) {
    e.stopPropagation()
    setEditText(data.question)   // 完整内容（非截断 summary）
    setEditing(true)
  }

  async function commitEdit(e) {
    e?.stopPropagation()
    const trimmed = editText.trim()
    if (!trimmed || trimmed === data.question) { cancelEdit(); return }
    await updateNoteContent(id, trimmed)
    setEditing(false)
  }

  function cancelEdit(e) {
    e?.stopPropagation()
    setEditing(false)
  }

  function handleKeyDown(e) {
    e.stopPropagation()
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') cancelEdit()
  }

  function handleTextareaChange(e) {
    setEditText(e.target.value)
    // 自动撑高
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  return (
    <div
      className={[
        'conv-node',
        isNote     ? 'conv-node--note'     : 'conv-node--ai',
        isSelected ? 'selected' : '',
        isActive   ? 'active'   : '',
        editing    ? 'editing'  : '',
      ].join(' ')}
      onClick={() => !editing && selectNode(id)}
      onDoubleClick={isNote && !editing ? startEdit : undefined}
    >
      <Handle type="target" position={Position.Left} />

      {editing ? (
        /* ── 编辑态 ── */
        <div className="conv-node__edit" onClick={e => e.stopPropagation()}>
          <textarea
            ref={textareaRef}
            className="conv-node__edit-area"
            value={editText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <div className="conv-node__edit-actions">
            <button className="conv-node__edit-save"   onClick={commitEdit}>保存</button>
            <button className="conv-node__edit-cancel" onClick={cancelEdit}>取消</button>
          </div>
        </div>
      ) : (
        /* ── 展示态 ── */
        <>
          <div className="conv-node__header">
            <span className="conv-node__icon">{isNote ? '✏️' : '💬'}</span>
            <span className="conv-node__summary">{data.summary}</span>
          </div>

          {isSelected && (
            <div className="conv-node__actions">
              <button
                className="conv-node__branch-btn"
                onClick={e => { e.stopPropagation(); setActiveParent(id) }}
              >
                从此处继续 →
              </button>
              {isNote && (
                <button
                  className="conv-node__edit-btn"
                  onClick={startEdit}
                  title="双击节点也可编辑"
                >
                  编辑
                </button>
              )}
            </div>
          )}
        </>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  )
}
