import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, GitBranch, Network, SearchCheck } from 'lucide-react'
import branchingPreview from '../ui_screenshots/landing-branching-detail.png'
import canvasPreview from '../ui_screenshots/landing-canvas-overview.png'
import emptyStatePreview from '../ui_screenshots/landing-empty-state.png'
import sidebarPreview from '../ui_screenshots/landing-sidebar-history.png'
import sourcesPreview from '../ui_screenshots/landing-sources-detail.png'

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
			<div className="landing-grid pointer-events-none fixed inset-0" />

			<header className="landing-container relative z-20 flex h-[72px] items-center justify-between border-b border-white/[0.06]">
				<a href="#top" className="text-[24px] font-semibold leading-none tracking-[-0.045em] text-white">
					burro<span className="text-violet-400">.</span>
				</a>
				<nav className="hidden items-center gap-8 text-[12px] font-medium text-zinc-500 md:flex">
					<a href="#product" className="transition-colors hover:text-zinc-200">Product</a>
					<a href="#principles" className="transition-colors hover:text-zinc-200">Principles</a>
					<a href="#workflow" className="transition-colors hover:text-zinc-200">Workflow</a>
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
				<section className="landing-container landing-hero">
					<motion.div
						initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: shouldReduceMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
						className="landing-eyebrow"
					>
						Visual AI workspace
					</motion.div>

					<div className="mt-7 grid gap-10 lg:grid-cols-12 lg:items-end">
						<motion.h1
							initial={shouldReduceMotion ? undefined : { opacity: 0, y: 18 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: shouldReduceMotion ? 0 : 0.65, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
							className="text-balance text-[48px] font-medium leading-[0.98] tracking-[-0.06em] text-white sm:text-[64px] lg:col-span-8 lg:text-[76px]"
						>
							Think beyond the chat window.
						</motion.h1>

						<motion.div
							initial={shouldReduceMotion ? undefined : { opacity: 0, y: 18 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: shouldReduceMotion ? 0 : 0.65, delay: 0.13, ease: [0.22, 1, 0.36, 1] }}
							className="lg:col-span-4 lg:pb-1"
						>
							<p className="max-w-md text-[15px] leading-7 text-zinc-500">
								Burro turns answers into a living map. Ask, branch, verify, and keep the full shape of your thinking in view.
							</p>
							<div className="mt-7 flex items-center gap-3">
								<motion.button
									type="button"
									onClick={onOpenApp}
									className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-violet-600 px-4 text-[13px] font-semibold text-white shadow-[0_10px_28px_rgba(109,40,217,0.26)] hover:bg-violet-500"
									whileHover={shouldReduceMotion ? undefined : { y: -1 }}
									whileTap={shouldReduceMotion ? undefined : { y: 1, scale: 0.98 }}
								>
									Start exploring <ArrowRight className="h-3.5 w-3.5" />
								</motion.button>
								<a href="#product" className="inline-flex h-11 items-center px-2 text-[13px] font-medium text-zinc-500 transition-colors hover:text-zinc-200">
									See the product
								</a>
							</div>
						</motion.div>
					</div>
				</section>

				<section id="product" className="landing-container pb-[var(--landing-section)]">
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
