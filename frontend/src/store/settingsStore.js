import { create } from 'zustand'
import { getSettings, updateSettings } from '../api/http'

const useSettingsStore = create((set, get) => ({
  // 当前配置（api_key 已由后端脱敏）
  provider:   'anthropic',
  api_key:    '',
  base_url:   '',
  model:      '',
  max_tokens: 2048,

  // UI 状态
  loaded:  false,
  saving:  false,
  error:   null,

  async load() {
    try {
      const cfg = await getSettings()
      set({ ...cfg, loaded: true, error: null })
    } catch (e) {
      set({ error: e.message })
    }
  },

  async save(patch) {
    set({ saving: true, error: null })
    try {
      const cfg = await updateSettings(patch)
      set({ ...cfg, saving: false })
    } catch (e) {
      set({ saving: false, error: e.message })
    }
  },
}))

export default useSettingsStore
