import { create } from 'zustand'
import { getSessions, createSession, deleteSession, getTree } from '../api/http'

/**
 * 将节点列表转换为 React Flow 需要的 nodes + edges 格式
 * 节点横向排列：根节点在左，子节点往右展开
 */
function buildFlowGraph(rawNodes) {
  if (!rawNodes.length) return { nodes: [], edges: [] }

  // 构建父子映射
  const childrenMap = new Map()
  rawNodes.forEach(n => {
    if (!childrenMap.has(n.parent_id)) childrenMap.set(n.parent_id, [])
    childrenMap.get(n.parent_id).push(n)
  })

  // BFS 布局：层级 = 深度，同层节点竖向排列
  const NODE_W = 180
  const NODE_H = 70
  const H_GAP = 60
  const V_GAP = 24

  const positions = new Map()
  const queue = [{ id: null, depth: 0, yOffset: 0 }]
  let depthCounters = {}   // depth -> 已占用 y 槽数

  function assignPositions(parentId, depth) {
    const kids = childrenMap.get(parentId) || []
    kids.forEach(kid => {
      const slot = depthCounters[depth] || 0
      depthCounters[depth] = slot + 1
      positions.set(kid.id, {
        x: depth * (NODE_W + H_GAP),
        y: slot * (NODE_H + V_GAP),
      })
      assignPositions(kid.id, depth + 1)
    })
  }
  assignPositions(null, 0)

  const flowNodes = rawNodes.map(n => ({
    id: n.id,
    type: 'conversationNode',
    position: positions.get(n.id) || { x: 0, y: 0 },
    data: {
      summary:   n.summary || n.question.slice(0, 20),
      question:  n.question,
      answer:    n.answer,
      node_type: n.node_type || 'ai',
      parent_id: n.parent_id,
    },
  }))

  const flowEdges = rawNodes
    .filter(n => n.parent_id)
    .map(n => ({
      id:     `e-${n.parent_id}-${n.id}`,
      source: n.parent_id,
      target: n.id,
      type:   'smoothstep',
      style:  { stroke: '#6366f1', strokeWidth: 1.5 },
    }))

  return { nodes: flowNodes, edges: flowEdges }
}


const useTreeStore = create((set, get) => ({
  sessions:          [],
  activeSessionId:   null,
  rawNodes:          [],   // 原始节点列表（完整数据）
  flowNodes:         [],   // React Flow nodes
  flowEdges:         [],   // React Flow edges

  // ─── Sessions ───────────────────────────────────────────
  async loadSessions() {
    const sessions = await getSessions()
    set({ sessions })
  },

  async newSession(name = '新会话') {
    const session = await createSession(name)
    set(s => ({ sessions: [session, ...s.sessions] }))
    get().setActiveSession(session.id)
    return session
  },

  async removeSession(id) {
    await deleteSession(id)
    const next = get().sessions.filter(s => s.id !== id)
    set({ sessions: next })
    if (get().activeSessionId === id) {
      const fallback = next[0]?.id || null
      get().setActiveSession(fallback)
    }
  },

  // ─── Tree ────────────────────────────────────────────────
  async setActiveSession(sessionId) {
    set({ activeSessionId: sessionId, rawNodes: [], flowNodes: [], flowEdges: [] })
    if (!sessionId) return

    const { nodes: raw } = await getTree(sessionId)
    const { nodes: flowNodes, edges: flowEdges } = buildFlowGraph(raw)
    set({ rawNodes: raw, flowNodes, flowEdges })
  },

  /** 节点创建完成后，把新节点追加进树（自动去重，SSE 和 WebSocket 都会触发）*/
  addNode(node) {
    set(s => {
      if (s.rawNodes.some(n => n.id === node.id)) return {}  // 已存在，忽略
      const raw = [...s.rawNodes, node]
      const { nodes: flowNodes, edges: flowEdges } = buildFlowGraph(raw)
      return { rawNodes: raw, flowNodes, flowEdges }
    })
  },

  /** 重新布局（拖拽后同步位置） */
  updateFlowNodes(nodes) {
    set({ flowNodes: nodes })
  },

  buildFlowGraph,
}))

export default useTreeStore
