import { useCallback, useEffect, useState } from 'react'
import {
	DefaultActionsMenu,
	DefaultQuickActions,
	DefaultStylePanel,
	Editor,
	TLComponents,
	Tldraw,
	TldrawOptions,
	TldrawUiToolbar,
	uniqueId,
	useEditor,
	useValue,
} from 'tldraw'
import { Menu, X, Plus, Trash2, Check } from 'lucide-react'
import { overrides, WorkflowToolbar } from './components/WorkflowToolbar.tsx'
import { ConnectionBindingUtil } from './connection/ConnectionBindingUtil.tsx'
import { ConnectionCenterHandleOverlayUtil } from './connection/ConnectionCenterHandleOverlayUtil.tsx'
import { ConnectionShapeUtil } from './connection/ConnectionShapeUtil.tsx'
import { keepConnectionsAtBottom } from './connection/keepConnectionsAtBottom.tsx'
import { disableTransparency } from './disableTransparency.tsx'
import { NodeShape, NodeShapeUtil } from './nodes/NodeShapeUtil.tsx'
import { PointingPort } from './ports/PointingPort.tsx'

// Define custom shape utilities that extend tldraw's shape system
const shapeUtils = [NodeShapeUtil, ConnectionShapeUtil]
// Define binding utilities that handle relationships between shapes
const bindingUtils = [ConnectionBindingUtil]
// Canvas overlays — adds the "+" insert handle at the midpoint of each connection
const overlayUtils = [ConnectionCenterHandleOverlayUtil]

