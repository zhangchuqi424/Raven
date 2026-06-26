const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json()
}

// Notes（用户自己的想法节点，不经过 LLM）
export const createNote = ({ session_id, parent_id, content }) =>
  request('/nodes/note', { method: 'POST', body: JSON.stringify({ session_id, parent_id, content }) })

// 更新节点（内容 / 父节点）
export const updateNode = ({ node_id, content, parent_id }) =>
  request(`/nodes/${node_id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...(content   !== undefined && { content }),
      ...(parent_id !== undefined && { parent_id }),
    }),
  })

// Settings
export const getSettings    = ()       => request('/settings')
export const updateSettings = (patch)  => request('/settings', { method: 'POST', body: JSON.stringify(patch) })

// Sessions
export const getSessions    = ()           => request('/sessions')
export const createSession  = (name)       => request('/sessions', { method: 'POST', body: JSON.stringify({ name }) })
export const deleteSession  = (id)         => request(`/sessions/${id}`, { method: 'DELETE' })
export const getTree        = (sessionId)  => request(`/sessions/${sessionId}/tree`)

/**
 * 创建节点，流式读取 SSE 响应。
 * onDelta(chunk: string) — 每收到一块文字调用
 * onDone(node: object)   — 流式结束后调用
 */
export async function createNode({ session_id, parent_id, question }, onDelta, onDone) {
  const res = await fetch(`${BASE}/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, parent_id, question }),
  })

  if (!res.ok) throw new Error(`${res.status}: ${await res.text().catch(() => '')}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n\n')
    buffer = lines.pop() ?? ''   // 未完成的片段留给下次

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      let msg
      try { msg = JSON.parse(line.slice(6)) } catch { continue }  // 跳过非 JSON 行

      if (msg.type === 'delta') onDelta(msg.content)
      if (msg.type === 'done')  onDone(msg.node)
      if (msg.type === 'error') throw new Error(msg.message || 'LLM 出错')
    }
  }
}
