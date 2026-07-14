import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { GitBranch, Hand, LocateFixed, MousePointer2, Scan, Shapes } from 'lucide-react'
import { ReactNode, useEffect, useState } from 'react'
import {
	AssetToolbarItem,
	ArrowDownToolbarItem,
	ArrowLeftToolbarItem,
	ArrowRightToolbarItem,
	ArrowToolbarItem,
	ArrowUpToolbarItem,
	CheckBoxToolbarItem,
	CloudToolbarItem,
	createShapeId,
	DefaultToolbar,
	DiamondToolbarItem,
	DrawToolbarItem,
	Editor,
	EllipseToolbarItem,
	EraserToolbarItem,
	FrameToolbarItem,
	HeartToolbarItem,
	HexagonToolbarItem,
	HighlightToolbarItem,
	LaserToolbarItem,
	LineToolbarItem,
	NoteToolbarItem,
	onDragFromToolbarToCreateShape,
	OvalToolbarItem,
	RectangleToolbarItem,
	RhombusToolbarItem,
	StarToolbarItem,
	TextToolbarItem,
	TldrawUiMenuGroup,
	TLShapeId,
	TLUiOverrides,
	TrapezoidToolbarItem,
	TriangleToolbarItem,
	useEditor,
	useValue,
	Vec,
	XBoxToolbarItem,
} from 'tldraw'
import { layoutAllConversationTrees } from '../nodes/layoutConversationTree'
import { getNodePortConnections } from '../nodes/nodePorts'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { getNodeDefinitions, NodeType } from '../nodes/nodeTypes'

function createNodeShape(editor: Editor, shapeId: TLShapeId, center: Vec, node: NodeType) {
	// Mark a history stopping point for undo/redo
	const markId = editor.markHistoryStoppingPoint('create node')

	editor.run(() => {
		// Create the shape with the node definition
		editor.createShape({
			id: shapeId,
			type: 'node',
			props: { node },
		})

		// Get the created shape and its bounds
		const shape = editor.getShape<NodeShape>(shapeId)!
		const shapeBounds = editor.getShapePageBounds(shapeId)!

		// Position the shape so its center aligns with the drop point
		const x = center.x - shapeBounds.width / 2
		const y = center.y - shapeBounds.height / 2
		editor.updateShape({ ...shape, x, y })

		// Select the newly created shape
		editor.select(shapeId)
	})

	return markId
}

export const overrides: TLUiOverrides = {
	tools: (editor, tools, _) => {
		for (const nodeDef of Object.values(getNodeDefinitions(editor))) {
			tools[`node-${nodeDef.type}`] = {
				id: `node-${nodeDef.type}`,
				label: nodeDef.title,
				icon: nodeDef.icon,
				onSelect: () => {
					createNodeShape(
						editor,
						createShapeId(),
						editor.getViewportPageBounds().center,
						nodeDef.getDefault()
					)
				},
				onDragStart: (_, info) => {
					onDragFromToolbarToCreateShape(editor, info, {
						createShape: (id) => {
							editor.createShape({
								id,
								type: 'node',
								props: { node: nodeDef.getDefault() },
							})
						},
						onDragEnd: () => {},
					})
				},
			}
		}
		return tools
	},
}

