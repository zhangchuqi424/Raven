import { useEffect, useState } from 'react'
import useSettingsStore from '../../store/settingsStore'
import './SettingsPanel.css'

const PROVIDER_PRESETS = {
  anthropic: {
    base_url: 'https://api.anthropic.com',
    model:    'claude-opus-4-8',
  },
  openai: {
    base_url: 'https://api.openai.com/v1',
    model:    'gpt-4o',
  },
  deepseek: {
    base_url: 'https://api.deepseek.com/v1',
    model:    'deepseek-chat',
    provider: 'openai',   // 使用 openai-compatible 模式
  },
  groq: {
    base_url: 'https://api.groq.com/openai/v1',
    model:    'llama-3.3-70b-versatile',
    provider: 'openai',
  },
}

export default function SettingsPanel({ onClose }) {
  const store = useSettingsStore()

  const [form, setForm] = useState({
    provider:   'anthropic',
    api_key:    '',
    base_url:   '',
    model:      '',
    max_tokens: 2048,
  })
  const [showKey, setShowKey] = useState(false)

  // 初始加载 & 表单同步
  useEffect(() => {
    store.load().then(() => {
      const s = useSettingsStore.getState()
      setForm({
        provider:   s.provider   || 'anthropic',
        api_key:    '',           // 脱敏后不回填，留空表示不修改
        base_url:   s.base_url   || '',
        model:      s.model      || '',
        max_tokens: s.max_tokens || 2048,
      })
    })
  }, [])

  function handleProviderShortcut(name) {
    const preset = PROVIDER_PRESETS[name]
    if (!preset) return
    setForm(f => ({
      ...f,
      provider: preset.provider || name,
      base_url: preset.base_url,
      model:    preset.model,
    }))
  }

  async function handleSave() {
    const patch = {
      provider:   form.provider,
      base_url:   form.base_url  || null,
      model:      form.model,
      max_tokens: Number(form.max_tokens),
    }
    // 只有用户填了新 key 才发送
    if (form.api_key.trim()) patch.api_key = form.api_key.trim()

    await store.save(patch)
    if (!useSettingsStore.getState().error) onClose?.()
  }

  return (
    <div className="settings-panel">
      <div className="settings-panel__head">
        <span>⚙ 模型设置</span>
        <button className="settings-panel__close" onClick={onClose}>✕</button>
      </div>

      {/* 快捷切换 */}
      <div className="settings-panel__shortcuts">
        {Object.keys(PROVIDER_PRESETS).map(name => (
          <button
            key={name}
            className="settings-panel__chip"
            onClick={() => handleProviderShortcut(name)}
          >
            {name}
          </button>
        ))}
      </div>

      <label className="settings-panel__label">
        Provider
        <select
          value={form.provider}
          onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
        >
          <option value="anthropic">anthropic</option>
          <option value="openai">openai (compatible)</option>
        </select>
      </label>

      <label className="settings-panel__label">
        Base URL
        <input
          type="text"
          placeholder="留空使用 provider 默认地址"
          value={form.base_url}
          onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))}
        />
      </label>

      <label className="settings-panel__label">
        Model
        <input
          type="text"
          placeholder="模型名称，如 claude-opus-4-8"
          value={form.model}
          onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
        />
      </label>

      <label className="settings-panel__label">
        API Key
        <div className="settings-panel__key-row">
          <input
            type={showKey ? 'text' : 'password'}
            placeholder="留空则不修改当前 key"
            value={form.api_key}
            onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
          />
          <button
            className="settings-panel__eye"
            onClick={() => setShowKey(v => !v)}
            tabIndex={-1}
          >
            {showKey ? '🙈' : '👁'}
          </button>
        </div>
        {store.api_key && (
          <span className="settings-panel__key-hint">当前：{store.api_key}</span>
        )}
      </label>

      <label className="settings-panel__label">
        Max Tokens
        <input
          type="number"
          min={256}
          max={32768}
          step={256}
          value={form.max_tokens}
          onChange={e => setForm(f => ({ ...f, max_tokens: e.target.value }))}
        />
      </label>

      {store.error && (
        <div className="settings-panel__error">{store.error}</div>
      )}

      <button
        className="settings-panel__save"
        onClick={handleSave}
        disabled={store.saving}
      >
        {store.saving ? '保存中…' : '保存'}
      </button>
    </div>
  )
}
