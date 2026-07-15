import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { ArrowRight, Check, GitBranch, Network, SearchCheck } from 'lucide-react'
import branchingPreview from '../ui_screenshots/landing-branching-detail.png'
import canvasPreview from '../ui_screenshots/landing-canvas-overview.png'
import emptyStatePreview from '../ui_screenshots/landing-empty-state.png'
import sidebarPreview from '../ui_screenshots/landing-sidebar-history.png'
import sourcesPreview from '../ui_screenshots/landing-sources-detail.png'
import { ProviderLogo } from './components/ProviderLogo'

interface LandingPageProps {
	onOpenApp: () => void
}

const features = [
	{
		number: '01',
		icon: GitBranch,
		title: 'Branch without losing context',
		copy: 'Open a new line of inquiry from any answer or highlighted concept. Every branch keeps its place in the larger thought.',
	},
	{
		number: '02',
		icon: SearchCheck,
		title: 'See the evidence',
		copy: 'Inspect sources behind important claims and distinguish grounded facts from the model’s own synthesis.',
	},
	{
		number: '03',
		icon: Network,
		title: 'Keep the whole idea visible',
		copy: 'Arrange, collapse, and revisit your research spatially instead of digging through an endless chat transcript.',
	},
]

const pricingTiers = [
	{
		name: 'Community',
		description: 'For curious minds exploring locally with their own models.',
		monthlyPrice: 0,
		annualPrice: 0,
		status: 'Available now',
		cta: 'Start free',
		features: ['Unlimited local canvases', 'OpenAI, Claude, Gemini, and Ollama', 'Bring your own API keys', 'Branching and evidence cards', 'Community support'],
	},
	{
		name: 'Pro',
		description: 'For individuals who want their research everywhere.',
		monthlyPrice: 15,
		annualPrice: 12,
		status: 'Cloud · Coming soon',
		cta: 'Get early access',
		featured: true,
		features: ['Everything in Community', 'Cross-device cloud sync', 'Unlimited private canvases', 'Share links and rich exports', '30-day version history', 'Premium research templates'],
	},
	{
		name: 'Team',
		description: 'For teams building a shared map of what they know.',
		monthlyPrice: 24,
		annualPrice: 18,
		status: 'Teams · Coming soon',
		cta: 'Talk to us',
		features: ['Everything in Pro', 'Shared team workspaces', 'Real-time collaboration', 'Comments and mentions', 'Roles and AI budget controls', 'Priority support'],
	},
]

function ProductFigure({
	src,
	alt,
	figure,
	caption,
	className,
}: {
	src: string
	alt: string
	figure: string
	caption: string
	className: string
}) {
	return (
		<figure className={className}>
			<div className="landing-figure-frame">
				<img src={src} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
			</div>
			<figcaption className="mt-3 flex items-start justify-between gap-5 font-mono text-[9px] uppercase tracking-[0.11em] text-zinc-700">
				<span className="shrink-0">{figure}</span>
				<span className="text-right">{caption}</span>
			</figcaption>
		</figure>
	)
}

