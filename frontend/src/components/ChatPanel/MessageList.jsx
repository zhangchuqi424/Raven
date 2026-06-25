import { useEffect, useRef } from 'react'
import useTreeStore from '../../store/treeStore'
import useChatStore from '../../store/chatStore'
import './MessageList.css'

export default function MessageList() {
  const rawNodes         = useTreeStore(s => s.rawNodes)
  const selectedNodeId   = useChatStore(s => s.selectedNodeId)
  const streamingText    = useChatStore(s => s.streamingText)
  const streamingQuestion = useChatStore(s => s.streamingQuestion)
  const isLoading        = useChatStore(s => s.isLoading)
  const error            = useChatStore(s => s.error)

  const bottomRef = useRef(null)

  // 找出所选节点的祖先链（根→叶，用于展示上下文）
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
          // ── 用户笔记节点 ──
          <div key={node.id} className="msg-note">
            <span className="msg-note__label">✏️ 想法</span>
            <p className="msg-note__content">{node.question}</p>
          </div>
        ) : (
          // ── AI 对话节点 ──
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

      {/* 流式输出中显示 */}
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

      {/* 错误提示 */}
      {error && !isLoading && (
        <div className="msg-error">{error}</div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
