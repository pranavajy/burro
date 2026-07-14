import { ModelMessage } from 'ai'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { T, useEditor } from 'tldraw'
import { Sparkles, X } from 'lucide-react'
import { NODE_WIDTH_PX } from '../../constants'
import { createFollowUpNode } from '../createFollowUpNode'
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
		}
	}
	getBodyWidthPx(_shape: NodeShape, _node: MessageNode): number {
		return NODE_WIDTH_PX
	}
	getBodyHeightPx(_shape: NodeShape, _node: MessageNode): number {
		const assistantMessage = _node.assistantMessage.trim()
		const isSent = assistantMessage !== ''

		if (!isSent) {
			return 260
		}

		let height = 36 // Header height

		const images = _node.images || []
		if (images.length > 0) {
			height += 200 // fanned image stack section
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
		return {
			input: {
				...shapeInputPort,
				x: 0,
				y: height / 2,
			},
			output: {
				...shapeOutputPort,
				x: NODE_WIDTH_PX,
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

function renderInlineMarkdown(
	text: string,
	onConceptClick?: (concept: string) => void
): React.ReactNode[] {
	const parts = text.split('**')
	return parts.map((part, index) => {
		if (index % 2 === 1) {
			return (
				<button
					key={index}
					type="button"
					onClick={(event) => {
						event.stopPropagation()
						onConceptClick?.(part.trim())
					}}
					className="inline cursor-pointer border-0 bg-transparent p-0 font-semibold text-zinc-50 underline decoration-zinc-500 decoration-1 underline-offset-[5px] transition-colors hover:text-violet-300 hover:decoration-violet-400 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
					title={`Deep dive into ${part.trim()}`}
				>
					{part}
				</button>
			)
		}
		return part
	})
}

function parseMarkdown(text: string, onConceptClick?: (concept: string) => void): React.ReactNode {
	const lines = text.split('\n')
	return lines.map((line, idx) => {
		if (line.startsWith('### ')) {
			return (
				<h3 key={idx} className="mt-5 mb-1.5 text-[15px] font-semibold leading-6 text-zinc-100">
					{renderInlineMarkdown(line.slice(4), onConceptClick)}
				</h3>
			)
		}
		if (line.startsWith('## ')) {
			return (
				<h2 key={idx} className="mt-5 mb-2 text-[16.5px] font-semibold leading-6 text-zinc-100">
					{renderInlineMarkdown(line.slice(3), onConceptClick)}
				</h2>
			)
		}
		if (line.startsWith('# ')) {
			return (
				<h1 key={idx} className="mt-5 mb-2 text-[18px] font-semibold leading-7 text-zinc-50">
					{renderInlineMarkdown(line.slice(2), onConceptClick)}
				</h1>
			)
		}

		const matchOrdered = line.match(/^(\d+)\.\s+(.*)$/)
		if (matchOrdered) {
			return (
				<div key={idx} className="my-1.5 ml-0.5 flex gap-2.5 text-[14.5px] leading-[1.7] text-zinc-300">
					<span className="text-zinc-500 min-w-[16px] text-right">{matchOrdered[1]}.</span>
					<span>{renderInlineMarkdown(matchOrdered[2], onConceptClick)}</span>
				</div>
			)
		}

		if (line.startsWith('- ') || line.startsWith('* ')) {
			return (
				<div key={idx} className="my-1.5 ml-0.5 flex gap-2.5 text-[14.5px] leading-[1.7] text-zinc-300">
					<span className="text-zinc-500">•</span>
					<span>{renderInlineMarkdown(line.slice(2), onConceptClick)}</span>
				</div>
			)
		}

		if (line.trim() === '') {
			return <div key={idx} className="h-2.5" />
		}

		return (
			<p key={idx} className="my-2 text-[14.5px] leading-[1.7] text-zinc-300">
				{renderInlineMarkdown(line, onConceptClick)}
			</p>
		)
	})
}

function MessageNodeComponent({ node, shape }: NodeComponentProps<MessageNode>) {
	const editor = useEditor()
	const shouldReduceMotion = useReducedMotion()
	const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null)
	const [isCardHovered, setIsCardHovered] = useState(false)

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

				while (true) {
					const { value, done } = await reader.read()
					if (done) break
					const chunk = decoder.decode(value, { stream: true })
					// Some environments may send SSE-style lines; extract data if so, else use raw chunk
					const maybeSse = chunk
						.split('\n')
						.filter((line) => line.startsWith('data:'))
						.map((line) => line.replace(/^data:\s?/, ''))
						.join('')
					accumulatedText += maybeSse || chunk
					updateNode<MessageNode>(editor, shape, (node) => ({
						...node,
						assistantMessage: accumulatedText,
					}))
				}
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

	const images = node.images || []
	const assistantMessage = node.assistantMessage.trim()
	const isSent = assistantMessage !== ''
	const isThinking = assistantMessage === '...'

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
								{parseMarkdown(node.assistantMessage, handleConceptClick)}
							</div>
						)}
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
