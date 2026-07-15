import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
	Check,
	ChevronLeft,
	Copy,
	Eye,
	EyeOff,
	KeyRound,
	ShieldCheck,
	Sparkles,
	X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
	AIProviderConfig,
	AIProviderId,
	DEFAULT_PROVIDER_CONFIGS,
	isAIProviderReady,
	saveAIProviderConfig,
} from '@burro/core'
import { ProviderLogo } from './ProviderLogo'

interface ProviderOnboardingProps {
	initialConfig: AIProviderConfig | null
	initialView?: 'providers' | 'details'
	canClose: boolean
	onCancel?: () => void
	onClose: (config: AIProviderConfig) => void
}

const PROVIDERS: Array<{
	id: AIProviderId
	name: string
	description: string
	badge?: string
}> = [
	{ id: 'trial', name: 'Free trial', description: 'Start instantly with Burro’s hosted Gemini model.', badge: 'Fastest' },
	{ id: 'openai', name: 'OpenAI', description: 'Use your OpenAI API key and preferred GPT model.' },
	{ id: 'anthropic', name: 'Claude', description: 'Connect Anthropic with your own API key.' },
	{ id: 'google', name: 'Gemini', description: 'Use a Google AI Studio API key with grounding.' },
	{ id: 'ollama', name: 'Ollama', description: 'Run a local or remotely hosted open model.', badge: 'Local' },
	{ id: 'custom', name: 'Any agent', description: 'Connect an OpenAI-compatible model or agent endpoint.' },
]

const PROVIDER_HELP: Record<AIProviderId, { title: string; steps: string[]; keyUrl?: string }> = {
	trial: {
		title: 'Nothing to configure',
		steps: ['Burro supplies the API access.', 'Trial usage may be rate-limited.', 'You can switch providers from the canvas settings at any time.'],
	},
	openai: {
		title: 'Connect OpenAI',
		steps: ['Create an API key in the OpenAI platform.', 'Paste it below and confirm the model available to your project.', 'API usage is billed by OpenAI to your account.'],
		keyUrl: 'https://platform.openai.com/api-keys',
	},
	anthropic: {
		title: 'Connect Claude',
		steps: ['Create an API key in the Claude Console.', 'Paste it below and choose a model your account can access.', 'API usage is billed by Anthropic to your account.'],
		keyUrl: 'https://console.anthropic.com/settings/keys',
	},
	google: {
		title: 'Connect Gemini',
		steps: ['Create a key in Google AI Studio.', 'Paste it below and select a Gemini model.', 'Gemini responses can include Google Search grounding.'],
		keyUrl: 'https://aistudio.google.com/apikey',
	},
	ollama: {
		title: 'Connect Ollama',
		steps: ['Install Ollama and pull a model, for example: ollama pull gpt-oss:20b', 'Keep Ollama running and use its OpenAI-compatible /v1 endpoint.', 'If Burro is hosted, allow Burro’s web origin with OLLAMA_ORIGINS and restart Ollama.'],
		keyUrl: 'https://ollama.com/download',
	},
	custom: {
		title: 'Connect any compatible agent',
		steps: ['Provide an HTTPS endpoint compatible with OpenAI chat completions.', 'Enter the exact model or agent identifier expected by that endpoint.', 'Add a bearer token if the endpoint requires authentication.'],
	},
}

