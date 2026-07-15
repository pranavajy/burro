import { Bot } from 'lucide-react'
import { AIProviderId } from '@burro/core'
import claudeLogo from './logos/Claude_AI_symbol.svg.png'
import geminiLogo from './logos/Google-gemini-icon.svg.png'
import ollamaLogo from './logos/Ollama-logo.svg'
import openAILogo from './logos/openai.svg'

const PROVIDER_LOGOS: Partial<Record<AIProviderId, string>> = {
	trial: geminiLogo,
	openai: openAILogo,
	anthropic: claudeLogo,
	google: geminiLogo,
	ollama: ollamaLogo,
}

interface ProviderLogoProps {
	provider: AIProviderId
	className?: string
}

export function ProviderLogo({ provider, className = 'h-4 w-4' }: ProviderLogoProps) {
	const source = PROVIDER_LOGOS[provider]
	if (!source) return <Bot className={className} aria-hidden="true" />

	const logoTreatment = provider === 'openai'
		? 'brightness-0 invert opacity-90'
		: ''
	return (
		<img
			src={source}
			alt=""
			aria-hidden="true"
			className={`object-contain ${logoTreatment} ${className}`}
		/>
	)
}
