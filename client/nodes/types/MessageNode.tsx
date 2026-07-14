import { ModelMessage } from 'ai'
import { useCallback } from 'react'
import { T, useEditor } from 'tldraw'
import { Sparkles, GripVertical, ArrowUp } from 'lucide-react'
import { NODE_HEIGHT_PX, NODE_WIDTH_PX } from '../../constants'
import { getAllConnectedNodes } from '../nodePorts'
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
			userMessage: 'hello',
			assistantMessage: '',
			images: [],
		}
	}
	getBodyWidthPx(_shape: NodeShape, _node: MessageNode): number {
		return NODE_WIDTH_PX
	}
	getBodyHeightPx(_shape: NodeShape, _node: MessageNode): number {
		const assistantMessage = _node.assistantMessage.trim()
		const isSent = assistantMessage !== ''

		if (!isSent) {
			return NODE_HEIGHT_PX
		}

		let height = 36 // Header height

		const images = _node.images || []
		if (images.length > 0) {
			height += 200 // fanned image stack section
		}

		// Measure user message text height (since it's static/read-only now)
		const userSize = this.editor.textMeasure.measureText(_node.userMessage, {
			fontFamily: 'Inter',
			fontSize: 17,
			fontWeight: '600',
			fontStyle: 'normal',
			maxWidth: NODE_WIDTH_PX - 56, // px-7 = 56px horizontal padding
			lineHeight: 1.4,
			padding: '0px',
		})
		height += userSize.h + 32 // height + vertical padding

		const size = this.editor.textMeasure.measureText(assistantMessage, {
			fontFamily: 'Inter',
			fontSize: 13,
			fontWeight: '500',
			fontStyle: 'normal',
			maxWidth: NODE_WIDTH_PX - 56, // px-7 = 56px horizontal padding
			lineHeight: 1.6,
			padding: '0px',
		})
		return height + size.h + 48
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

function renderInlineMarkdown(text: string): React.ReactNode[] {
	const parts = text.split('**')
	return parts.map((part, index) => {
		if (index % 2 === 1) {
			return (
				<strong key={index} className="font-bold text-zinc-50">
					{part}
				</strong>
			)
		}
		return part
	})
}

function parseMarkdown(text: string): React.ReactNode {
	const lines = text.split('\n')
	return lines.map((line, idx) => {
		if (line.startsWith('### ')) {
			return (
				<h3 key={idx} className="text-[14px] font-semibold text-zinc-100 mt-3 mb-1">
					{renderInlineMarkdown(line.slice(4))}
				</h3>
			)
		}
		if (line.startsWith('## ')) {
			return (
				<h2 key={idx} className="text-[15px] font-semibold text-zinc-100 mt-4 mb-1.5">
					{renderInlineMarkdown(line.slice(3))}
				</h2>
			)
		}
		if (line.startsWith('# ')) {
			return (
				<h1 key={idx} className="text-[16px] font-bold text-zinc-100 mt-4 mb-2">
					{renderInlineMarkdown(line.slice(2))}
				</h1>
			)
		}

		const matchOrdered = line.match(/^(\d+)\.\s+(.*)$/)
		if (matchOrdered) {
			return (
				<div key={idx} className="flex gap-2.5 my-1.5 ml-1 text-[13px] leading-[1.6] text-zinc-300">
					<span className="text-zinc-500 min-w-[16px] text-right">{matchOrdered[1]}.</span>
					<span>{renderInlineMarkdown(matchOrdered[2])}</span>
				</div>
			)
		}

		if (line.startsWith('- ') || line.startsWith('* ')) {
			return (
				<div key={idx} className="flex gap-2.5 my-1.5 ml-1 text-[13px] leading-[1.6] text-zinc-300">
					<span className="text-zinc-500">•</span>
					<span>{renderInlineMarkdown(line.slice(2))}</span>
				</div>
			)
		}

		if (line.trim() === '') {
			return <div key={idx} className="h-2.5" />
		}

		return (
			<p key={idx} className="my-1.5 text-[13px] leading-[1.6] text-zinc-300">
				{renderInlineMarkdown(line)}
			</p>
		)
	})
}

function MessageNodeComponent({ node, shape }: NodeComponentProps<MessageNode>) {
	const editor = useEditor()

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

	const handleMessageChange = useCallback(
		(value: string) => {
			updateNode<MessageNode>(editor, shape, (node) => ({
				...node,
				userMessage: value,
			}))
		},
		[editor, shape]
	)

	const images = node.images || []
	const assistantMessage = node.assistantMessage.trim()
	const isSent = assistantMessage !== ''

	return (
		<>
			<div
				className="pointer-events-auto flex flex-col w-full h-full bg-[#161618] border border-[#2C2C2E] rounded-[28px] shadow-[0_16px_50px_rgba(0,0,0,0.55)] overflow-hidden"
				style={{ pointerEvents: 'auto' }}
			>
				{/* Header grab bar - NO pointer down handler to allow dragging through tldraw bubbling */}
				<div
					className="flex items-center justify-end px-3.5 py-1.5 cursor-grab active:cursor-grabbing select-none"
				>
					<GripVertical className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-400 transition-colors" />
				</div>

				{/* Images: overlapping fanned photo stack */}
				{images.length > 0 && (
					<div className="flex flex-row justify-center items-center h-[200px] px-7 pt-2 box-border">
						{images.map((img, idx) => {
							const rotations = ['-6deg', '2deg', '5deg']
							const rotation = rotations[idx % rotations.length]
							return (
								<div
									key={idx}
									className="group relative shrink-0 bg-white rounded-2xl p-2 shadow-[0_10px_30px_rgba(0,0,0,0.45)] cursor-pointer transition-all duration-300 ease-out hover:scale-110 hover:-translate-y-2 hover:!rotate-0 hover:z-10"
									style={{
										rotate: rotation,
										marginLeft: idx === 0 ? 0 : -28,
										zIndex: idx,
									}}
									onClick={() => {
										const searchUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(img.title)}`
										window.open(searchUrl, '_blank')
									}}
									title={img.title}
								>
									<img
										src={img.url}
										alt={img.title}
										className="w-[128px] h-[148px] object-cover rounded-xl"
										draggable={false}
									/>
								</div>
							)
						})}
					</div>
				)}

				{/* User Message (Static / Read-only after send, editable before send) */}
				{isSent ? (
					<div
						className="px-7 pt-5 pb-3 text-[17px] font-semibold leading-[1.4] text-zinc-100 select-text"
						onPointerDown={editor.markEventAsHandled}
					>
						{node.userMessage}
					</div>
				) : (
					/* User Message Input */
					<div className="flex items-center gap-2 px-4 pb-4 pt-1" onPointerDown={editor.markEventAsHandled}>
						<div className="relative flex-grow flex items-center bg-[#1E1E20] border border-[#2C2C2E] focus-within:border-[#4A4A4E] rounded-2xl transition-all w-full">
							<input
								type="text"
								className="w-full bg-transparent border-0 py-3 pl-4 pr-12 text-[14px] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-0"
								placeholder="Ask or branch conversation..."
								value={node.userMessage}
								onChange={(e) => handleMessageChange(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										handleSend()
									}
								}}
							/>
							<button
								onClick={handleSend}
								disabled={!node.userMessage.trim()}
								className="absolute right-2 p-2 rounded-xl bg-zinc-100 hover:bg-white disabled:bg-transparent text-zinc-900 disabled:text-zinc-600 transition-all duration-200"
							>
								<ArrowUp className="w-4 h-4" />
							</button>
						</div>
					</div>
				)}

				{/* AI Response output - shows full text content without overflow scroll constraints */}
				{node.assistantMessage && (
					<div className="px-7 pb-6">
						<div className="text-[13px] leading-[1.6] text-zinc-300 font-normal font-sans antialiased">
							{parseMarkdown(node.assistantMessage)}
						</div>
					</div>
				)}
			</div>
		</>
	)
}
