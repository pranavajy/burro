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
const AI_PROVIDERS_STORAGE_KEY = 'burro.aiProviders'
const AI_PROVIDER_SECRET_KEY = 'burro.aiProvider.apiKey'

function getProviderSecretKey(id: AIProviderId) {
	return `${AI_PROVIDER_SECRET_KEY}.${id}`
}

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
			apiKey:
				sessionStorage.getItem(getProviderSecretKey(parsed.id)) ||
				sessionStorage.getItem(AI_PROVIDER_SECRET_KEY) ||
				undefined,
		}
	} catch {
		return null
	}
}

export function getStoredAIProviderConfigs(): AIProviderConfig[] {
	try {
		const raw = localStorage.getItem(AI_PROVIDERS_STORAGE_KEY)
		const stored = raw ? (JSON.parse(raw) as Array<Partial<AIProviderConfig>>) : []
		const configs: AIProviderConfig[] = Array.isArray(stored)
			? stored
				.filter((config): config is Partial<AIProviderConfig> & { id: AIProviderId } => Boolean(config.id && config.id in DEFAULT_PROVIDER_CONFIGS))
				.map((config) => ({
					...DEFAULT_PROVIDER_CONFIGS[config.id],
					...config,
					apiKey: sessionStorage.getItem(getProviderSecretKey(config.id)) || undefined,
				}))
			: []

		const active = getStoredAIProviderConfig()
		if (active && !configs.some((config) => config.id === active.id)) configs.unshift(active)
		return configs
	} catch {
		const active = getStoredAIProviderConfig()
		return active ? [active] : []
	}
}

export function saveAIProviderConfig(config: AIProviderConfig) {
	const { apiKey, ...persisted } = config
	localStorage.setItem(AI_PROVIDER_STORAGE_KEY, JSON.stringify(persisted))
	const storedConfigs = getStoredAIProviderConfigs().map(({ apiKey: _apiKey, ...stored }) => stored)
	const nextConfigs = [persisted, ...storedConfigs.filter((stored) => stored.id !== config.id)]
	localStorage.setItem(AI_PROVIDERS_STORAGE_KEY, JSON.stringify(nextConfigs))
	if (apiKey) sessionStorage.setItem(getProviderSecretKey(config.id), apiKey)
	else sessionStorage.removeItem(getProviderSecretKey(config.id))
	sessionStorage.removeItem(AI_PROVIDER_SECRET_KEY)
}

export function isAIProviderReady(config: AIProviderConfig | null): boolean {
	if (!config?.model.trim()) return false
	if (config.id === 'trial') return true
	if (config.id === 'ollama') return Boolean(config.baseUrl?.trim())
	if (config.id === 'custom') return Boolean(config.baseUrl?.trim())
	return Boolean(config.apiKey?.trim())
}
