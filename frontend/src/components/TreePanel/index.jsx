import { useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import ConversationNode from './ConversationNode'
import useTreeStore from '../../store/treeStore'
import useChatStore from '../../store/chatStore'
import './TreePanel.css'

const nodeTypes = { conversationNode: ConversationNode }

export default function TreePanel() {
  const storeNodes      = useTreeStore(s => s.flowNodes)
  const storeEdges      = useTreeStore(s => s.flowEdges)
  const updateFlowNodes = useTreeStore(s => s.updateFlowNodes)
  const activeSessionId = useTreeStore(s => s.activeSessionId)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // 当 store 里的树数据更新时同步到 React Flow 内部状态
  useEffect(() => {
    setNodes(storeNodes)
    setEdges(storeEdges)
  }, [storeNodes, storeEdges, setNodes, setEdges])

  // 拖拽结束后把当前完整节点列表（含更新后的位置）同步回 store
  // 注意：onNodeDragStop 的第三个参数只含被拖拽的节点，不能用于此处
  const onNodeDragStop = useCallback(
    () => updateFlowNodes(nodes),
    [nodes, updateFlowNodes],
  )

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
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#313244" gap={24} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor="#6366f1"
          maskColor="rgba(0,0,0,0.6)"
          style={{ background: '#181825' }}
        />
      </ReactFlow>
    </div>
  )
}
