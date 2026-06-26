import { useCallback, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  reconnectEdge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import ConversationNode from './ConversationNode'
import useTreeStore from '../../store/treeStore'
import './TreePanel.css'

const nodeTypes = { conversationNode: ConversationNode }

export default function TreePanel() {
  const storeNodes      = useTreeStore(s => s.flowNodes)
  const storeEdges      = useTreeStore(s => s.flowEdges)
  const updateFlowNodes = useTreeStore(s => s.updateFlowNodes)
  const reparentNode    = useTreeStore(s => s.reparentNode)
  const activeSessionId = useTreeStore(s => s.activeSessionId)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // store → ReactFlow 内部状态同步
  useEffect(() => {
    setNodes(storeNodes)
    setEdges(storeEdges)
  }, [storeNodes, storeEdges, setNodes, setEdges])

  // 拖拽节点结束后把位置同步回 store
  const onNodeDragStop = useCallback(
    () => updateFlowNodes(nodes),
    [nodes, updateFlowNodes],
  )

  // ── 边重接 ──────────────────────────────────────────────────
  // 用 ref 追踪本次重接是否成功落到了有效节点上
  const reconnectSuccess = useRef(true)

  const onReconnectStart = useCallback(() => {
    reconnectSuccess.current = false
  }, [])

  const onReconnect = useCallback(
    (oldEdge, newConnection) => {
      reconnectSuccess.current = true

      // source 不变只是 target 端被拖动时，target 仍是子节点
      // source 变化意味着子节点换了父节点
      const childId     = oldEdge.target
      const newParentId = newConnection.source

      if (newParentId === oldEdge.source) return   // 没有实际变化

      // 先乐观更新视图
      setEdges(els => reconnectEdge(oldEdge, newConnection, els))
      // 再持久化到后端（失败时 reparentNode 内部会回滚）
      reparentNode(childId, newParentId)
    },
    [setEdges, reparentNode],
  )

  const onReconnectEnd = useCallback(
    (_, edge) => {
      if (!reconnectSuccess.current) {
        // 用户松手时没有落在有效节点上 → 恢复原始边
        setEdges(storeEdges)
      }
      reconnectSuccess.current = true
    },
    [setEdges, storeEdges],
  )
  // ────────────────────────────────────────────────────────────

  if (!activeSessionId) {
    return (
      <div className="tree-panel tree-panel--empty">
        <p>选择左侧会话，或新建一个会话开始探索</p>
      </div>
    )
  }

  return (
    <div className="tree-panel">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onReconnectStart={onReconnectStart}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(255,255,255,0.04)" gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor="rgba(255,255,255,0.35)"
          maskColor="rgba(0,0,0,0.72)"
          style={{ background: '#1c1c1e' }}
        />
      </ReactFlow>
    </div>
  )
}
