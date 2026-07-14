import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Command } from 'cmdk'
import {
	DefaultNavigationPanel,
	DefaultStylePanel,
	Editor,
	TLComponents,
	Tldraw,
	TldrawOptions,
	uniqueId,
	useEditor,
	useValue,
} from 'tldraw'
import { Menu, PanelLeft, Plus, Trash2, Search, Maximize2, Minimize2 } from 'lucide-react'
import { overrides, WorkflowToolbar } from './components/WorkflowToolbar.tsx'
import { ConnectionBindingUtil } from './connection/ConnectionBindingUtil.tsx'
import { ConnectionShapeUtil } from './connection/ConnectionShapeUtil.tsx'
import { keepConnectionsAtBottom } from './connection/keepConnectionsAtBottom.tsx'
import { disableTransparency } from './disableTransparency.tsx'
import { NodeShape, NodeShapeUtil } from './nodes/NodeShapeUtil.tsx'
import { layoutAllConversationTrees } from './nodes/layoutConversationTree.ts'
import { PointingPort } from './ports/PointingPort.tsx'

// Define custom shape utilities that extend tldraw's shape system
const shapeUtils = [NodeShapeUtil, ConnectionShapeUtil]
// Define binding utilities that handle relationships between shapes
const bindingUtils = [ConnectionBindingUtil]
// Customize tldraw's UI components to add workflow-specific functionality
const components: TLComponents = {
	Toolbar: () => (
		<>
			{/* Main tools toolbar (mouse, nodes, shapes) positioned at bottom-center */}
			<div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[999] pointer-events-auto flex items-center justify-center">
				<WorkflowToolbar />
			</div>

			<CanvasActionsToolbar />
		</>
	),

	MenuPanel: () => null,
	NavigationPanel: BurroNavigationPanel,
	StylePanel: () => {
		const editor = useEditor()
		const shouldShowStylePanel = useValue(
			'shouldShowStylePanel',
			() => {
				return (
					!editor.isIn('select') ||
					editor.getSelectedShapes().some((s) => s.type !== 'node' && s.type !== 'connection')
				)
			},
			[editor]
		)
		if (!shouldShowStylePanel) return
		return <DefaultStylePanel />
	},
}

function isInitialCanvas(editor: Editor) {
	const shapes = editor.getCurrentPageShapes()
	if (shapes.length !== 1) return false
	const shape = shapes[0]
	return (
		editor.isShapeOfType(shape, 'node') &&
		shape.props.node.type === 'message' &&
		!shape.props.node.userMessage.trim() &&
		!shape.props.node.assistantMessage.trim()
	)
}

function BurroNavigationPanel() {
	const editor = useEditor()
	const isInitial = useValue('initial canvas navigation visibility', () => isInitialCanvas(editor), [editor])
	if (isInitial) return null
	return <DefaultNavigationPanel />
}

