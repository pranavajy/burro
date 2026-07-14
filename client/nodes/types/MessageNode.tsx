import { ModelMessage } from 'ai'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { T, useEditor } from 'tldraw'
import { BookOpen, ExternalLink, Plus, Sparkles, X } from 'lucide-react'
import { NODE_WIDTH_PX } from '../../constants'
import { createFollowUpNode } from '../createFollowUpNode'
import { createSourceCard } from '../createSourceCard'
import { getAllConnectedNodes, getNodePortConnections } from '../nodePorts'
import { layoutConversationTree } from '../layoutConversationTree'
import { NodeShape } from '../NodeShapeUtil'
import {
	NodeComponentProps,
	NodeDefinition,
	shapeInputPort,
	shapeOutputPort,
	updateNode,
} from './shared'

/**
 * This node is a message from the user.
 */
export type MessageNode = T.TypeOf<typeof MessageNode>
export const MessageNode = T.object({
	type: T.literal('message'),
	userMessage: T.string,
	assistantMessage: T.string,
	autoSubmit: T.optional(T.boolean),
	compact: T.optional(T.boolean),
	grounded: T.optional(T.boolean),
	sourcesExpanded: T.optional(T.boolean),
	sources: T.optional(
		T.arrayOf(
			T.object({
				id: T.string,
				url: T.string,
				title: T.string,
				domain: T.string,
			})
		)
	),
	citations: T.optional(
		T.arrayOf(
			T.object({
				start: T.number,
				end: T.number,
				text: T.string,
				sourceIds: T.arrayOf(T.string),
			})
		)
	),
	images: T.optional(
		T.arrayOf(
			T.object({
				url: T.string,
				title: T.string,
			})
		)
	),
})

export class MessageNodeDefinition extends NodeDefinition<MessageNode> {
	static type = 'message'
	static validator = MessageNode
	title = 'Message'
	heading = 'Message'
	icon = <Sparkles className="w-4 h-4 text-blue-400" />
	getDefault(): MessageNode {
		return {
			type: 'message',
			userMessage: '',
			assistantMessage: '',
			images: [],
			autoSubmit: false,
			compact: false,
			grounded: false,
			sourcesExpanded: false,
			sources: [],
			citations: [],
		}
	}
	getBodyWidthPx(_shape: NodeShape, _node: MessageNode): number {
		return _node.compact && _node.assistantMessage.trim() ? 380 : NODE_WIDTH_PX
	}
	getBodyHeightPx(_shape: NodeShape, _node: MessageNode): number {
		const assistantMessage = _node.assistantMessage.trim()
		const isSent = assistantMessage !== ''
		if (_node.compact && isSent) {
			const titleSize = this.editor.textMeasure.measureText(_node.userMessage, {
				fontFamily: 'Inter',
				fontSize: 15,
				fontWeight: '500',
				fontStyle: 'normal',
				maxWidth: 340,
				lineHeight: 1.5,
				padding: '0px',
			})
			return Math.max(72, titleSize.h + 36)
		}

		if (!isSent) {
			return 260
		}

		let height = 36 // Header height

		const images = _node.images || []
		if (images.length > 0) {
			height += 200 // fanned image stack section
		}
		if ((_node.sources?.length ?? 0) > 0) {
			height += _node.sourcesExpanded ? 68 + (_node.sources?.length ?? 0) * 62 : 54
		}

		// Measure user message text height (since it's static/read-only now)
		const userSize = this.editor.textMeasure.measureText(_node.userMessage, {
			fontFamily: 'Inter',
			fontSize: 18,
			fontWeight: '600',
			fontStyle: 'normal',
			maxWidth: NODE_WIDTH_PX - 56, // px-7 = 56px horizontal padding
			lineHeight: 1.4,
			padding: '0px',
		})
		height += userSize.h + 36 // height + vertical padding

		const size = this.editor.textMeasure.measureText(assistantMessage, {
			fontFamily: 'Inter',
			fontSize: 14.5,
			fontWeight: '400',
			fontStyle: 'normal',
			maxWidth: NODE_WIDTH_PX - 56, // px-7 = 56px horizontal padding
			lineHeight: 1.7,
			padding: '0px',
		})
		return height + size.h + 60
	}
	getPorts(shape: NodeShape, node: MessageNode) {
		const height = this.getBodyHeightPx(shape, node)
		const width = this.getBodyWidthPx(shape, node)
		return {
			input: {
				...shapeInputPort,
				x: 0,
				y: height / 2,
			},
			output: {
				...shapeOutputPort,
				x: width,
				y: height / 2,
			},
		}
	}

