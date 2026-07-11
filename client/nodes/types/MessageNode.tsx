import { ModelMessage } from 'ai'
import { useCallback } from 'react'
import { T, TldrawUiButton, TldrawUiButtonIcon, TldrawUiInput, useEditor } from 'tldraw'
import { HandleIcon } from '../../components/icons/HandleIcon'
import { SendIcon } from '../../components/icons/SendIcon'
import { NODE_HEIGHT_PX, NODE_WIDTH_PX } from '../../constants'
import { getAllConnectedNodes } from '../nodePorts'
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
	icon = <SendIcon />
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
		let height = NODE_HEIGHT_PX
		const images = _node.images || []
		if (images.length > 0) {
			height += 120
		}
		const assistantMessage = _node.assistantMessage.trim()
		if (assistantMessage === '') return height
		const size = this.editor.textMeasure.measureText(assistantMessage, {
			fontFamily: 'Inter',
			fontSize: 12,
			fontWeight: '500',
			fontStyle: 'normal',
			maxWidth: NODE_WIDTH_PX,
			lineHeight: 1.3,
			padding: '12px',
		})
		return height + size.h
	}
	getPorts(shape: NodeShape, node: MessageNode) {
		return {
			input: shapeInputPort,
			output: {
				...shapeOutputPort,
				y: this.getBodyHeightPx(shape, node),
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
			return <strong key={index} style={{ fontWeight: 'bold', color: 'var(--tl-color-text, #ffffff)' }}>{part}</strong>
		}
		return part
	})
}

