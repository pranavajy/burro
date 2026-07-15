export type AIProviderId =
	| 'trial'
	| 'openai'
	| 'anthropic'
	| 'google'
	| 'ollama'
	| 'custom'

export interface AIProviderConfig {
	id: AIProviderId
	model: string
	baseUrl?: string
	apiKey?: string
}

export const AI_PROVIDER_STORAGE_KEY = 'burro.aiProvider'
const AI_PROVIDER_SECRET_KEY = 'burro.aiProvider.apiKey'

export const DEFAULT_PROVIDER_CONFIGS: Record<AIProviderId, AIProviderConfig> = {
	trial: { id: 'trial', model: 'gemini-3.5-flash' },
	openai: { id: 'openai', model: 'gpt-5.2' },
	anthropic: { id: 'anthropic', model: 'claude-sonnet-5' },
	google: { id: 'google', model: 'gemini-3.5-flash' },
	ollama: {
		id: 'ollama',
		model: 'gpt-oss:20b',
		baseUrl: 'http://localhost:11434/v1',
	},
	custom: { id: 'custom', model: '', baseUrl: '' },
}

export function getStoredAIProviderConfig(): AIProviderConfig | null {
	try {
		const raw = localStorage.getItem(AI_PROVIDER_STORAGE_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw) as Partial<AIProviderConfig>
		if (!parsed.id || !(parsed.id in DEFAULT_PROVIDER_CONFIGS)) return null
		return {
			...DEFAULT_PROVIDER_CONFIGS[parsed.id],
			...parsed,
			apiKey: sessionStorage.getItem(AI_PROVIDER_SECRET_KEY) || undefined,
		}
	} catch {
		return null
	}
}

export function saveAIProviderConfig(config: AIProviderConfig) {
	const { apiKey, ...persisted } = config
	localStorage.setItem(AI_PROVIDER_STORAGE_KEY, JSON.stringify(persisted))
	if (apiKey) sessionStorage.setItem(AI_PROVIDER_SECRET_KEY, apiKey)
	else sessionStorage.removeItem(AI_PROVIDER_SECRET_KEY)
}

export function isAIProviderReady(config: AIProviderConfig | null): boolean {
	if (!config?.model.trim()) return false
	if (config.id === 'trial') return true
	if (config.id === 'ollama') return Boolean(config.baseUrl?.trim())
	if (config.id === 'custom') return Boolean(config.baseUrl?.trim())
	return Boolean(config.apiKey?.trim())
}

