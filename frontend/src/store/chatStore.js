import { create } from 'zustand'
import { createNode, createNote, updateNode } from '../api/http'
import useTreeStore from './treeStore'

const useChatStore = create((set, get) => ({
  // 当前选中的节点（点击树节点时设置）
  selectedNodeId: null,
  // 当前活跃节点（发送消息时挂在其下）
  activeParentId: null,
  // 正在发送的问题（用于流式显示）
  streamingQuestion: '',
  // 流式输出中的临时文本
  streamingText:  '',
  // 是否正在请求
  isLoading:      false,
  // 错误信息
  error:          null,

  selectNode(nodeId) {
    set({ selectedNodeId: nodeId })
  },

  setActiveParent(nodeId) {
    set({ activeParentId: nodeId, selectedNodeId: nodeId })
  },

  async updateNoteContent(nodeId, content) {
    set({ error: null })
    try {
      const updated = await updateNode({ node_id: nodeId, content })
      useTreeStore.getState().updateNodeInStore(updated)
    } catch (err) {
      set({ error: err.message })
    }
  },

  async addNote(content) {
    const sessionId = useTreeStore.getState().activeSessionId
    if (!sessionId || !content.trim()) return

    const { activeParentId } = get()
    set({ isLoading: true, error: null })
    try {
      const node = await createNote({ session_id: sessionId, parent_id: activeParentId, content })
      useTreeStore.getState().addNode(node)
      set({ isLoading: false, activeParentId: node.id, selectedNodeId: node.id })
    } catch (err) {
      set({ isLoading: false, error: err.message })
    }
  },

  async sendMessage(question) {
    const { activeParentId, isLoading } = get()
    if (isLoading || !question.trim()) return

    const sessionId = useTreeStore.getState().activeSessionId
    if (!sessionId) return

    set({ isLoading: true, streamingText: '', streamingQuestion: question, error: null })

    try {
      await createNode(
        { session_id: sessionId, parent_id: activeParentId, question },
        // onDelta
        (chunk) => set(s => ({ streamingText: s.streamingText + chunk })),
        // onDone
        (node) => {
          useTreeStore.getState().addNode(node)
          set({
            isLoading:         false,
            streamingText:     '',
            streamingQuestion: '',
            activeParentId:    node.id,   // 自动切换到新节点
            selectedNodeId:    node.id,
          })
        },
      )
    } catch (err) {
      set({ isLoading: false, streamingQuestion: '', error: err.message })
    }
  },
}))

export default useChatStore