// Customize tldraw's UI components to add workflow-specific functionality
const components: TLComponents = {
	Toolbar: () => (
		<>
			{/* Main tools toolbar (mouse, nodes, shapes) positioned at bottom-center */}
			<div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[999] pointer-events-auto flex items-center justify-center">
				<WorkflowToolbar />
			</div>

			{/* Actions toolbar (undo/redo/delete/menu) positioned in the top-right corner */}
			<div className="fixed top-4 right-4 z-[999] pointer-events-auto bg-[#1C1C1C] border border-[#2C2C2C] rounded-xl p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex items-center">
				<TldrawUiToolbar className="!p-0 !bg-transparent !border-0" label="Actions">
					<DefaultQuickActions />
					<DefaultActionsMenu />
				</TldrawUiToolbar>
			</div>
		</>
	),

	MenuPanel: () => null,
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

const options: Partial<TldrawOptions> = {
	actionShortcutsLocation: 'menu',
	maxPages: 1,
}

interface WorkspacePreview {
	title: string
	images: string[]
}

interface Workspace {
	id: string
	name: string
	createdAt: number
	updatedAt: number
	preview?: WorkspacePreview
}

// Snapshot the canvas for the sidebar card: first user message + first two images
function getWorkspacePreview(editor: Editor): WorkspacePreview {
	const nodeShapes = editor
		.getCurrentPageShapes()
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
	return { title, images }
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
	return [{ id: 'workflow', name: 'My canvas', createdAt: now, updatedAt: now }]
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
	const [isSidebarOpen, setIsSidebarOpen] = useState(false)
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

	const touchWorkspace = useCallback((id: string, preview: WorkspacePreview) => {
		setWorkspaces((prev) =>
			prev.map((w) => (w.id === id ? { ...w, updatedAt: Date.now(), preview } : w))
		)
	}, [])

	// Refresh a workspace's card preview without bumping its updatedAt
	const refreshPreview = useCallback((id: string, preview: WorkspacePreview) => {
		setWorkspaces((prev) => prev.map((w) => (w.id === id ? { ...w, preview } : w)))
	}, [])

	const createWorkspace = useCallback(() => {
		const now = Date.now()
		const untitledCount = workspaces.filter((w) => w.name.startsWith('Untitled')).length
		const workspace: Workspace = {
			id: `ws-${uniqueId()}`,
			name: untitledCount === 0 ? 'Untitled' : `Untitled ${untitledCount + 1}`,
			createdAt: now,
			updatedAt: now,
		}
		setWorkspaces((prev) => [workspace, ...prev])
		setCurrentWorkspaceId(workspace.id)
	}, [workspaces])

	const deleteWorkspace = useCallback(
		(id: string) => {
			const remaining = workspaces.filter((w) => w.id !== id)
			if (remaining.length === 0) {
				const now = Date.now()
				const fresh: Workspace = { id: `ws-${uniqueId()}`, name: 'Untitled', createdAt: now, updatedAt: now }
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
				overlayUtils={overlayUtils}
				components={components}
				onMount={(editorInstance) => {
					;(window as any).editor = editorInstance
					if (!editorInstance.getCurrentPageShapes().some((s) => s.type === 'node')) {
						editorInstance.createShape({ type: 'node', x: 200, y: 200 })
					}

					editorInstance.user.updateUserPreferences({ isSnapMode: true, colorScheme: 'dark' })

					// Figma-style dot grid background
					editorInstance.updateInstanceState({ isGridMode: true })

					// Add our custom pointing port tool to the select tool's state machine
					// This allows users to create connections by pointing at ports
					editorInstance.getStateDescendant('select')!.addChild(PointingPort)

					// Ensure connections always stay at the bottom of the shape stack
					// This prevents them from covering other shapes
					keepConnectionsAtBottom(editorInstance)

					// Disable transparency for workflow shapes
					disableTransparency(editorInstance, ['node', 'connection'])

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

			{/* Floating Hamburger Menu Button */}
			<div className="fixed top-4 left-4 z-[999] pointer-events-auto">
				<button
					onClick={() => setIsSidebarOpen(true)}
					className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1C1C1C] border border-[#2C2C2C] text-zinc-400 hover:text-zinc-200 hover:scale-105 hover:border-zinc-700 shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-200 cursor-pointer"
					title="Open Sidebar"
				>
					<Menu className="w-5 h-5" />
				</button>
			</div>

			{/* Sidebar Slide-over Overlay / Backdrop */}
			{isSidebarOpen && (
				<div
					onClick={() => setIsSidebarOpen(false)}
					className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] pointer-events-auto transition-opacity duration-300"
				/>
			)}

			{/* Sidebar Panel */}
			<div
				className={`fixed top-0 left-0 h-screen w-72 bg-[#161618] border-r border-[#26262A] z-[1001] shadow-[12px_0_40px_rgba(0,0,0,0.6)] pointer-events-auto flex flex-col transition-transform duration-300 ${
					isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
				}`}
			>
				{/* Wordmark */}
				<div className="flex items-center justify-between px-5 pt-5 pb-4">
					<span className="text-[22px] font-semibold tracking-tight text-zinc-100 select-none lowercase">
						burro<span className="text-[#8b5cf6]">.</span>
					</span>
					<button
						onClick={() => setIsSidebarOpen(false)}
						className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-[#232326] transition-colors cursor-pointer"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* New canvas */}
				<div className="px-3 pb-2">
					<button
						onClick={createWorkspace}
						className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-zinc-200 bg-[#1E1E21] hover:bg-[#232326] border border-[#2A2A2E] transition-colors cursor-pointer"
					>
						<Plus className="w-4 h-4 text-zinc-400" />
						New canvas
					</button>
				</div>

				{/* History */}
				<div className="px-5 pt-4 pb-2">
					<span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-zinc-500 select-none">
						History
					</span>
				</div>
				<div className="flex-grow px-3 overflow-y-auto scrollbar-none">
					{sortedWorkspaces.map((workspace) => {
						const isActive = workspace.id === currentWorkspaceId
						const previewImages = workspace.preview?.images ?? []
						const title = workspace.preview?.title || workspace.name
						return (
							<div
								key={workspace.id}
								onClick={() => {
									setCurrentWorkspaceId(workspace.id)
									setIsSidebarOpen(false)
								}}
								className={`group relative mb-3 rounded-2xl border cursor-pointer transition-colors overflow-hidden ${
									isActive
										? 'bg-[#1E1E21] border-[#8b5cf6]/40'
										: 'bg-[#1A1A1D] border-[#26262A] hover:border-[#3A3A3E]'
								}`}
							>
								{/* Stacked image preview */}
								{previewImages.length > 0 && (
									<div className="flex items-center justify-center pt-6 pb-1 h-[128px]">
										{previewImages.map((url, idx) => (
											<div
												key={idx}
												className="bg-white rounded-2xl p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
												style={{
													rotate: idx === 0 ? '-4deg' : '6deg',
													marginLeft: idx === 0 ? 0 : -20,
													zIndex: idx,
												}}
											>
												<img
													src={url}
													alt=""
													className="w-[80px] h-[80px] object-cover rounded-xl"
													draggable={false}
												/>
											</div>
										))}
									</div>
								)}

								{/* Title + timestamp */}
								<div className={`px-4 pb-4 text-center ${previewImages.length > 0 ? 'pt-3' : 'pt-4'}`}>
									<div
										className={`text-[13.5px] font-semibold truncate ${
											isActive ? 'text-zinc-100' : 'text-zinc-300 group-hover:text-zinc-100'
										}`}
									>
										{title}
									</div>
									<div className="text-[11px] text-zinc-500 mt-1">
										Last updated {formatUpdated(workspace.updatedAt)}
									</div>
								</div>

								<button
									onClick={(e) => {
										e.stopPropagation()
										deleteWorkspace(workspace.id)
									}}
									className="absolute top-2 right-2 p-1.5 rounded-lg text-zinc-500 bg-[#161618]/80 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all cursor-pointer"
									title="Delete canvas"
								>
									<Trash2 className="w-3.5 h-3.5" />
								</button>
							</div>
						)
					})}
				</div>

				{/* Autosave status */}
				<div className="flex items-center gap-2 px-5 py-4 border-t border-[#26262A]">
					<Check className="w-3.5 h-3.5 text-zinc-600" />
					<span className="text-[11px] text-zinc-600 select-none">All changes saved</span>
				</div>
			</div>
		</div>
	)
}

export default App