export default function LandingPage({ onOpenApp }: LandingPageProps) {
	const shouldReduceMotion = useReducedMotion()
	const [isAnnualPricing, setIsAnnualPricing] = useState(true)
	const reveal = shouldReduceMotion
		? {}
		: {
			initial: { opacity: 0, y: 18 },
			whileInView: { opacity: 1, y: 0 },
			viewport: { once: true, amount: 0.25 },
			transition: { type: 'spring' as const, stiffness: 110, damping: 24 },
		}

	return (
		<div className="landing-shell min-h-screen overflow-x-hidden bg-[#0f0f11] text-zinc-100">
			<header className="landing-container relative z-20 flex h-[72px] items-center justify-between border-b border-white/[0.06]">
				<a href="#top" className="text-[24px] font-semibold leading-none tracking-[-0.045em] text-white">
					burro<span className="text-violet-400">.</span>
				</a>
				<nav className="hidden items-center gap-8 text-[12px] font-medium text-zinc-500 md:flex">
					<a href="#product" className="transition-colors hover:text-zinc-200">Product</a>
					<a href="#principles" className="transition-colors hover:text-zinc-200">Principles</a>
					<a href="#workflow" className="transition-colors hover:text-zinc-200">Workflow</a>
					<a href="#pricing" className="transition-colors hover:text-zinc-200">Pricing</a>
				</nav>
				<div className="flex items-center gap-2">
					<motion.a
						href="https://github.com/pranavajy/burro"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.065] bg-white/[0.025] text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] transition-colors hover:bg-white/[0.055] hover:text-zinc-200"
						whileHover={shouldReduceMotion ? undefined : { y: -1 }}
						whileTap={shouldReduceMotion ? undefined : { y: 1, scale: 0.96 }}
						title="View Burro on GitHub"
						aria-label="View Burro on GitHub"
					>
						<svg viewBox="0 0 24 24" aria-hidden="true" className="h-[17px] w-[17px] fill-current">
							<path d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.57-.3-5.27-1.29-5.27-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.16 1.18a10.96 10.96 0 0 1 5.75 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.71 5.39-5.29 5.68.42.36.79 1.06.79 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
						</svg>
					</motion.a>
					<motion.button
						type="button"
						onClick={onOpenApp}
						className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.075] bg-white/[0.045] px-3.5 text-[12px] font-medium text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-colors hover:bg-white/[0.075] hover:text-white"
						whileHover={shouldReduceMotion ? undefined : { y: -1 }}
						whileTap={shouldReduceMotion ? undefined : { y: 1, scale: 0.98 }}
					>
						Open app <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
					</motion.button>
				</div>
			</header>

			<main id="top" className="relative z-10">
				<section className="landing-container landing-hero overflow-hidden border-b border-white/[0.06]">
					<div className="grid lg:min-h-[640px] lg:grid-cols-12">
						<motion.div
							initial={shouldReduceMotion ? undefined : { opacity: 0, y: 18 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: shouldReduceMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}
							className="flex flex-col justify-center py-[clamp(76px,9vw,124px)] lg:col-span-6 lg:pr-[clamp(36px,5vw,72px)]"
						>
							<div className="landing-release-pill">
								Open source visual AI workspace
							</div>

							<h1 className="mt-7 max-w-[650px] text-balance text-[50px] font-medium leading-[0.98] tracking-[-0.06em] text-white sm:text-[64px] lg:text-[70px]">
								The better way to explore your ideas.
							</h1>
							<p className="mt-6 max-w-[540px] text-[15px] leading-7 text-zinc-500 sm:text-[16px]">
								Ask any model, branch from every answer, and turn scattered conversations into a living map of your thinking.
							</p>

							<div className="mt-8 flex flex-col gap-3 sm:flex-row">
								<motion.button
									type="button"
									onClick={onOpenApp}
									className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-white px-5 text-[13px] font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
									whileHover={shouldReduceMotion ? undefined : { y: -1 }}
									whileTap={shouldReduceMotion ? undefined : { y: 1, scale: 0.98 }}
								>
									Start exploring <ArrowRight className="h-3.5 w-3.5" />
								</motion.button>
								<a href="#product" className="inline-flex h-12 items-center justify-center rounded-[10px] border border-white/[0.075] bg-white/[0.025] px-5 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.055] hover:text-white">
									See how it works
								</a>
							</div>

							<div className="mt-7 flex items-center gap-3">
								<span className="font-mono text-[9px] uppercase tracking-[0.11em] text-zinc-700">Works with</span>
								<div className="flex items-center gap-1.5" aria-label="Supported AI providers">
									{([
										['openai', 'OpenAI'],
										['anthropic', 'Claude'],
										['google', 'Gemini'],
										['ollama', 'Ollama'],
									] as const).map(([provider, label]) => (
										<span
											key={provider}
											aria-label={label}
											title={label}
											className={`flex h-8 w-8 items-center justify-center rounded-[9px] border ${provider === 'ollama' ? 'border-white bg-white' : 'border-white/[0.07] bg-white/[0.035]'}`}
										>
											<ProviderLogo provider={provider} className="h-4 w-4" />
										</span>
									))}
								</div>
							</div>

							<div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[9px] uppercase tracking-[0.11em] text-zinc-700">
								<span>Open source</span>
								<span aria-hidden="true">·</span>
								<span>Bring your own model</span>
								<span aria-hidden="true">·</span>
								<span>Local first</span>
							</div>
						</motion.div>

						<motion.div
							initial={shouldReduceMotion ? undefined : { opacity: 0, x: 18 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: shouldReduceMotion ? 0 : 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
							className="flex items-center pb-10 lg:col-span-6 lg:py-12 lg:pl-[clamp(28px,4vw,52px)]"
						>
							<div className="landing-hero-canvas w-full shrink-0 lg:w-[138%] lg:translate-x-[7%]">
								<div className="flex h-11 items-center border-b border-white/[0.055] px-4">
									<div className="flex items-center gap-1.5">
										<span className="h-2 w-2 rounded-full bg-white/[0.08]" />
										<span className="h-2 w-2 rounded-full bg-white/[0.08]" />
										<span className="h-2 w-2 rounded-full bg-white/[0.08]" />
									</div>
									<span className="ml-auto text-[9px] font-medium uppercase tracking-[0.15em] text-zinc-700">Live canvas</span>
								</div>
								<div className="aspect-[16/8.2] overflow-hidden bg-[#111113]">
									<img src={canvasPreview} alt="Burro visual research canvas" className="h-full w-full object-cover object-center opacity-95" />
								</div>
							</div>
						</motion.div>
					</div>
				</section>

				<section id="product" className="landing-container pb-[var(--landing-section)] pt-[clamp(48px,6vw,80px)]">
					<motion.div {...reveal} className="landing-product-frame">
						<div className="flex h-11 items-center border-b border-white/[0.055] px-4">
							<div className="flex items-center gap-1.5">
								<span className="h-2 w-2 rounded-full bg-white/[0.08]" />
								<span className="h-2 w-2 rounded-full bg-white/[0.08]" />
								<span className="h-2 w-2 rounded-full bg-white/[0.08]" />
							</div>
							<span className="ml-auto text-[9px] font-medium uppercase tracking-[0.15em] text-zinc-700">Live canvas</span>
						</div>
						<div className="aspect-[16/8.5] overflow-hidden bg-[#111113]">
							<img src={canvasPreview} alt="Burro visual research canvas" className="h-full w-full object-cover object-center opacity-95" />
						</div>
					</motion.div>
					<div className="mt-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-700">
						<span>Fig 0.1</span>
						<span>Questions become explorable systems</span>
					</div>
				</section>

				<section id="principles" className="landing-container landing-section border-t border-white/[0.06]">
					<div className="grid gap-10 lg:grid-cols-12">
						<div className="lg:col-span-4">
							<p className="landing-section-label">A new interface for inquiry</p>
						</div>
						<motion.div {...reveal} className="lg:col-span-8">
							<h2 className="max-w-3xl text-balance text-[36px] font-medium leading-[1.08] tracking-[-0.045em] text-white sm:text-[48px]">
								Chat is linear. Understanding rarely is.
							</h2>
							<p className="mt-6 max-w-2xl text-[15px] leading-7 text-zinc-500">
								Useful questions create more questions. Burro gives those branches a durable place, so exploration stays legible instead of becoming another buried transcript.
							</p>
						</motion.div>
					</div>

					<div className="mt-[var(--landing-section)] grid border-y border-white/[0.06] md:grid-cols-3">
						{features.map(({ number, icon: Icon, title, copy }, index) => (
							<motion.article
								key={title}
								{...reveal}
								transition={{ duration: shouldReduceMotion ? 0 : 0.55, delay: index * 0.06 }}
								className="landing-feature md:border-l md:first:border-l-0"
							>
								<div className="flex items-center justify-between">
									<span className="font-mono text-[9px] text-zinc-700">{number}</span>
									<Icon className="h-4 w-4 text-zinc-600" />
								</div>
								<h3 className="mt-12 text-[17px] font-medium tracking-[-0.025em] text-zinc-100">{title}</h3>
								<p className="mt-3 text-[13px] leading-6 text-zinc-500">{copy}</p>
							</motion.article>
						))}
					</div>

					<div className="mt-[var(--landing-section)] grid items-start gap-x-6 gap-y-14 lg:grid-cols-12">
						<motion.div {...reveal} className="lg:col-span-8">
							<ProductFigure
								src={branchingPreview}
								alt="A Burro canvas branching from a central question into several deep dives"
								figure="Fig 1.1"
								caption="Follow a question as far as it goes"
								className="landing-figure-wide"
							/>
						</motion.div>
						<motion.div {...reveal} className="lg:col-span-4">
							<ProductFigure
								src={sidebarPreview}
								alt="Burro canvas history sidebar with visual previews"
								figure="Fig 1.2"
								caption="Visual history, ready when you return"
								className="landing-figure-tall"
							/>
						</motion.div>
					</div>

					<div className="mt-16 grid gap-x-6 gap-y-14 md:grid-cols-2">
						<motion.div {...reveal}>
							<ProductFigure
								src={sourcesPreview}
								alt="A grounded Burro response with its source list expanded"
								figure="Fig 1.3"
								caption="Important claims stay connected to evidence"
								className="landing-figure-square"
							/>
						</motion.div>
						<motion.div {...reveal}>
							<ProductFigure
								src={emptyStatePreview}
								alt="The minimal Burro new canvas experience"
								figure="Fig 1.4"
								caption="A calm place to begin a new line of thought"
								className="landing-figure-square"
							/>
						</motion.div>
					</div>
				</section>

				<section id="workflow" className="landing-container landing-section border-t border-white/[0.06]">
					<div className="grid gap-12 lg:grid-cols-12">
						<div className="lg:col-span-4">
							<p className="landing-section-label">From question to clarity</p>
							<h2 className="mt-5 max-w-sm text-[34px] font-medium leading-[1.1] tracking-[-0.045em] text-white">A workflow that stays out of your way.</h2>
						</div>

						<div className="lg:col-span-8">
							{[
								['01', 'Ask', 'Start with any question, topic, or problem. Burro creates the first grounded response card.'],
								['02', 'Branch', 'Follow up from an answer, source, or highlighted concept without losing your original path.'],
								['03', 'Shape', 'Collapse finished cards, arrange the canvas, and return to the branches that matter.'],
							].map(([number, title, copy], index) => (
								<motion.div
									key={number}
									{...reveal}
									transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: index * 0.05 }}
									className="grid gap-4 border-t border-white/[0.06] py-7 first:border-t-0 first:pt-0 sm:grid-cols-[48px_110px_1fr] sm:items-start"
								>
									<span className="font-mono text-[9px] text-zinc-700">{number}</span>
									<span className="text-[14px] font-medium text-zinc-200">{title}</span>
									<span className="max-w-lg text-[13px] leading-6 text-zinc-500">{copy}</span>
								</motion.div>
							))}
						</div>
					</div>
				</section>

				<section id="pricing" className="landing-container landing-pricing-grid landing-section border-t border-white/[0.06]">
					<div className="grid gap-10 lg:grid-cols-12 lg:items-end">
						<div className="lg:col-span-8">
							<p className="landing-section-label">Plans</p>
							<h2 className="mt-5 max-w-3xl text-balance text-[38px] font-medium leading-[1.05] tracking-[-0.05em] text-white sm:text-[52px]">
								Start open. Pay when the cloud starts doing the work.
							</h2>
							<p className="mt-6 max-w-2xl text-[14px] leading-7 text-zinc-500">
								The local canvas and bring-your-own-model workflow stay free. Upgrade for sync, sharing, history, and collaboration.
							</p>
						</div>

						<div className="flex lg:col-span-4 lg:justify-end">
							<div className="inline-flex rounded-[12px] border border-white/[0.07] bg-white/[0.025] p-1">
								<button
									type="button"
									onClick={() => setIsAnnualPricing(false)}
									className={`h-8 rounded-[8px] px-3 text-[11px] font-medium transition-colors ${!isAnnualPricing ? 'bg-white/[0.09] text-zinc-100' : 'text-zinc-600 hover:text-zinc-300'}`}
								>
									Monthly
								</button>
								<button
									type="button"
									onClick={() => setIsAnnualPricing(true)}
									className={`h-8 rounded-[8px] px-3 text-[11px] font-medium transition-colors ${isAnnualPricing ? 'bg-white/[0.09] text-zinc-100' : 'text-zinc-600 hover:text-zinc-300'}`}
								>
									Annual <span className="ml-1 text-emerald-400/80">Save up to 25%</span>
								</button>
							</div>
						</div>
					</div>

					<div className="mt-14 grid overflow-hidden rounded-[16px] border border-white/[0.075] bg-[#121214]/90 md:grid-cols-3">
						{pricingTiers.map((tier, index) => {
							const price = isAnnualPricing ? tier.annualPrice : tier.monthlyPrice
							return (
								<motion.article
									key={tier.name}
									{...reveal}
									transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: index * 0.06 }}
									className={`relative flex min-h-[560px] flex-col p-7 md:border-l md:first:border-l-0 ${index > 0 ? 'border-t border-white/[0.075] md:border-t-0' : ''} ${tier.featured ? 'bg-[linear-gradient(180deg,rgba(124,58,237,0.105),rgba(255,255,255,0.012)_42%)]' : 'bg-white/[0.012]'}`}
								>
									{tier.featured && <div className="absolute inset-x-0 top-0 h-px bg-violet-400/65" />}
									<div className="flex items-start justify-between gap-4">
										<div>
											<h3 className="text-[17px] font-semibold tracking-[-0.025em] text-zinc-100">{tier.name}</h3>
											<p className="mt-2 min-h-10 text-[11px] leading-5 text-zinc-600">{tier.description}</p>
										</div>
										{tier.featured && <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-violet-300">Popular</span>}
									</div>

									<div className="mt-8 border-y border-white/[0.06] py-6">
										<div className="flex items-end gap-1.5">
											<span className="text-[38px] font-medium leading-none tracking-[-0.055em] text-white">${price}</span>
											{price > 0 && <span className="pb-1 text-[10px] text-zinc-600">USD / month</span>}
										</div>
										<div className="mt-2 text-[9px] text-zinc-700">{price === 0 ? 'Free forever. No credit card.' : isAnnualPricing ? 'Per user, billed annually.' : 'Per user, billed monthly.'}</div>
									</div>

									<div className="mt-6 flex-1">
										<div className="mb-4 text-[9px] font-semibold uppercase tracking-[0.13em] text-zinc-700">What’s included</div>
										<ul className="space-y-3">
											{tier.features.map((feature) => (
												<li key={feature} className="flex items-start gap-2.5 text-[11px] leading-5 text-zinc-500">
													<Check className="mt-1 h-3 w-3 shrink-0 text-violet-400/80" />
													<span>{feature}</span>
												</li>
											))}
										</ul>
									</div>

									<button
										type="button"
										onClick={onOpenApp}
										className={`mt-8 flex h-10 w-full items-center justify-center rounded-[10px] text-[11px] font-semibold transition-colors ${tier.featured ? 'bg-violet-600 text-white hover:bg-violet-500' : 'border border-white/[0.08] bg-white/[0.035] text-zinc-300 hover:bg-white/[0.065] hover:text-white'}`}
									>
										{tier.cta}
									</button>
									<div className="mt-3 text-center text-[8px] font-medium uppercase tracking-[0.12em] text-zinc-700">{tier.status}</div>
								</motion.article>
							)
						})}
					</div>

					<p className="mt-5 text-center text-[9px] leading-5 text-zinc-700">
						Bring-your-own-key usage is included on every plan. Optional hosted AI credits will be priced separately.
					</p>
				</section>

				<section className="landing-container border-t border-white/[0.06] py-[var(--landing-section)]">
					<div className="grid gap-10 lg:grid-cols-12 lg:items-end">
						<h2 className="text-balance text-[42px] font-medium leading-[1.02] tracking-[-0.05em] text-white sm:text-[58px] lg:col-span-8">
							Make room for the whole idea.
						</h2>
						<div className="lg:col-span-4">
							<p className="text-[14px] leading-6 text-zinc-500">Start with one question. Keep every useful branch.</p>
							<motion.button
								type="button"
								onClick={onOpenApp}
								className="mt-6 inline-flex h-11 items-center gap-2 rounded-[10px] bg-white px-4 text-[13px] font-semibold text-zinc-950"
								whileHover={shouldReduceMotion ? undefined : { y: -1 }}
								whileTap={shouldReduceMotion ? undefined : { y: 1, scale: 0.98 }}
							>
								Open Burro <ArrowRight className="h-3.5 w-3.5" />
							</motion.button>
						</div>
					</div>
				</section>
			</main>

			<footer className="landing-container relative z-10 flex items-center justify-between border-t border-white/[0.06] py-8 text-[10px] uppercase tracking-[0.12em] text-zinc-700">
				<span>burro<span className="text-violet-500">.</span></span>
				<span>Think in branches</span>
			</footer>
		</div>
	)
}