function CanvasActionsToolbar() {
	const editor = useEditor()
	const shouldReduceMotion = useReducedMotion()
	const isInitial = useValue('initial canvas actions visibility', () => isInitialCanvas(editor), [editor])
	const compactMode = useValue(
		'conversation compact mode',
		() => {
			const messages = editor
				.getCurrentPageShapes()
				.filter((shape): shape is NodeShape => editor.isShapeOfType(shape, 'node'))
				.filter(
					(shape) =>
						shape.props.node.type === 'message' &&
						shape.props.node.assistantMessage.trim() !== '' &&
						shape.props.node.assistantMessage.trim() !== '...'
				)
			return messages.some((shape) => shape.props.node.type === 'message' && shape.props.node.compact)
		},
		[editor]
	)

	const toggleCompactMode = () => {
		const updates = editor
			.getCurrentPageShapes()
			.filter((shape): shape is NodeShape => editor.isShapeOfType(shape, 'node'))
			.filter(
				(shape) =>
					shape.props.node.type === 'message' &&
					shape.props.node.assistantMessage.trim() !== '' &&
					shape.props.node.assistantMessage.trim() !== '...'
			)
			.map((shape) => ({
				id: shape.id,
				type: 'node' as const,
				props: { node: { ...shape.props.node, compact: !compactMode } },
			}))
		editor.updateShapes(updates)
		requestAnimationFrame(() => layoutAllConversationTrees(editor, true))
	}

	if (isInitial) return null

	return (
		<div className="fixed right-4 top-4 z-[999] flex items-center gap-0.5 rounded-[15px] bg-[#1A1A1D]/82 p-1 shadow-[0_12px_32px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-2xl pointer-events-auto">
			<motion.button
				type="button"
				onClick={() => window.dispatchEvent(new CustomEvent('burro:new-canvas'))}
				className="flex h-9 w-9 items-center justify-center rounded-[11px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
				whileHover={shouldReduceMotion ? undefined : { y: -1, scale: 1.04 }}
				whileTap={shouldReduceMotion ? undefined : { y: 1, scale: 0.94 }}
				transition={{ type: 'spring', stiffness: 500, damping: 30 }}
				title="New canvas"
				aria-label="New canvas"
			>
				<Plus className="h-[17px] w-[17px]" />
			</motion.button>
			<motion.button
				type="button"
				onClick={toggleCompactMode}
				className={`flex h-9 w-9 items-center justify-center rounded-[11px] transition-colors ${
					compactMode
						? 'bg-violet-600 text-white shadow-[0_7px_18px_rgba(109,40,217,0.3),inset_0_1px_0_rgba(255,255,255,0.12)]'
						: 'text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200'
				}`}
				whileHover={shouldReduceMotion ? undefined : { y: -1, scale: 1.04 }}
				whileTap={shouldReduceMotion ? undefined : { y: 1, scale: 0.94 }}
				transition={{ type: 'spring', stiffness: 500, damping: 30 }}
				title={compactMode ? 'Expand all cards' : 'Compact answered cards'}
				aria-label={compactMode ? 'Expand all cards' : 'Compact answered cards'}
				aria-pressed={compactMode}
			>
				{compactMode ? <Maximize2 className="h-[17px] w-[17px]" /> : <Minimize2 className="h-[17px] w-[17px]" />}
			</motion.button>
		</div>
	)
}

const options: Partial<TldrawOptions> = {
	actionShortcutsLocation: 'menu',
	maxPages: 1,
}

interface WorkspacePreview {
	title: string
	images: string[]
	hasContent: boolean
}

interface Workspace {
	id: string
	name: string
	createdAt: number
	updatedAt: number
	preview?: WorkspacePreview
	draft?: boolean
}

// Snapshot the canvas for the sidebar card: first user message + first two images
function getWorkspacePreview(editor: Editor): WorkspacePreview {
	const pageShapes = editor.getCurrentPageShapes()
	const nodeShapes = pageShapes
		.filter((s): s is NodeShape => s.type === 'node')
		.sort((a, b) => a.y - b.y)

	let title = ''
	const images: string[] = []
	for (const shape of nodeShapes) {
		const node = shape.props.node
		if (node.type !== 'message') continue
		if (!title && node.userMessage.trim()) title = node.userMessage.trim()
		for (const img of node.images ?? []) {
			if (images.length < 2) images.push(img.url)
		}
		if (title && images.length >= 2) break
	}
	const hasContent = pageShapes.some((shape) => {
		if (shape.type !== 'node') return true
		const node = shape.props.node
		if (node.type !== 'message') return true
		return Boolean(node.userMessage.trim() || node.assistantMessage.trim())
	})
	return { title, images, hasContent }
}

const WORKSPACES_STORAGE_KEY = 'burro.workspaces'
const CURRENT_WORKSPACE_KEY = 'burro.currentWorkspace'

function loadWorkspaces(): Workspace[] {
	try {
		const raw = localStorage.getItem(WORKSPACES_STORAGE_KEY)
		if (raw) {
			const parsed = JSON.parse(raw) as Workspace[]
			if (Array.isArray(parsed) && parsed.length > 0) return parsed
		}
	} catch {
		// fall through to default
	}
	// 'workflow' matches the original persistenceKey so existing canvases are kept
	const now = Date.now()
	return [{ id: 'workflow', name: 'My canvas', createdAt: now, updatedAt: now, draft: true }]
}