export function WorkflowToolbar() {
	const editor = useEditor()
	const shouldReduceMotion = useReducedMotion()
	const currentTool = useValue('current workflow tool', () => editor.getCurrentToolId(), [editor])
	const [isExtrasOpen, setIsExtrasOpen] = useState(false)

	useEffect(() => {
		setIsExtrasOpen(false)
	}, [currentTool])

	const goToLatestBranch = () => {
		const leaves = editor
			.getCurrentPageShapes()
			.filter((shape): shape is NodeShape => editor.isShapeOfType(shape, 'node'))
			.filter((shape) => shape.props.node.type === 'message')
			.filter((shape) => {
				return !getNodePortConnections(editor, shape).some((connection) => {
					if (connection.terminal !== 'start') return false
					const child = editor.getShape<NodeShape>(connection.connectedShapeId)
					return child?.props.node.type === 'message'
				})
			})
			.sort((a, b) => b.x - a.x || b.y - a.y)

		const latest = leaves[0]
		if (!latest) return
		editor.select(latest.id)
		editor.zoomToSelection({ animation: { duration: shouldReduceMotion ? 0 : 220 } })
	}

	return (
		<div className="burro-workflow-dock relative flex items-center gap-0.5 rounded-[15px] bg-[#1A1A1D]/82 p-1 shadow-[0_12px_32px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-2xl">
			<AnimatePresence>
				{isExtrasOpen && (
					<motion.div
						initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
						transition={{ type: 'spring', stiffness: 430, damping: 32 }}
						className="burro-extras-drawer absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 rounded-2xl bg-[#1A1A1D]/88 p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl"
					>
						<DefaultToolbar orientation="horizontal" maxItems={7}>
							<TldrawUiMenuGroup id="extras-tools">
					<DrawToolbarItem />
					<EraserToolbarItem />
					<TextToolbarItem />
					<NoteToolbarItem />
					<AssetToolbarItem />
					<LineToolbarItem />
					<ArrowToolbarItem />
					<FrameToolbarItem />
					<RectangleToolbarItem />
					<EllipseToolbarItem />
					<TriangleToolbarItem />
					<TrapezoidToolbarItem />
					<DiamondToolbarItem />
					<HexagonToolbarItem />
					<OvalToolbarItem />
					<RhombusToolbarItem />
					<StarToolbarItem />
					<CloudToolbarItem />
					<HeartToolbarItem />
					<XBoxToolbarItem />
					<CheckBoxToolbarItem />
					<ArrowLeftToolbarItem />
					<ArrowRightToolbarItem />
					<ArrowUpToolbarItem />
					<ArrowDownToolbarItem />
					<HighlightToolbarItem />
					<LaserToolbarItem />
							</TldrawUiMenuGroup>
						</DefaultToolbar>
					</motion.div>
				)}
			</AnimatePresence>

			<DockButton
				label="Grab canvas"
				active={currentTool === 'hand'}
				onClick={() => editor.setCurrentTool('hand')}
				shouldReduceMotion={shouldReduceMotion}
			>
				<Hand className="h-[17px] w-[17px]" />
			</DockButton>
			<DockButton
				label="Select"
				active={currentTool === 'select'}
				onClick={() => editor.setCurrentTool('select')}
				shouldReduceMotion={shouldReduceMotion}
			>
				<MousePointer2 className="h-[17px] w-[17px]" />
			</DockButton>
			<DockButton
				label="Drawing and shapes"
				active={isExtrasOpen}
				onClick={() => setIsExtrasOpen((open) => !open)}
				shouldReduceMotion={shouldReduceMotion}
			>
				<Shapes className="h-[17px] w-[17px]" />
			</DockButton>

			<DockButton
				label="Go to latest branch"
				onClick={goToLatestBranch}
				shouldReduceMotion={shouldReduceMotion}
			>
				<LocateFixed className="h-[17px] w-[17px]" />
			</DockButton>
			<DockButton
				label="Tidy branches"
				onClick={() => layoutAllConversationTrees(editor, true)}
				shouldReduceMotion={shouldReduceMotion}
			>
				<GitBranch className="h-[17px] w-[17px]" />
			</DockButton>
			<DockButton
				label="Fit conversation"
				onClick={() => editor.zoomToFit({ animation: { duration: shouldReduceMotion ? 0 : 220 } })}
				shouldReduceMotion={shouldReduceMotion}
			>
				<Scan className="h-[17px] w-[17px]" />
			</DockButton>
		</div>
	)
}

function DockButton({
	label,
	active = false,
	onClick,
	shouldReduceMotion,
	children,
}: {
	label: string
	active?: boolean
	onClick: () => void
	shouldReduceMotion: boolean | null
	children: ReactNode
}) {
	return (
		<motion.button
			type="button"
			onClick={onClick}
			className={`flex h-9 w-9 items-center justify-center rounded-[11px] transition-colors ${
				active
						? 'bg-violet-600 text-white shadow-[0_7px_18px_rgba(109,40,217,0.3),inset_0_1px_0_rgba(255,255,255,0.12)]'
						: 'text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200'
			}`}
			whileHover={shouldReduceMotion ? undefined : { y: -1, scale: 1.04 }}
			whileTap={shouldReduceMotion ? undefined : { y: 1, scale: 0.94 }}
			transition={{ type: 'spring', stiffness: 500, damping: 30 }}
			title={label}
			aria-label={label}
			aria-pressed={active || undefined}
		>
			{children}
		</motion.button>
	)
}