	Component = MessageNodeComponent
}

async function fetchWikipediaImages(query: string): Promise<Array<{ url: string; title: string }>> {
	try {
		// Clean the query to get better keywords (remove conversational prefixes)
		const cleanQuery = query
			.replace(/^(please\s+)?(tell\s+me\s+about|what\s+is|explain|who\s+is|show\s+me|search\s+for)\s+/i, '')
			.replace(/^deep\s+dive:\s*/i, '')
			.trim()

		if (!cleanQuery) return []

		const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&generator=search&piprop=thumbnail&pithumbsize=400&pilimit=5&gsrsearch=${encodeURIComponent(
			cleanQuery
		)}`

		const response = await fetch(url)
		const data = (await response.json()) as any

		if (data && data.query && data.query.pages) {
			const pages = Object.values(data.query.pages) as any[]
			// Filter, sort by relevance ranking index, limit to top 3, and map them
			return pages
				.filter((page) => page.thumbnail && page.thumbnail.source)
				.sort((a, b) => (a.index || 0) - (b.index || 0))
				.slice(0, 3)
				.map((page) => ({
					url: page.thumbnail.source,
					title: page.title,
				}))
		}
	} catch (error) {
		console.error('Error fetching images from Wikipedia:', error)
	}
	return []
}

type MessageCitation = NonNullable<MessageNode['citations']>[number]

interface MarkdownRenderOptions {
	onConceptClick?: (concept: string) => void
	onCitationClick?: (sourceIds: string[]) => void
	sourceNumbers?: Map<string, number>
}

function addCitationMarkers(text: string, citations: MessageCitation[]): string {
	let result = text
	const insertions = citations
		.map((citation) => {
			let end = citation.end
			if (citation.text && result.slice(citation.start, citation.end) !== citation.text) {
				const foundAt = result.lastIndexOf(citation.text)
				if (foundAt >= 0) end = foundAt + citation.text.length
			}
			return { end, sourceIds: citation.sourceIds }
		})
		.filter((citation) => citation.end > 0 && citation.end <= text.length && citation.sourceIds.length > 0)
		.sort((a, b) => b.end - a.end)

	for (const citation of insertions) {
		result = `${result.slice(0, citation.end)} [[${citation.sourceIds.join(',')}]]${result.slice(citation.end)}`
	}
	return result
}

function renderInlineMarkdown(text: string, options: MarkdownRenderOptions = {}): React.ReactNode[] {
	const parts = text.split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/g).filter(Boolean)
	return parts.map((part, index) => {
		if (part.startsWith('**') && part.endsWith('**')) {
			const concept = part.slice(2, -2)
			return (
				<button
					key={index}
					type="button"
					onClick={(event) => {
						event.stopPropagation()
						options.onConceptClick?.(concept.trim())
					}}
					className="inline cursor-pointer border-0 bg-transparent p-0 font-semibold text-zinc-50 underline decoration-zinc-500 decoration-1 underline-offset-[5px] transition-colors hover:text-violet-300 hover:decoration-violet-400 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
					title={`Deep dive into ${concept.trim()}`}
				>
					{concept}
				</button>
			)
		}
		if (part.startsWith('[[') && part.endsWith(']]')) {
			const sourceIds = part.slice(2, -2).split(',').filter(Boolean)
			const numbers = sourceIds
				.map((id) => options.sourceNumbers?.get(id))
				.filter((number): number is number => number !== undefined)
			if (numbers.length === 0) return null
			return (
				<button
					key={index}
					type="button"
					onClick={(event) => {
						event.stopPropagation()
						options.onCitationClick?.(sourceIds)
					}}
					className="mx-0.5 inline-flex translate-y-[-1px] items-center rounded-md border border-sky-400/20 bg-sky-400/10 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-sky-300 transition-colors hover:border-sky-300/35 hover:bg-sky-400/15"
					title="Show evidence"
				>
					{numbers.join(',')}
				</button>
			)
		}
		return part
	})
}

function parseMarkdown(text: string, options: MarkdownRenderOptions = {}): React.ReactNode {
	const lines = text.split('\n')
	return lines.map((line, idx) => {
		if (line.startsWith('### ')) {
			return (
				<h3 key={idx} className="mt-5 mb-1.5 text-[15px] font-semibold leading-6 text-zinc-100">
					{renderInlineMarkdown(line.slice(4), options)}
				</h3>
			)
		}
		if (line.startsWith('## ')) {
			return (
				<h2 key={idx} className="mt-5 mb-2 text-[16.5px] font-semibold leading-6 text-zinc-100">
					{renderInlineMarkdown(line.slice(3), options)}
				</h2>
			)
		}
		if (line.startsWith('# ')) {
			return (
				<h1 key={idx} className="mt-5 mb-2 text-[18px] font-semibold leading-7 text-zinc-50">
					{renderInlineMarkdown(line.slice(2), options)}
				</h1>
			)
		}

		const matchOrdered = line.match(/^(\d+)\.\s+(.*)$/)
		if (matchOrdered) {
			return (
				<div key={idx} className="my-1.5 ml-0.5 flex gap-2.5 text-[14.5px] leading-[1.7] text-zinc-300">
					<span className="text-zinc-500 min-w-[16px] text-right">{matchOrdered[1]}.</span>
					<span>{renderInlineMarkdown(matchOrdered[2], options)}</span>
				</div>
			)
		}

		if (line.startsWith('- ') || line.startsWith('* ')) {
			return (
				<div key={idx} className="my-1.5 ml-0.5 flex gap-2.5 text-[14.5px] leading-[1.7] text-zinc-300">
					<span className="text-zinc-500">•</span>
					<span>{renderInlineMarkdown(line.slice(2), options)}</span>
				</div>
			)
		}

		if (line.trim() === '') {
			return <div key={idx} className="h-2.5" />
		}

		return (
			<p key={idx} className="my-2 text-[14.5px] leading-[1.7] text-zinc-300">
				{renderInlineMarkdown(line, options)}
			</p>
		)
	})
}

function MessageNodeComponent({ node, shape }: NodeComponentProps<MessageNode>) {
	const editor = useEditor()
	const shouldReduceMotion = useReducedMotion()
	const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null)
	const [isCardHovered, setIsCardHovered] = useState(false)
	const [highlightedSourceIds, setHighlightedSourceIds] = useState<string[]>([])

	useEffect(() => {
		if (!previewImage) return

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setPreviewImage(null)
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [previewImage])

	const handleSend = useCallback(() => {
		// 1. gather up parents and create message history
		// 2. create prompt
		// 3. send prompt to ai
		// 4. update node with assistant message

		const messages: ModelMessage[] = []

		const connectedNodeShapes = getAllConnectedNodes(editor, shape, 'end')
		for (const connectedShape of connectedNodeShapes) {
			const node = editor.getShape(connectedShape)

			if (!node) continue
			if (!editor.isShapeOfType(node, 'node')) continue
			if (node.props.node.type !== 'message') continue

			if (node.props.node.assistantMessage && connectedShape !== shape.id) {
				messages.push({
					role: 'assistant',
					content: node.props.node.assistantMessage ?? '',
				})
			}

			messages.push({
				role: 'user',
				content: node.props.node.userMessage ?? '',
			})
		}

		messages.reverse()

		// clear any previous assistant message and images before starting
		updateNode<MessageNode>(editor, shape, (node) => ({
			...node,
			assistantMessage: '...',
			images: [],
			grounded: false,
			sourcesExpanded: false,
			sources: [],
			citations: [],
		}))

		// Fetch Wikipedia images in parallel
		fetchWikipediaImages(node.userMessage).then((images) => {
			updateNode<MessageNode>(editor, shape, (prevNode) => ({
				...prevNode,
				images,
			}))
			layoutConversationTree(editor, shape.id)
		})

		// stream the response and append as chunks arrive
		;(async () => {
			try {
				const response = await fetch('/stream', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(messages),
				})
				if (!response.body) return

				const reader = response.body.getReader()
				const decoder = new TextDecoder()
				let accumulatedText = ''
				let eventBuffer = ''

				const processEvent = (block: string) => {
					const event = block.match(/^event:\s*(.+)$/m)?.[1]
					const rawData = block.match(/^data:\s*(.+)$/m)?.[1]
					if (!event || !rawData) return

					try {
						const data = JSON.parse(rawData)
						if (event === 'text' && typeof data === 'string') {
							accumulatedText += data
							updateNode<MessageNode>(editor, shape, (node) => ({
								...node,
								assistantMessage: accumulatedText,
							}))
						} else if (event === 'evidence') {
							updateNode<MessageNode>(editor, shape, (node) => ({
								...node,
								assistantMessage: typeof data.text === 'string' ? data.text : accumulatedText,
								grounded: Boolean(data.grounded),
								sources: Array.isArray(data.sources) ? data.sources : [],
								citations: Array.isArray(data.citations) ? data.citations : [],
							}))
						} else if (event === 'error') {
							console.error('Response stream error:', data.message)
						}
					} catch (error) {
						console.error('Could not parse response event:', error)
					}
				}

				while (true) {
					const { value, done } = await reader.read()
					if (done) break
					eventBuffer += decoder.decode(value, { stream: true })
					const blocks = eventBuffer.split('\n\n')
					eventBuffer = blocks.pop() ?? ''
					for (const block of blocks) processEvent(block)
				}
				eventBuffer += decoder.decode()
				if (eventBuffer.trim()) processEvent(eventBuffer)
			} catch (e) {
				console.error(e)
			} finally {
				layoutConversationTree(editor, shape.id)
			}
		})()
	}, [editor, shape, node.userMessage])

	useEffect(() => {
		if (!node.autoSubmit || !node.userMessage.trim() || node.assistantMessage) return

		updateNode<MessageNode>(editor, shape, (currentNode) => ({
			...currentNode,
			autoSubmit: false,
		}))
		handleSend()
	}, [editor, shape, node.autoSubmit, node.userMessage, node.assistantMessage, handleSend])

	const handleMessageChange = useCallback(
		(value: string) => {
			updateNode<MessageNode>(editor, shape, (node) => ({
				...node,
				userMessage: value,
			}))
		},
		[editor, shape]
	)

	const handleCancel = useCallback(() => {
		const parent = getNodePortConnections(editor, shape).find(
			(connection) => connection.terminal === 'end'
		)
		if (parent) {
			editor.deleteShapes([shape.id])
			layoutConversationTree(editor, parent.connectedShapeId)
			return
		}

		handleMessageChange('')
	}, [editor, shape, handleMessageChange])

	const handleFollowUp = useCallback(() => {
		createFollowUpNode(editor, shape.id)
	}, [editor, shape.id])

	const handleConceptClick = useCallback(
		(concept: string) => {
			if (!concept) return
			createFollowUpNode(editor, shape.id, {
				userMessage: `Deep dive: ${concept}`,
				autoSubmit: true,
			})
		},
		[editor, shape.id]
	)

	const handleCitationClick = useCallback(
		(sourceIds: string[]) => {
			setHighlightedSourceIds(sourceIds)
			updateNode<MessageNode>(editor, shape, (currentNode) => ({
				...currentNode,
				sourcesExpanded: true,
			}))
			requestAnimationFrame(() => layoutConversationTree(editor, shape.id))
		},
		[editor, shape]
	)

	const toggleSources = useCallback(() => {
		setHighlightedSourceIds([])
		updateNode<MessageNode>(editor, shape, (currentNode) => ({
			...currentNode,
			sourcesExpanded: !currentNode.sourcesExpanded,
		}))
		requestAnimationFrame(() => layoutConversationTree(editor, shape.id))
	}, [editor, shape])

	const handleExpandCard = useCallback(() => {
		updateNode<MessageNode>(editor, shape, (currentNode) => ({
			...currentNode,
			compact: false,
		}))
		editor.select(shape.id)
		requestAnimationFrame(() => layoutConversationTree(editor, shape.id))
	}, [editor, shape])

	const images = node.images || []
	const assistantMessage = node.assistantMessage.trim()
	const isSent = assistantMessage !== ''
	const isThinking = assistantMessage === '...'
	const sources = node.sources ?? []
	const citations = node.citations ?? []
	const sourceNumbers = new Map(sources.map((source, index) => [source.id, index + 1]))
	const citedMessage = addCitationMarkers(node.assistantMessage, citations)
	const isCompact = Boolean(node.compact && isSent)

	if (isCompact) {
		return (
			<motion.div
				className="group pointer-events-auto h-full w-full cursor-pointer"
				initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96, y: 5 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.01 }}
				whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
				transition={{ type: 'spring', stiffness: 430, damping: 32 }}
				onClick={handleExpandCard}
				title="Expand card"
			>
				<div className="flex h-full w-full items-center overflow-hidden rounded-[22px] border border-white/[0.075] bg-[#19191C]/92 px-5 shadow-[0_14px_38px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
					<div className="w-full text-[15px] font-medium leading-[1.5] tracking-[-0.01em] text-zinc-200">{node.userMessage}</div>
				</div>
			</motion.div>
		)
	}

	return (
		<motion.div
			className="relative h-full w-full pointer-events-auto"
			style={{ pointerEvents: 'auto' }}
			initial={shouldReduceMotion ? false : { opacity: 0, y: 10, scale: 0.975 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
			onHoverStart={() => setIsCardHovered(true)}
			onHoverEnd={() => setIsCardHovered(false)}
		>
			<motion.div
				className="flex flex-col w-full h-full bg-[#161618] border border-[#2C2C2E] rounded-[28px] shadow-[0_16px_50px_rgba(0,0,0,0.55)] overflow-hidden"
				animate={{
					borderColor: isCardHovered ? '#3F3F46' : '#2C2C2E',
					boxShadow: isCardHovered
						? '0 20px 60px rgba(0,0,0,0.62)'
						: '0 16px 50px rgba(0,0,0,0.55)',
				}}
				transition={{ duration: shouldReduceMotion ? 0 : 0.22 }}
			>
				{/* Header grab bar - NO pointer down handler to allow dragging through tldraw bubbling */}
				{isSent && (
					<div className="flex h-8 cursor-grab items-center justify-center select-none active:cursor-grabbing">
						<motion.div
							className="h-1 rounded-full"
							animate={{
								width: isCardHovered ? 44 : 36,
								backgroundColor: isCardHovered ? 'rgba(113,113,122,.8)' : 'rgba(82,82,91,.6)',
							}}
							transition={{ type: 'spring', stiffness: 500, damping: 35 }}
						/>
					</div>
				)}

				{/* Images: overlapping fanned photo stack */}
				{images.length > 0 && (
					<div className="flex flex-row justify-center items-center h-[200px] px-7 pt-2 box-border">
						{images.map((img, idx) => {
							const rotations = ['-6deg', '2deg', '5deg']
							const rotation = rotations[idx % rotations.length]
							return (
								<motion.button
									type="button"
									key={idx}
									className="relative shrink-0 cursor-zoom-in rounded-2xl bg-white p-2 shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
									style={{
										marginLeft: idx === 0 ? 0 : -28,
										zIndex: idx,
									}}
									initial={false}
									animate={{ rotate: rotation, y: 0, scale: 1 }}
									whileHover={shouldReduceMotion ? undefined : { rotate: 0, y: -10, scale: 1.08, zIndex: 20 }}
									whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
									transition={{ type: 'spring', stiffness: 420, damping: 28 }}
									onPointerDown={editor.markEventAsHandled}
									onClick={() => setPreviewImage(img)}
									title={img.title}
								>
									<img
										src={img.url}
										alt={img.title}
										className="w-[128px] h-[148px] object-cover rounded-xl"
										draggable={false}
									/>
								</motion.button>
							)
						})}
					</div>
				)}

				{/* User Message (Static / Read-only after send, editable before send) */}
				{isSent ? (
					<div
						className="px-7 pb-4 pt-5 text-[18px] font-semibold leading-[1.45] tracking-[-0.01em] text-zinc-100 select-text"
						onPointerDown={editor.markEventAsHandled}
					>
						{node.userMessage}
					</div>
				) : (
					/* Follow-up composer */
					<div className="flex h-full flex-col gap-5 p-7" onPointerDown={editor.markEventAsHandled}>
						<textarea
							className="h-[130px] w-full resize-none rounded-2xl border border-[#343438] bg-[#202023] px-4 py-4 text-[15px] leading-6 text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-violet-500/70"
							placeholder="Type your follow-up question..."
							value={node.userMessage}
							onChange={(e) => handleMessageChange(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault()
									handleSend()
								}
							}}
							autoFocus
						/>
						<div className="grid grid-cols-2 gap-3">
							<motion.button
								type="button"
								onClick={handleCancel}
								className="h-12 rounded-xl border border-[#38383C] bg-[#242427] text-[14px] font-medium text-zinc-300 transition-colors hover:bg-[#2B2B2F] hover:text-white"
								whileHover={shouldReduceMotion ? undefined : { y: -1, scale: 1.01 }}
								whileTap={shouldReduceMotion ? undefined : { y: 1, scale: 0.98 }}
								transition={{ type: 'spring', stiffness: 500, damping: 30 }}
							>
								Cancel
							</motion.button>
							<motion.button
								type="button"
								onClick={handleSend}
								disabled={!node.userMessage.trim()}
								className="h-12 rounded-xl bg-violet-600 text-[14px] font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-violet-900/40 disabled:text-violet-300/40"
								whileHover={node.userMessage.trim() && !shouldReduceMotion ? { y: -1, scale: 1.015 } : undefined}
								whileTap={node.userMessage.trim() && !shouldReduceMotion ? { y: 1, scale: 0.98 } : undefined}
								transition={{ type: 'spring', stiffness: 500, damping: 30 }}
							>
								Ask
							</motion.button>
						</div>
					</div>
				)}

				{/* AI Response output - shows full text content without overflow scroll constraints */}
				{node.assistantMessage && (
					<div className="px-7 pb-6" onPointerDown={editor.markEventAsHandled}>
						{isThinking ? (
							<div className="inline-flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-[#303034] bg-[#202023] px-4 py-3.5" aria-label="Thinking">
								{[0, 1, 2].map((dot) => (
									<motion.span
										key={dot}
										className="h-1.5 w-1.5 rounded-full bg-zinc-400"
										animate={shouldReduceMotion ? { opacity: 0.65 } : { y: [0, -3, 0], opacity: [0.45, 1, 0.45] }}
										transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: dot * 0.14 }}
									/>
								))}
							</div>
						) : (
							<div className="font-sans font-normal text-zinc-300 antialiased">
								{parseMarkdown(citedMessage, {
									onConceptClick: handleConceptClick,
									onCitationClick: handleCitationClick,
									sourceNumbers,
								})}
							</div>
						)}
					</div>
				)}

				{isSent && !isThinking && sources.length > 0 && (
					<div className="border-t border-[#29292D] px-7 py-4" onPointerDown={editor.markEventAsHandled}>
						<>
								<button
									type="button"
									onClick={toggleSources}
									className="flex w-full items-center justify-between text-left"
								>
									<span className="flex items-center gap-2">
										<span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/15 bg-sky-400/8 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-sky-300">
											<BookOpen className="h-3 w-3" /> Web-grounded
										</span>
										<span className="text-[10px] text-zinc-600">Unmarked text is model synthesis</span>
									</span>
									<span className="text-[10px] font-medium text-zinc-500">{sources.length} source{sources.length === 1 ? '' : 's'}</span>
								</button>

								<AnimatePresence initial={false}>
									{node.sourcesExpanded && (
										<motion.div
											initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
											animate={{ opacity: 1, height: 'auto' }}
											exit={{ opacity: 0, height: 0 }}
											className="mt-3 space-y-1.5 overflow-hidden"
										>
											{sources.map((source, index) => {
												const evidence = citations
													.filter((citation) => citation.sourceIds.includes(source.id))
													.map((citation) => citation.text)
													.filter(Boolean)
													.join(' ')
												const isHighlighted = highlightedSourceIds.includes(source.id)
												return (
													<div
														key={source.id}
														className={`group/source flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
															isHighlighted
																? 'border-sky-400/30 bg-sky-400/8'
																: 'border-[#303034] bg-[#1B1B1E]'
														}`}
													>
														<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-400/10 text-[9px] font-semibold text-sky-300">{index + 1}</span>
														<button
															type="button"
															onClick={() => window.open(source.url, '_blank', 'noopener,noreferrer')}
															className="min-w-0 flex-1 text-left"
														>
															<div className="truncate text-[11px] font-medium text-zinc-300">{source.title}</div>
															<div className="mt-0.5 flex items-center gap-1 text-[9px] text-zinc-600">{source.domain || 'Web source'} <ExternalLink className="h-2.5 w-2.5" /></div>
														</button>
														<button
															type="button"
															onClick={() => createSourceCard(editor, shape.id, { ...source, evidence })}
															className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-sky-400/10 hover:text-sky-300"
															title="Add source card to canvas"
														>
															<Plus className="h-3.5 w-3.5" />
														</button>
													</div>
												)
											})}
										</motion.div>
									)}
								</AnimatePresence>
						</>
					</div>
				)}
			</motion.div>

			{isSent && !isThinking && (
				<motion.button
					type="button"
					onPointerDown={editor.markEventAsHandled}
					onClick={handleFollowUp}
					className="absolute -bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full border border-violet-400/30 bg-violet-600 px-5 py-2.5 text-[13px] font-semibold whitespace-nowrap text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] hover:bg-violet-500"
					initial={false}
					animate={{ opacity: isCardHovered ? 1 : 0, y: isCardHovered ? 0 : 8, scale: isCardHovered ? 1 : 0.94 }}
					style={{ pointerEvents: isCardHovered ? 'auto' : 'none' }}
					whileHover={shouldReduceMotion ? undefined : { scale: 1.04, y: -1 }}
					whileTap={shouldReduceMotion ? undefined : { scale: 0.96, y: 1 }}
					transition={{ type: 'spring', stiffness: 460, damping: 30 }}
				>
					Ask follow up
				</motion.button>
			)}

			{createPortal(
				<AnimatePresence>
					{previewImage && (
					<motion.div
						className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
						onPointerDown={(event) => {
							editor.markEventAsHandled(event)
							if (event.target === event.currentTarget) setPreviewImage(null)
						}}
						role="dialog"
						aria-modal="true"
						aria-label={`Preview of ${previewImage.title}`}
					>
						<motion.div
							className="relative flex max-h-[90vh] max-w-[90vw] flex-col overflow-hidden rounded-3xl border border-[#343438] bg-[#161618] shadow-[0_30px_100px_rgba(0,0,0,0.75)]"
							initial={shouldReduceMotion ? false : { opacity: 0, y: 24, scale: 0.96 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
							transition={{ type: 'spring', stiffness: 380, damping: 32 }}
						>
							<motion.button
								type="button"
								onClick={() => setPreviewImage(null)}
								className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-zinc-300 backdrop-blur transition-colors hover:bg-violet-600 hover:text-white"
								whileHover={shouldReduceMotion ? undefined : { scale: 1.08, rotate: 4 }}
								whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
								aria-label="Close image preview"
							>
								<X className="h-5 w-5" />
							</motion.button>
							<img
								src={previewImage.url}
								alt={previewImage.title}
								className="max-h-[78vh] max-w-[90vw] object-contain"
								draggable={false}
							/>
							<div className="border-t border-[#2C2C2E] px-6 py-4 text-center text-sm font-medium text-zinc-300">
								{previewImage.title}
							</div>
						</motion.div>
					</motion.div>
					)}
				</AnimatePresence>,
				document.body
			)}
		</motion.div>
	)
}