export function ProviderOnboarding({ initialConfig, initialView = 'details', canClose, onCancel, onClose }: ProviderOnboardingProps) {
	const shouldReduceMotion = useReducedMotion()
	const [selectedId, setSelectedId] = useState<AIProviderId | null>(
		initialView === 'providers' ? null : initialConfig?.id ?? null
	)
	const [config, setConfig] = useState<AIProviderConfig | null>(initialConfig)
	const [showKey, setShowKey] = useState(false)
	const [copied, setCopied] = useState(false)

	const selectedProvider = useMemo(
		() => PROVIDERS.find((provider) => provider.id === selectedId),
		[selectedId]
	)
	const help = selectedId ? PROVIDER_HELP[selectedId] : null

	const chooseProvider = (id: AIProviderId) => {
		setSelectedId(id)
		setConfig(initialConfig?.id === id ? initialConfig : { ...DEFAULT_PROVIDER_CONFIGS[id] })
	}

	const updateConfig = (changes: Partial<AIProviderConfig>) => {
		setConfig((current) => (current ? { ...current, ...changes } : current))
	}

	const finish = () => {
		if (!config || !isAIProviderReady(config)) return
		saveAIProviderConfig(config)
		onClose(config)
	}

	const envName = selectedId === 'openai'
		? 'OPENAI_API_KEY'
		: selectedId === 'anthropic'
			? 'ANTHROPIC_API_KEY'
			: selectedId === 'google'
				? 'GOOGLE_GENERATIVE_AI_API_KEY'
				: null

	return (
		<motion.div
			className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-xl pointer-events-auto"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
		>
			<motion.div
				className="relative flex max-h-[min(760px,calc(100vh-32px))] w-full max-w-[920px] flex-col overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#171719] shadow-[0_30px_100px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.045)]"
				initial={shouldReduceMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				exit={{ opacity: 0, y: 10, scale: 0.985 }}
				transition={{ type: 'spring', stiffness: 390, damping: 34 }}
				role="dialog"
				aria-modal="true"
				aria-label="Choose your AI provider"
			>
				{canClose && (
					<button
						type="button"
						onClick={() => {
							if (onCancel) onCancel()
							else if (initialConfig) onClose(initialConfig)
						}}
						className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
						aria-label="Close provider settings"
					>
						<X className="h-4 w-4" />
					</button>
				)}

				<div className="border-b border-white/[0.06] px-7 py-6 sm:px-9">
					<h1 className="text-[26px] font-semibold tracking-[-0.035em] text-zinc-100 sm:text-[30px]">
						{selectedId ? `Continue with ${selectedProvider?.name}` : 'Choose how Burro should think'}
					</h1>
					<p className="mt-2 max-w-2xl text-[13px] leading-5 text-zinc-500">
						{selectedId ? 'Review the setup below. You can change this later without affecting your canvases.' : 'Bring your preferred model, run locally, connect any compatible agent, or start on the hosted trial.'}
					</p>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
					<AnimatePresence mode="wait" initial={false}>
						{!selectedId ? (
							<motion.div key="providers" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
								{PROVIDERS.map(({ id, name, description, badge }) => (
									<button
										key={id}
										type="button"
										onClick={() => chooseProvider(id)}
										className="group relative min-h-[154px] rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-violet-400/35 hover:bg-violet-500/[0.055] hover:shadow-[0_14px_34px_rgba(0,0,0,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
									>
										<div className="flex items-start justify-between">
										<span className={`flex h-10 w-10 items-center justify-center rounded-xl border text-zinc-400 group-hover:text-violet-300 ${id === 'ollama' ? 'border-white bg-white' : 'border-white/[0.07] bg-[#202023]'}`}><ProviderLogo provider={id} className="h-[18px] w-[18px]" /></span>
											{badge && <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-violet-300">{badge}</span>}
										</div>
										<div className="mt-4 text-[15px] font-semibold text-zinc-200">{name}</div>
										<div className="mt-1 text-[11px] leading-4 text-zinc-500">{description}</div>
									</button>
								))}
							</motion.div>
						) : (
							<motion.div key={selectedId} className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
								<div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
									<h2 className="text-[15px] font-semibold text-zinc-200">{help?.title}</h2>
									<div className="mt-5 space-y-4">
										{help?.steps.map((step, index) => (
											<div key={step} className="flex gap-3 text-[12px] leading-5 text-zinc-500">
												<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.045] text-[10px] font-semibold text-zinc-400">{index + 1}</span>
												<span>{step}</span>
											</div>
										))}
									</div>
									{help?.keyUrl && (
										<a href={help.keyUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.07]">
											{selectedId === 'ollama' ? 'Download Ollama' : 'Create an API key'}
										</a>
									)}
								</div>

								<div className="rounded-2xl border border-white/[0.07] bg-[#121214] p-5 sm:p-6">
									{selectedId === 'trial' ? (
										<div className="flex min-h-[230px] flex-col items-center justify-center text-center">
											<span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-300"><Sparkles className="h-6 w-6" /></span>
											<div className="mt-4 text-[16px] font-semibold text-zinc-200">Ready when you are</div>
											<p className="mt-2 max-w-xs text-[12px] leading-5 text-zinc-500">No API key, local runtime, or billing account required to get started.</p>
										</div>
									) : (
										<div className="space-y-4">
											{selectedId !== 'ollama' && (
												<label className="block">
													<span className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500"><KeyRound className="h-3 w-3" /> {selectedId === 'custom' ? 'Bearer token · optional' : 'API key'}</span>
													<div className="relative">
														<input type={showKey ? 'text' : 'password'} value={config?.apiKey ?? ''} onChange={(event) => updateConfig({ apiKey: event.target.value })} placeholder={selectedId === 'custom' ? 'Optional' : 'Paste your key'} autoComplete="off" className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 pr-11 text-[12px] text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-violet-400/45" />
														<button type="button" onClick={() => setShowKey((visible) => !visible)} className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 hover:bg-white/[0.05] hover:text-zinc-300" aria-label={showKey ? 'Hide API key' : 'Show API key'}>{showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
													</div>
												</label>
											)}

							{(selectedId === 'ollama' || selectedId === 'custom') && (
								<div>
								<label className="block">
									<span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">OpenAI-compatible base URL</span>
									<input type="url" value={config?.baseUrl ?? ''} onChange={(event) => updateConfig({ baseUrl: event.target.value })} placeholder="https://agent.example.com/v1" className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-[12px] text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-violet-400/45" />
								</label>
								{selectedId === 'ollama' && (
									<div className="mt-2 rounded-xl border border-amber-400/10 bg-amber-400/[0.035] px-3 py-2.5 text-[10px] leading-4 text-amber-100/55">
										Opening <code className="text-amber-200/70">/v1/</code> itself may show “page not found”—that is normal. Verify Ollama at{' '}
										<a href={`${(config?.baseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '')}/models`} target="_blank" rel="noreferrer" className="font-medium text-amber-200/80 underline underline-offset-2">/v1/models</a>.
									</div>
								)}
								</div>
							)}

											<label className="block">
												<span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Model / agent ID</span>
												<input type="text" value={config?.model ?? ''} onChange={(event) => updateConfig({ model: event.target.value })} placeholder="Enter the exact model ID" className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-[12px] text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-violet-400/45" />
											</label>

											{envName && (
												<div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
													<div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-wider text-zinc-600"><span>Self-hosting</span><button type="button" onClick={() => { navigator.clipboard.writeText(`${envName}=your_api_key`); setCopied(true); window.setTimeout(() => setCopied(false), 1400) }} className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300">{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copied ? 'Copied' : 'Copy'}</button></div>
													<code className="mt-2 block overflow-x-auto text-[11px] text-violet-300">{envName}=your_api_key</code>
												</div>
											)}
										</div>
									)}

									<div className="mt-5 flex items-start gap-2 border-t border-white/[0.06] pt-4 text-[10px] leading-4 text-zinc-600">
										<ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500/70" />
										<span>{selectedId === 'trial' ? 'The hosted trial uses Burro’s server-side key.' : 'Your key is kept only for this browser tab session and is never saved by Burro’s server.'}</span>
									</div>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				<div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-4 sm:px-7">
					{selectedId ? (
						<button type="button" onClick={() => setSelectedId(null)} className="flex h-10 items-center gap-2 rounded-xl px-3 text-[12px] font-medium text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-300"><ChevronLeft className="h-4 w-4" /> All providers</button>
					) : <span />}
					<button type="button" onClick={finish} disabled={!selectedId || !isAIProviderReady(config)} className="h-10 rounded-xl bg-violet-600 px-5 text-[12px] font-semibold text-white shadow-[0_8px_22px_rgba(109,40,217,0.28)] transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-white/[0.05] disabled:text-zinc-700 disabled:shadow-none">
						{!selectedId ? 'Choose a provider' : selectedId === 'trial' ? 'Start free trial' : 'Save and continue'}
					</button>
				</div>
			</motion.div>
		</motion.div>
	)
}
