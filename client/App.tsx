import { useCallback, useEffect, useState } from 'react'
import {
	DefaultActionsMenu,
	DefaultQuickActions,
	DefaultStylePanel,
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
import { NodeShapeUtil } from './nodes/NodeShapeUtil.tsx'
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

interface Workspace {
	id: string
	name: string
	createdAt: number
	updatedAt: number
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

function timeAgo(timestamp: number): string {
	const seconds = Math.floor((Date.now() - timestamp) / 1000)
	if (seconds < 60) return 'just now'
	const minutes = Math.floor(seconds / 60)
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	const days = Math.floor(hours / 24)
	if (days < 30) return `${days}d ago`
	return new Date(timestamp).toLocaleDateString()
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

	const touchWorkspace = useCallback((id: string) => {
		setWorkspaces((prev) =>
			prev.map((w) => (w.id === id ? { ...w, updatedAt: Date.now() } : w))
		)
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
				className={`fixed top-0 left-0 h-screen w-80 bg-[#1C1C1C] border-r border-[#2C2C2C] z-[1001] shadow-[12px_0_40px_rgba(0,0,0,0.6)] pointer-events-auto flex flex-col transition-transform duration-300 ${
					isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
				}`}
			>
				{/* Drawer Header */}
				<div className="flex items-center justify-between p-4 border-b border-[#2C2C2C]">
					<div className="flex items-center gap-2">
						<Sparkles className="w-5 h-5 text-blue-400" />
						<span className="font-extrabold text-zinc-100 tracking-wider uppercase text-sm select-none">Menu</span>
					</div>
					<button
						onClick={() => setIsSidebarOpen(false)}
						className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Drawer Body - Empty for custom contents */}
				<div className="flex-grow p-4 overflow-y-auto scrollbar-none">
					{/* Custom sidebar components can be rendered here */}
				</div>
			</div>
		</div>
	)
}

export default App
