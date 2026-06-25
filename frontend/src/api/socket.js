const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

let ws = null
let currentSessionId = null
const handlers = new Map()   // event -> Set<callback>

function on(event, cb) {
  if (!handlers.has(event)) handlers.set(event, new Set())
  handlers.get(event).add(cb)
  return () => handlers.get(event)?.delete(cb)   // 返回取消订阅函数
}

function emit(event, data) {
  handlers.get(event)?.forEach(cb => cb(data))
}

function connect(sessionId) {
  if (ws && currentSessionId === sessionId) return
  disconnect()

  currentSessionId = sessionId
  ws = new WebSocket(`${WS_BASE}/ws/${sessionId}`)

  ws.onmessage = (e) => {
    try {
      const { event, data } = JSON.parse(e.data)
      emit(event, data)
    } catch { /* 忽略 */ }
  }

  ws.onclose = () => {
    ws = null
    // 3s 后自动重连（如果还在同一 session）
    setTimeout(() => {
      if (currentSessionId === sessionId) connect(sessionId)
    }, 3000)
  }

  ws.onerror = () => ws?.close()
}

function disconnect() {
  if (ws) {
    ws.onclose = null   // 防止触发重连
    ws.close()
    ws = null
    currentSessionId = null
  }
}

// 发送 ping 保持连接（可选）
function ping() {
  if (ws?.readyState === WebSocket.OPEN) ws.send('ping')
}

export default { connect, disconnect, on, ping }
