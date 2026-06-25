import { Handle, Position } from '@xyflow/react'
import useChatStore from '../../store/chatStore'
import './ConversationNode.css'

export default function ConversationNode({ id, data }) {
  const selectedNodeId  = useChatStore(s => s.selectedNodeId)
  const activeParentId  = useChatStore(s => s.activeParentId)
  const selectNode      = useChatStore(s => s.selectNode)
  const setActiveParent = useChatStore(s => s.setActiveParent)

  const isSelected = selectedNodeId === id
  const isActive   = activeParentId === id
  const isNote     = data.node_type === 'note'

  return (
    <div
      className={[
        'conv-node',
        isNote     ? 'conv-node--note'     : 'conv-node--ai',
        isSelected ? 'selected' : '',
        isActive   ? 'active'   : '',
      ].join(' ')}
      onClick={() => selectNode(id)}
    >
      <Handle type="target" position={Position.Left} />

      <div className="conv-node__header">
        <span className="conv-node__icon">{isNote ? '✏️' : '💬'}</span>
        <span className="conv-node__summary">{data.summary}</span>
      </div>

      {isSelected && (
        <button
          className="conv-node__branch-btn"
          onClick={(e) => { e.stopPropagation(); setActiveParent(id) }}
        >
          从此处继续 →
        </button>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  )
}