function formatUpdated(timestamp: number): string {
	const date = new Date(timestamp)
	const now = new Date()
	const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase()
	if (date.toDateString() === now.toDateString()) return `Today at ${time}`
	const yesterday = new Date(now)
	yesterday.setDate(now.getDate() - 1)
	if (date.toDateString() === yesterday.toDateString()) return `Yesterday at ${time}`
	return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${time}`
}

function App() {
	const shouldReduceMotion = useReducedMotion()
	const activeEditorRef = useRef<Editor | null>(null)
	const [isSidebarOpen, setIsSidebarOpen] = useState(false)
	const [isCommandOpen, setIsCommandOpen] = useState(false)
	const [workspaces, setWorkspaces] = useState<Workspace[]>(loadWorkspaces)
	const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>(() => {
		const stored = localStorage.getItem(CURRENT_WORKSPACE_KEY)
		const list = loadWorkspaces()
		return stored && list.some((w) => w.id === stored) ? stored : list[0].id
	})

	useEffect(() => {
		localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(workspaces))
	}, [workspaces])

	useEffect(() => {
		localStorage.setItem(CURRENT_WORKSPACE_KEY, currentWorkspaceId)
	}, [currentWorkspaceId])

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault()
				setIsCommandOpen((open) => !open)
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [])

	const touchWorkspace = useCallback((id: string, preview: WorkspacePreview) => {
		setWorkspaces((prev) =>
			prev.map((w) =>
				w.id === id
					? { ...w, updatedAt: Date.now(), preview, draft: preview.hasContent ? false : w.draft }
					: w
			)
		)
	}, [])

	// Refresh a workspace's card preview without bumping its updatedAt
	const refreshPreview = useCallback((id: string, preview: WorkspacePreview) => {
		setWorkspaces((prev) =>
			prev.map((w) =>
				w.id === id ? { ...w, preview, draft: preview.hasContent ? false : w.draft } : w
			)
		)
	}, [])

	const createWorkspace = useCallback(() => {
		const now = Date.now()
		const current = workspaces.find((workspace) => workspace.id === currentWorkspaceId)
		const currentHasContent = activeEditorRef.current
			? getWorkspacePreview(activeEditorRef.current).hasContent
			: Boolean(current?.preview?.hasContent)
		const discardCurrent = Boolean(current?.draft && !currentHasContent)
		const retainedWorkspaces = discardCurrent
			? workspaces.filter((workspace) => workspace.id !== currentWorkspaceId)
			: workspaces
		const untitledCount = retainedWorkspaces.filter((w) => w.name.startsWith('Untitled')).length
		const workspace: Workspace = {
			id: `ws-${uniqueId()}`,
			name: untitledCount === 0 ? 'Untitled' : `Untitled ${untitledCount + 1}`,
			createdAt: now,
			updatedAt: now,
			draft: true,
		}
		setWorkspaces([workspace, ...retainedWorkspaces])
		setCurrentWorkspaceId(workspace.id)
	}, [workspaces, currentWorkspaceId])

	const openWorkspace = useCallback(
		(id: string) => {
			if (id === currentWorkspaceId) return
			const current = workspaces.find((workspace) => workspace.id === currentWorkspaceId)
			const currentHasContent = activeEditorRef.current
				? getWorkspacePreview(activeEditorRef.current).hasContent
				: Boolean(current?.preview?.hasContent)
			if (current?.draft && !currentHasContent) {
				setWorkspaces((previous) => previous.filter((workspace) => workspace.id !== currentWorkspaceId))
				try {
					indexedDB.deleteDatabase(`TLDRAW_DOCUMENT_v2${currentWorkspaceId}`)
				} catch {
					// best-effort cleanup only
				}
			}
			setCurrentWorkspaceId(id)
		},
		[workspaces, currentWorkspaceId]
	)

	useEffect(() => {
		const handleNewCanvas = () => createWorkspace()
		window.addEventListener('burro:new-canvas', handleNewCanvas)
		return () => window.removeEventListener('burro:new-canvas', handleNewCanvas)
	}, [createWorkspace])

	const deleteWorkspace = useCallback(
		(id: string) => {
			const remaining = workspaces.filter((w) => w.id !== id)
			if (remaining.length === 0) {
				const now = Date.now()
				const fresh: Workspace = { id: `ws-${uniqueId()}`, name: 'Untitled', createdAt: now, updatedAt: now, draft: true }
				setWorkspaces([fresh])
				setCurrentWorkspaceId(fresh.id)
			} else {
				setWorkspaces(remaining)
				if (id === currentWorkspaceId) setCurrentWorkspaceId(remaining[0].id)
			}
			// best-effort cleanup of the tldraw document store for this workspace
			try {
				indexedDB.deleteDatabase(`TLDRAW_DOCUMENT_v2${id}`)
			} catch {
				// ignore
			}
		},
		[workspaces, currentWorkspaceId]
	)

	const sortedWorkspaces = [...workspaces].sort((a, b) => b.updatedAt - a.updatedAt)

	return (
		<div className="workflow" style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				key={currentWorkspaceId}
				persistenceKey={currentWorkspaceId}
				colorScheme="dark"
				options={options}
				overrides={overrides}
				shapeUtils={shapeUtils}
				bindingUtils={bindingUtils}
				components={components}
				onMount={(editorInstance) => {
					;(window as any).editor = editorInstance
					activeEditorRef.current = editorInstance
					if (!editorInstance.getCurrentPageShapes().some((s) => s.type === 'node')) {
						const viewportCenter = editorInstance.getViewportPageBounds().center
						editorInstance.createShape({
							type: 'node',
							x: viewportCenter.x - 280,
							y: viewportCenter.y - 215,
						})
					}

					editorInstance.user.updateUserPreferences({ isSnapMode: true, colorScheme: 'dark' })

					// Burro uses its own restrained line grid rather than tldraw's dot layer.
					editorInstance.updateInstanceState({ isGridMode: false })

					// Add our custom pointing port tool to the select tool's state machine
					// This allows users to create connections by pointing at ports
					editorInstance.getStateDescendant('select')!.addChild(PointingPort)

					// Burro opens in grab/pan mode so the canvas is immediately navigable.
					editorInstance.setCurrentTool('hand')

					// Ensure connections always stay at the bottom of the shape stack
					// This prevents them from covering other shapes
					keepConnectionsAtBottom(editorInstance)

					// Disable transparency for workflow shapes
					disableTransparency(editorInstance, ['node', 'connection'])

					// Normalize canvases saved before structured conversation layout was added.
					layoutAllConversationTrees(editorInstance)

					// Populate this workspace's sidebar card from the loaded canvas
					refreshPreview(currentWorkspaceId, getWorkspacePreview(editorInstance))

					// Bump the workspace's updatedAt + preview when the user edits (debounced)
					let touchTimeout: ReturnType<typeof setTimeout> | undefined
					editorInstance.store.listen(
						() => {
							clearTimeout(touchTimeout)
							touchTimeout = setTimeout(
								() => touchWorkspace(currentWorkspaceId, getWorkspacePreview(editorInstance)),
								1000
							)
						},
						{ scope: 'document', source: 'user' }
					)
				}}
			/>

			{/* Floating canvas menu */}
			<div className="fixed left-4 top-4 z-[999] rounded-[15px] bg-[#1A1A1D]/82 p-1 shadow-[0_12px_32px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-2xl pointer-events-auto">
				<motion.button
					onClick={() => setIsSidebarOpen(true)}
					className="flex h-9 w-9 items-center justify-center rounded-[11px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
					whileHover={shouldReduceMotion ? undefined : { y: -1, scale: 1.04 }}
					whileTap={shouldReduceMotion ? undefined : { y: 1, scale: 0.94 }}
					transition={{ type: 'spring', stiffness: 500, damping: 30 }}
					title="Open canvases"
					aria-label="Open canvases"
				>
					<Menu className="h-[17px] w-[17px]" />
				</motion.button>
			</div>

			<AnimatePresence>
				{isSidebarOpen && (
					<>
						<motion.div
							className="fixed inset-0 z-[1000] bg-black/65 backdrop-blur-md pointer-events-auto"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: shouldReduceMotion ? 0 : 0.22 }}
							onClick={() => setIsSidebarOpen(false)}
						/>

						<motion.aside
							className="fixed inset-y-0 left-0 z-[1001] flex w-80 max-w-[calc(100vw-16px)] flex-col border-r border-white/[0.055] bg-[#151517]/94 shadow-[16px_0_48px_rgba(0,0,0,0.46),inset_-1px_0_0_rgba(255,255,255,0.025)] backdrop-blur-2xl pointer-events-auto"
							initial={shouldReduceMotion ? { opacity: 0 } : { x: '-100%' }}
							animate={{ opacity: 1, x: 0 }}
							exit={shouldReduceMotion ? { opacity: 0 } : { x: '-100%' }}
							transition={{ type: 'spring', stiffness: 390, damping: 36, mass: 0.9 }}
						>
							{/* shadcn-style header */}
							<div className="flex items-center justify-between px-4 pt-5">
								<div className="text-[24px] font-semibold leading-none tracking-[-0.04em] text-zinc-100">
									burro<span className="text-violet-400">.</span>
								</div>
								<motion.button
									onClick={() => setIsSidebarOpen(false)}
									className="flex h-9 w-9 items-center justify-center rounded-[10px] text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200"
									whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
									whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
									transition={{ type: 'spring', stiffness: 500, damping: 30 }}
									aria-label="Close canvases"
								>
									<PanelLeft className="h-[18px] w-[18px]" />
								</motion.button>
							</div>

							<div className="mx-3 mb-6 mt-4 flex gap-0.5 rounded-[15px] bg-[#1A1A1D]/82 p-1 shadow-[0_12px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-2xl">
								<motion.button
									onClick={() => {
										createWorkspace()
										setIsSidebarOpen(false)
									}}
									className="order-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
									whileHover={shouldReduceMotion ? undefined : { y: -1, scale: 1.04 }}
									whileTap={shouldReduceMotion ? undefined : { y: 1, scale: 0.94 }}
									transition={{ type: 'spring', stiffness: 500, damping: 30 }}
									title="New canvas"
									aria-label="New canvas"
								>
									<Plus className="h-[17px] w-[17px]" />
								</motion.button>
								<motion.button
									onClick={() => setIsCommandOpen(true)}
									className="order-1 flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-[11px] px-3 text-[13px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
									whileHover={shouldReduceMotion ? undefined : { y: -1 }}
									whileTap={shouldReduceMotion ? undefined : { y: 1, scale: 0.985 }}
									transition={{ type: 'spring', stiffness: 500, damping: 30 }}
								>
									<Search className="h-[17px] w-[17px]" />
									<span className="flex-1 text-left">Search canvases</span>
									<kbd className="rounded-md bg-white/[0.055] px-1.5 py-0.5 text-[9px] text-zinc-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">⌘K</kbd>
								</motion.button>
							</div>

							<div className="scrollbar-none flex-grow overflow-y-auto px-2 pb-3">
								<AnimatePresence initial={false}>
									{sortedWorkspaces.map((workspace, workspaceIndex) => {
										const isActive = workspace.id === currentWorkspaceId
										const previewImages = workspace.preview?.images ?? []
										const title = workspace.preview?.title || workspace.name
										return (
											<motion.div
												layout
												key={workspace.id}
												role="button"
												tabIndex={0}
												onClick={() => {
											openWorkspace(workspace.id)
													setIsSidebarOpen(false)
												}}
												onKeyDown={(event) => {
													if (event.key === 'Enter' || event.key === ' ') {
														event.preventDefault()
												openWorkspace(workspace.id)
														setIsSidebarOpen(false)
													}
												}}
												className={`group relative mb-3 cursor-pointer overflow-hidden rounded-[15px] border px-4 pb-4 pt-5 outline-none backdrop-blur-2xl transition-[background-color,border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-violet-400/40 ${
													isActive
														? 'border-white/[0.14] bg-[#1A1A1D]/92 text-zinc-100 shadow-[0_14px_34px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.055)]'
														: 'border-transparent bg-[#1A1A1D]/58 text-zinc-300 shadow-[0_8px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.025)] hover:bg-[#1A1A1D]/88 hover:shadow-[0_14px_32px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.045)]'
												}`}
												initial={shouldReduceMotion ? false : { opacity: 0, x: -10 }}
												animate={{ opacity: 1, x: 0 }}
												exit={{ opacity: 0, x: -8, scale: 0.98 }}
												transition={{ delay: shouldReduceMotion ? 0 : workspaceIndex * 0.035, type: 'spring', stiffness: 440, damping: 34 }}
												whileHover={shouldReduceMotion ? undefined : { y: -2 }}
											>
												<div className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-xl bg-black/25 shadow-[inset_0_1px_14px_rgba(0,0,0,0.3)] backdrop-blur-sm">
													{previewImages.length > 0 ? (
														previewImages.slice(0, 2).map((url, idx) => (
															<motion.div
																key={url}
																className="absolute overflow-hidden rounded-xl bg-white p-1 shadow-[0_12px_28px_rgba(0,0,0,0.5)]"
																style={{ zIndex: idx }}
																animate={{
																	x: previewImages.length === 1 ? 0 : idx === 0 ? -48 : 48,
																	y: idx === 0 ? 8 : -2,
																	rotate: previewImages.length === 1 ? -2 : idx === 0 ? -3 : 4,
																}}
																whileHover={shouldReduceMotion ? undefined : { y: -7, rotate: 0, scale: 1.04, zIndex: 10 }}
																transition={{ type: 'spring', stiffness: 420, damping: 30 }}
															>
																<img src={url} alt="" className="h-24 w-32 rounded-lg object-cover" draggable={false} />
															</motion.div>
														))
													) : (
														<div className="flex h-20 w-28 items-center justify-center rounded-xl bg-white/[0.035] text-[26px] font-semibold uppercase text-zinc-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] backdrop-blur-md">{title.charAt(0)}</div>
													)}
												</div>

												<div className="px-2 pt-3.5 text-center">
													<div className="line-clamp-2 text-[15px] font-medium leading-[1.45] tracking-[-0.01em] text-zinc-100">
														{title}
													</div>
													<div className="mt-1.5 text-[11px] leading-4 text-zinc-500">
														Last updated {formatUpdated(workspace.updatedAt)}
													</div>
												</div>

												<motion.button
													onClick={(event) => {
														event.stopPropagation()
														deleteWorkspace(workspace.id)
													}}
													className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#1A1A1D]/82 text-zinc-500 opacity-0 shadow-[0_8px_22px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-2xl transition-colors group-hover:opacity-100 hover:bg-red-500/15 hover:text-red-300 focus:opacity-100"
													whileHover={shouldReduceMotion ? undefined : { scale: 1.08 }}
													whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
													title="Delete canvas"
													aria-label={`Delete ${title}`}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</motion.button>
											</motion.div>
										)
									})}
								</AnimatePresence>
							</div>

						</motion.aside>
					</>
				)}
			</AnimatePresence>

			<Command.Dialog
				open={isCommandOpen}
				onOpenChange={setIsCommandOpen}
				label="Search canvases"
				loop
				className="burro-command overflow-hidden"
				overlayClassName="fixed inset-0 z-[1999] bg-black/65 backdrop-blur-sm"
				contentClassName="fixed left-1/2 top-[18vh] z-[2000] w-[min(540px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-xl border border-[#323237] bg-[#161618] shadow-[0_28px_90px_rgba(0,0,0,0.7)]"
			>
				<div className="flex items-center gap-3 border-b border-[#29292D] px-4">
					<Search className="h-4 w-4 shrink-0 text-zinc-500" />
					<Command.Input
						placeholder="Search canvases..."
						className="h-13 w-full bg-transparent text-[14px] text-zinc-100 outline-none placeholder:text-zinc-600"
					/>
					<kbd className="rounded border border-[#35353A] bg-[#1D1D20] px-1.5 py-0.5 text-[9px] text-zinc-600">ESC</kbd>
				</div>
				<Command.List className="max-h-[420px] overflow-y-auto p-2">
					<Command.Empty className="py-12 text-center text-[13px] text-zinc-500">
						No matching canvases.
					</Command.Empty>
					<Command.Group heading="Canvases">
						{sortedWorkspaces.map((workspace) => {
							const title = workspace.preview?.title || workspace.name
							const thumbnail = workspace.preview?.images?.[0]
							return (
								<Command.Item
									key={workspace.id}
									value={workspace.id}
									keywords={[title, workspace.name]}
									onSelect={() => {
										openWorkspace(workspace.id)
										setIsCommandOpen(false)
										setIsSidebarOpen(false)
									}}
									className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-zinc-400 outline-none data-[selected=true]:bg-[#29292D] data-[selected=true]:text-zinc-100"
								>
									<div className="flex h-11 w-13 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#343438] bg-[#1B1B1E]">
										{thumbnail ? (
											<img src={thumbnail} alt="" className="h-full w-full object-cover" draggable={false} />
										) : (
											<span className="text-[12px] font-semibold uppercase text-zinc-600">{title.charAt(0)}</span>
										)}
									</div>
									<div className="min-w-0 flex-1">
										<div className="truncate text-[13px] font-medium">{title}</div>
										<div className="mt-0.5 truncate text-[10px] text-zinc-600">
											Last updated {formatUpdated(workspace.updatedAt)}
										</div>
									</div>
									{workspace.id === currentWorkspaceId && (
										<span className="text-[9px] font-medium uppercase tracking-wider text-violet-400">Current</span>
									)}
								</Command.Item>
							)
						})}
					</Command.Group>
				</Command.List>
			</Command.Dialog>
		</div>
	)
}

export default App
