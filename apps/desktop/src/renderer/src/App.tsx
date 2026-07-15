import { useCallback, useEffect, useRef, useState } from 'react'
import { getSnapshot, type Editor } from 'tldraw'
import { BurroApp, type BurroBootDocument } from '@burro/editor'
import type {
	DesktopDocumentState,
	DesktopMenuCommand,
	DesktopPlatform,
	DocumentSaveMode,
} from '@burro/core'

// Windows opened for a .tldr file get a workspace keyed by the file's path,
// so reopening the same file reuses the same canvas store.
function workspaceIdForFile(filePath: string): string {
	let hash = 5381
	for (let index = 0; index < filePath.length; index++) {
		hash = ((hash << 5) + hash + filePath.charCodeAt(index)) | 0
	}
	return `file-${(hash >>> 0).toString(36)}`
}

interface DesktopBoot {
	platform: DesktopPlatform
	document: DesktopDocumentState
}

export default function App() {
	const [boot, setBoot] = useState<DesktopBoot | null>(null)
	const editorRef = useRef<Editor | null>(null)
	const storeCleanupRef = useRef<(() => void) | null>(null)
	const dirtyRef = useRef(false)
	const filePathRef = useRef<string | null>(null)
	const [isDirty, setIsDirty] = useState(false)

	useEffect(() => {
		void Promise.all([
			window.burroDesktop.getPlatform(),
			window.burroDesktop.getDocumentState(),
		]).then(([platform, document]) => {
			filePathRef.current = document.filePath
			setBoot({ platform, document })
		})
	}, [])

	const serializedSnapshot = useCallback(() => {
		const editor = editorRef.current
		return editor ? JSON.stringify(getSnapshot(editor.store)) : null
	}, [])

	const save = useCallback(async (mode: DocumentSaveMode) => {
		const content = serializedSnapshot()
		if (!content) return
		const result = await window.burroDesktop.saveDocument(content, mode)
		if (!result.canceled) {
			dirtyRef.current = false
			setIsDirty(false)
			filePathRef.current = result.filePath
			setBoot((current) => current ? {
				...current,
				document: {
					...current.document,
					filePath: result.filePath,
					displayName: result.displayName,
					dirty: false,
				},
			} : current)
		}
	}, [serializedSnapshot])

	const runMenuCommand = useCallback((command: DesktopMenuCommand) => {
		const editor = editorRef.current
		if (command === 'save') return void save('save')
		if (command === 'save-as') return void save('save-as')
		if (!editor) return
		if (command === 'undo') editor.undo()
		else if (command === 'redo') editor.redo()
		else if (command === 'zoom-in') editor.zoomIn()
		else if (command === 'zoom-out') editor.zoomOut()
		else if (command === 'zoom-reset') editor.resetZoom()
	}, [save])

	useEffect(() => window.burroDesktop.onMenuCommand(runMenuCommand), [runMenuCommand])

	// Autosave every 30s: to the open file, or to a recovery location for
	// untitled documents. Workspace-mode canvases already persist locally via
	// IndexedDB, so we only autosave once there are unsaved document changes.
	useEffect(() => {
		const autosave = window.setInterval(() => {
			if (!dirtyRef.current) return
			const content = serializedSnapshot()
			if (content) void window.burroDesktop.autosaveDocument(content)
		}, 30_000)
		return () => window.clearInterval(autosave)
	}, [serializedSnapshot])

	useEffect(() => () => storeCleanupRef.current?.(), [])

	const handleActiveEditorChange = useCallback((editor: Editor) => {
		editorRef.current = editor
		storeCleanupRef.current?.()
		// Dirty tracking (unsaved-changes dot, confirm-on-close) applies to
		// file-backed document windows; untitled workspaces persist themselves.
		storeCleanupRef.current = editor.store.listen(
			() => {
				if (dirtyRef.current || !filePathRef.current) return
				dirtyRef.current = true
				setIsDirty(true)
				void window.burroDesktop.setDocumentDirty(true)
			},
			{ scope: 'document', source: 'user' }
		)
	}, [])

	if (!boot) return null

	const bootDocument: BurroBootDocument | undefined = boot.document.filePath
		? {
			id: workspaceIdForFile(boot.document.filePath),
			name: boot.document.displayName,
			content: boot.document.content,
		}
		: undefined

	return (
		<div className="desktop-shell" data-platform={boot.platform}>
			<header className="desktop-titlebar">
				<div className="desktop-titlebar-brand" aria-label="Burro">
					<span className="desktop-titlebar-mark">b</span>
					<span>burro<span className="desktop-titlebar-dot">.</span></span>
				</div>
				<div className="desktop-document-title">
					{isDirty && <span className="desktop-dirty-dot" aria-label="Unsaved changes" />}
					<span>{boot.document.displayName}</span>
				</div>
				{boot.platform !== 'darwin' ? (
					<div className="desktop-window-controls">
						<button type="button" onClick={() => void window.burroDesktop.minimizeWindow()} aria-label="Minimize">−</button>
						<button type="button" onClick={() => void window.burroDesktop.toggleMaximizeWindow()} aria-label="Maximize">□</button>
						<button type="button" className="desktop-close" onClick={() => void window.burroDesktop.closeWindow()} aria-label="Close">×</button>
					</div>
				) : <div className="desktop-titlebar-spacer" aria-hidden />}
			</header>
			<main className="desktop-content">
				<BurroApp contained bootDocument={bootDocument} onActiveEditorChange={handleActiveEditorChange} />
			</main>
		</div>
	)
}