function parseMarkdown(text: string): React.ReactNode {
	const lines = text.split('\n')
	return lines.map((line, idx) => {
		if (line.startsWith('### ')) {
			return (
				<h3 key={idx} style={{ fontSize: '13px', fontWeight: 'bold', margin: '8px 0 4px 0', borderBottom: '1px solid var(--tl-color-divider, #3f3f46)', paddingBottom: '2px', color: 'var(--tl-color-text)' }}>
					{renderInlineMarkdown(line.slice(4))}
				</h3>
			)
		}
		if (line.startsWith('## ')) {
			return (
				<h2 key={idx} style={{ fontSize: '14px', fontWeight: 'bold', margin: '12px 0 6px 0', borderBottom: '1px solid var(--tl-color-divider, #3f3f46)', paddingBottom: '2px', color: 'var(--tl-color-text)' }}>
					{renderInlineMarkdown(line.slice(3))}
				</h2>
			)
		}
		if (line.startsWith('# ')) {
			return (
				<h1 key={idx} style={{ fontSize: '15px', fontWeight: 'bold', margin: '14px 0 8px 0', color: 'var(--tl-color-text)' }}>
					{renderInlineMarkdown(line.slice(2))}
				</h1>
			)
		}

		const matchOrdered = line.match(/^(\d+)\.\s+(.*)$/)
		if (matchOrdered) {
			return (
				<div key={idx} style={{ display: 'flex', gap: '6px', margin: '3px 0 3px 8px', fontSize: '11.5px', lineHeight: '1.4', color: 'var(--tl-color-text)' }}>
					<span style={{ fontWeight: 'bold', minWidth: '14px' }}>{matchOrdered[1]}.</span>
					<span>{renderInlineMarkdown(matchOrdered[2])}</span>
				</div>
			)
		}

		if (line.startsWith('- ') || line.startsWith('* ')) {
			return (
				<div key={idx} style={{ display: 'flex', gap: '6px', margin: '3px 0 3px 8px', fontSize: '11.5px', lineHeight: '1.4', color: 'var(--tl-color-text)' }}>
					<span style={{ fontWeight: 'bold' }}>•</span>
					<span>{renderInlineMarkdown(line.slice(2))}</span>
				</div>
			)
		}

		if (line.trim() === '') {
			return <div key={idx} style={{ height: '6px' }} />
		}

		return (
			<p key={idx} style={{ margin: '3px 0', fontSize: '11.5px', lineHeight: '1.4', color: 'var(--tl-color-text)' }}>
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

	return (
		<>
			<div
				style={{
					pointerEvents: 'auto',
					display: 'flex',
					flexDirection: 'column',
				}}
			>
				{/* Images section */}
				{images.length > 0 && (
					<div
						style={{
							display: 'flex',
							flexDirection: 'row',
							gap: '16px',
							padding: '16px 20px 8px 20px',
							overflowX: 'auto',
							alignItems: 'center',
							height: '120px',
							boxSizing: 'border-box',
							scrollbarWidth: 'none',
						}}
					>
						{images.map((img, idx) => {
							const rotations = ['-3deg', '2deg', '-1.5deg']
							const rotation = rotations[idx % rotations.length]
							return (
								<div
									key={idx}
									style={{
										width: '85px',
										height: '90px',
										flexShrink: 0,
										background: 'rgba(30, 30, 35, 0.75)',
										backdropFilter: 'blur(12px)',
										WebkitBackdropFilter: 'blur(12px)',
										border: '1px solid rgba(255, 255, 255, 0.08)',
										borderRadius: '10px',
										padding: '6px',
										boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
										display: 'flex',
										flexDirection: 'column',
										cursor: 'pointer',
										transform: `rotate(${rotation})`,
										transition: 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), border-color 0.2s ease, box-shadow 0.2s ease',
										boxSizing: 'border-box',
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.transform = 'scale(1.22) rotate(0deg) translateY(-4px)'
										e.currentTarget.style.zIndex = '10'
										e.currentTarget.style.borderColor = 'var(--tl-color-selected, #2f80ed)'
										e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.4), 0 0 12px rgba(47, 128, 237, 0.3)'
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.transform = `rotate(${rotation})`
										e.currentTarget.style.zIndex = 'auto'
										e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
										e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)'
									}}
									onClick={() => {
										const searchUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(img.title)}`
										window.open(searchUrl, '_blank')
									}}
									title={img.title}
								>
									<div
										style={{
											fontSize: '7.5px',
											fontWeight: 700,
											color: 'rgba(255, 255, 255, 0.9)',
											textAlign: 'center',
											whiteSpace: 'nowrap',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											marginBottom: '4px',
											width: '100%',
											textTransform: 'uppercase',
											letterSpacing: '0.03em',
										}}
									>
										{img.title}
									</div>
									<img
										src={img.url}
										alt={img.title}
										style={{
											flexGrow: 1,
											width: '100%',
											height: '0',
											objectFit: 'cover',
											borderRadius: '6px',
											border: '1px solid rgba(255, 255, 255, 0.05)',
										}}
									/>
								</div>
							)
						})}
					</div>
				)}

				<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
					<div
						style={{
							height: '100%',
							width: 32,
							paddingLeft: 4,
							display: 'flex',
							justifyContent: 'center',
							alignItems: 'center',
							cursor: 'grab',
						}}
					>
						<TldrawUiButtonIcon icon={<HandleIcon />} />
					</div>
					<div
						style={{ padding: '4px 0px 0px 4px', flexGrow: 2 }}
						onPointerDown={editor.markEventAsHandled}
					>
						<div style={{ padding: '0px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
							<TldrawUiInput
								value={node.userMessage}
								onValueChange={handleMessageChange}
								onComplete={handleSend}
							/>
						</div>
					</div>
					<div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0px 0px' }}>
						<TldrawUiButton
							type="primary"
							onClick={handleSend}
							onPointerDown={editor.markEventAsHandled}
						>
							<TldrawUiButtonIcon icon={<SendIcon />} />
						</TldrawUiButton>
					</div>
				</div>
				{node.assistantMessage && (
					<div style={{ padding: 4 }}>
						<div
							style={{
								padding: '8px 12px',
								lineHeight: '1.4',
								fontSize: '12px',
								borderRadius: 6,
								border: '1px solid var(--tl-color-divider, #3f3f46)',
								fontWeight: '500',
								fontFamily: 'Inter',
								overflowWrap: 'break-word',
								color: 'var(--tl-color-text)',
								background: 'var(--tl-color-panel-2, rgba(0, 0, 0, 0.02))',
							}}
						>
							{parseMarkdown(node.assistantMessage)}
						</div>
					</div>
				)}
			</div>
		</>
	)
}
