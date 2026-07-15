import {
	app,
	BrowserWindow,
	dialog,
	ipcMain,
	Menu,
	type IpcMainInvokeEvent,
	type MenuItemConstructorOptions,
} from 'electron'
import electronUpdater from 'electron-updater'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import {
	IPC_CHANNELS,
	type DesktopDocumentState,
	type DesktopLocalAIChatRequest,
	type DesktopMenuCommand,
	type DesktopPlatform,
	type DesktopSaveResult,
	type DocumentSaveMode,
	type PersistedDocument,
} from '@burro/core'

interface DocumentWindow {
	window: BrowserWindow
	filePath: string | null
	recoveryPath: string
	dirty: boolean
	allowClose: boolean
}

const documents = new Map<number, DocumentWindow>()
const pendingOpenFiles: string[] = []
const recentFilesPath = () => join(app.getPath('userData'), 'recent-files.json')
const recoveryDirectory = () => join(app.getPath('userData'), 'recovery')
const documentsDirectory = () => join(app.getPath('userData'), 'documents')

// Offline-first persistence host: workspace documents live as .tldr files in
// userData/documents, keyed by workspace id (see DocumentPersistence in core).
function documentFilePath(id: string): string {
	if (!/^[\w-]+$/.test(id)) throw new Error('Invalid document id')
	return join(documentsDirectory(), `${id}.tldr`)
}

function displayName(filePath: string | null) {
	return filePath ? basename(filePath, extname(filePath)) : 'Untitled'
}

function isTldrFile(filePath: string) {
	return extname(filePath).toLowerCase() === '.tldr'
}

function loadRecentFiles(): string[] {
	try {
		const parsed: unknown = JSON.parse(readFileSync(recentFilesPath(), 'utf8'))
		if (!Array.isArray(parsed)) return []
		return parsed.filter((item): item is string => typeof item === 'string' && existsSync(item)).slice(0, 10)
	} catch {
		return []
	}
}

function saveRecentFiles(files: string[]) {
	mkdirSync(app.getPath('userData'), { recursive: true })
	writeFileSync(recentFilesPath(), JSON.stringify(files.slice(0, 10), null, 2), 'utf8')
}

function addRecentFile(filePath: string) {
	const normalized = resolve(filePath)
	saveRecentFiles([normalized, ...loadRecentFiles().filter((item) => item !== normalized)])
	buildApplicationMenu()
}

function documentForEvent(event: IpcMainInvokeEvent) {
	const owner = BrowserWindow.fromWebContents(event.sender)
	if (!owner) throw new Error('No BrowserWindow owns this IPC request')
	const document = documents.get(owner.id)
	if (!document) throw new Error('No document is associated with this window')
	return document
}

function readDocument(filePath: string): string {
	return readFileSync(filePath, 'utf8')
}

function updateWindowTitle(document: DocumentWindow) {
	const name = displayName(document.filePath)
	document.window.setTitle(`${document.dirty ? '• ' : ''}${name} — Burro`)
	document.window.setDocumentEdited(document.dirty)
	if (process.platform === 'darwin' && document.filePath) {
		document.window.setRepresentedFilename(document.filePath)
	}
}

function setDirty(document: DocumentWindow, dirty: boolean) {
	document.dirty = dirty
	updateWindowTitle(document)
}

function sendMenuCommand(command: DesktopMenuCommand) {
	const window = BrowserWindow.getFocusedWindow()
	if (window) window.webContents.send(IPC_CHANNELS.menuCommand, command)
}

function buildApplicationMenu() {
	const recent = loadRecentFiles()
	const recentSubmenu: MenuItemConstructorOptions[] = recent.length
		? recent.map((filePath) => ({
			label: basename(filePath),
			sublabel: filePath,
			click: () => void openDocumentWindow(filePath),
		}))
		: [{ label: 'No Recent Documents', enabled: false }]

	const template: MenuItemConstructorOptions[] = [
		...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),
		{
			label: 'File',
			submenu: [
				{ label: 'New', accelerator: 'CmdOrCtrl+N', click: () => void createDocumentWindow() },
				{ label: 'Open…', accelerator: 'CmdOrCtrl+O', click: () => void showOpenDialog() },
				{ label: 'Open Recent', submenu: recentSubmenu },
				{ type: 'separator' },
				{ label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendMenuCommand('save') },
				{ label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendMenuCommand('save-as') },
				{ type: 'separator' },
				{ label: 'Close Window', accelerator: 'CmdOrCtrl+W', click: () => BrowserWindow.getFocusedWindow()?.close() },
			],
		},
		{
			label: 'Edit',
			submenu: [
				{ label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => sendMenuCommand('undo') },
				{ label: 'Redo', accelerator: process.platform === 'darwin' ? 'Cmd+Shift+Z' : 'Ctrl+Y', click: () => sendMenuCommand('redo') },
				{ type: 'separator' },
				{ role: 'cut' },
				{ role: 'copy' },
				{ role: 'paste' },
				{ role: 'selectAll' },
			],
		},
		{
			label: 'View',
			submenu: [
				{ label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', click: () => sendMenuCommand('zoom-in') },
				{ label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => sendMenuCommand('zoom-out') },
				{ label: 'Actual Size', accelerator: 'CmdOrCtrl+0', click: () => sendMenuCommand('zoom-reset') },
				...(app.isPackaged ? [] : [{ type: 'separator' as const }, { role: 'toggleDevTools' as const }]),
			],
		},
		{ role: 'windowMenu' },
	]

	Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function showOpenDialog() {
	const focusedWindow = BrowserWindow.getFocusedWindow()
	const openOptions = {
		title: 'Open Burro document',
		properties: ['openFile' as const, 'multiSelections' as const],
		filters: [{ name: 'Burro documents', extensions: ['tldr'] }],
	}
	const result = focusedWindow
		? await dialog.showOpenDialog(focusedWindow, openOptions)
		: await dialog.showOpenDialog(openOptions)
	if (result.canceled) return
	for (const filePath of result.filePaths) await openDocumentWindow(filePath)
}

async function createDocumentWindow(filePath: string | null = null) {
	if (filePath) {
		const normalized = resolve(filePath)
		const existing = [...documents.values()].find((document) => document.filePath === normalized)
		if (existing) {
			existing.window.show()
			existing.window.focus()
			return existing
		}
		filePath = normalized
	}

	mkdirSync(recoveryDirectory(), { recursive: true })
	const window = new BrowserWindow({
		width: 1440,
		height: 920,
		minWidth: 900,
		minHeight: 600,
		backgroundColor: '#121214',
		show: false,
		frame: process.platform === 'darwin',
		titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
		trafficLightPosition: process.platform === 'darwin' ? { x: 14, y: 14 } : undefined,
		webPreferences: {
			preload: join(__dirname, '../preload/index.cjs'),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	})

	const document: DocumentWindow = {
		window,
		filePath,
		recoveryPath: join(recoveryDirectory(), `untitled-${randomUUID()}.tldr`),
		dirty: false,
		allowClose: false,
	}
	documents.set(window.id, document)
	updateWindowTitle(document)

	window.once('ready-to-show', () => window.show())
	window.on('close', (event) => {
		if (document.allowClose || !document.dirty) return
		const choice = dialog.showMessageBoxSync(window, {
			type: 'warning',
			buttons: ['Cancel', 'Discard Changes'],
			defaultId: 0,
			cancelId: 0,
			title: 'Unsaved changes',
			message: `Discard changes to ${displayName(document.filePath)}?`,
			detail: 'Your last autosaved recovery copy will remain available for this session.',
		})
		if (choice === 0) event.preventDefault()
		else document.allowClose = true
	})
	window.on('closed', () => documents.delete(window.id))
	window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
	window.webContents.on('will-navigate', (event, url) => {
		const allowed = process.env.ELECTRON_RENDERER_URL
		if (!allowed || !url.startsWith(allowed)) event.preventDefault()
	})
	window.webContents.on('before-input-event', (event, input) => {
		if (app.isPackaged && (input.meta || input.control) && input.key.toLowerCase() === 'r') {
			event.preventDefault()
		}
	})
	window.webContents.on('context-menu', (_event, params) => {
		const menu = Menu.buildFromTemplate([
			...(params.isEditable ? [
				{ role: 'cut' as const },
				{ role: 'copy' as const },
				{ role: 'paste' as const },
				{ type: 'separator' as const },
			] : [{ role: 'copy' as const }]),
			{ role: 'selectAll' },
		])
		menu.popup({ window })
	})

	if (process.env.ELECTRON_RENDERER_URL) {
		await window.loadURL(process.env.ELECTRON_RENDERER_URL)
	} else {
		await window.loadFile(join(__dirname, '../renderer/index.html'))
	}
	return document
}

async function openDocumentWindow(filePath: string) {
	if (!isTldrFile(filePath) || !existsSync(filePath)) return
	addRecentFile(filePath)
	await createDocumentWindow(filePath)
}

function saveDocument(document: DocumentWindow, content: string, mode: DocumentSaveMode): DesktopSaveResult {
	let target = mode === 'save' ? document.filePath : null
	if (!target) {
		const result = dialog.showSaveDialogSync(document.window, {
			title: 'Save Burro document',
			defaultPath: `${displayName(document.filePath)}.tldr`,
			filters: [{ name: 'Burro documents', extensions: ['tldr'] }],
		})
		if (!result) return { canceled: true, filePath: document.filePath, displayName: displayName(document.filePath) }
		target = result.toLowerCase().endsWith('.tldr') ? result : `${result}.tldr`
	}

	writeFileSync(target, content, 'utf8')
	document.filePath = resolve(target)
	if (existsSync(document.recoveryPath)) unlinkSync(document.recoveryPath)
	setDirty(document, false)
	addRecentFile(document.filePath)
	return { canceled: false, filePath: document.filePath, displayName: displayName(document.filePath) }
}

ipcMain.handle(IPC_CHANNELS.getPlatform, (): DesktopPlatform => {
	if (process.platform === 'darwin' || process.platform === 'win32') return process.platform
	return 'linux'
})
ipcMain.handle(IPC_CHANNELS.getDocumentState, (event): DesktopDocumentState => {
	const document = documentForEvent(event)
	return {
		filePath: document.filePath,
		displayName: displayName(document.filePath),
		content: document.filePath ? readDocument(document.filePath) : null,
		dirty: document.dirty,
	}
})
ipcMain.handle(IPC_CHANNELS.newDocument, () => void createDocumentWindow())
ipcMain.handle(IPC_CHANNELS.openDocument, () => void showOpenDialog())
ipcMain.handle(IPC_CHANNELS.openRecentDocument, (_event, filePath: string) => {
	if (typeof filePath === 'string') void openDocumentWindow(filePath)
})
ipcMain.handle(IPC_CHANNELS.saveDocument, (event, content: string, mode: DocumentSaveMode) => {
	if (typeof content !== 'string' || (mode !== 'save' && mode !== 'save-as')) throw new Error('Invalid save request')
	return saveDocument(documentForEvent(event), content, mode)
})
ipcMain.handle(IPC_CHANNELS.autosaveDocument, (event, content: string) => {
	if (typeof content !== 'string') throw new Error('Invalid autosave request')
	const document = documentForEvent(event)
	writeFileSync(document.filePath ?? document.recoveryPath, content, 'utf8')
})
ipcMain.handle(IPC_CHANNELS.setDocumentDirty, (event, dirty: boolean) => {
	if (typeof dirty !== 'boolean') throw new Error('Invalid dirty state')
	setDirty(documentForEvent(event), dirty)
})
ipcMain.handle(IPC_CHANNELS.readDocumentFile, (_event, id: string): PersistedDocument | null => {
	if (typeof id !== 'string') throw new Error('Invalid document id')
	const filePath = documentFilePath(id)
	if (!existsSync(filePath)) return null
	return { id, content: readFileSync(filePath, 'utf8'), updatedAt: statSync(filePath).mtimeMs }
})
ipcMain.handle(IPC_CHANNELS.writeDocumentFile, (_event, id: string, content: string) => {
	if (typeof id !== 'string' || typeof content !== 'string') throw new Error('Invalid document write')
	mkdirSync(documentsDirectory(), { recursive: true })
	writeFileSync(documentFilePath(id), content, 'utf8')
})
ipcMain.handle(IPC_CHANNELS.removeDocumentFile, (_event, id: string) => {
	if (typeof id !== 'string') throw new Error('Invalid document id')
	const filePath = documentFilePath(id)
	if (existsSync(filePath)) unlinkSync(filePath)
})
ipcMain.handle(IPC_CHANNELS.listDocumentFiles, (): string[] => {
	if (!existsSync(documentsDirectory())) return []
	return readdirSync(documentsDirectory())
		.filter((name) => name.endsWith('.tldr'))
		.map((name) => basename(name, '.tldr'))
})
ipcMain.handle(IPC_CHANNELS.minimizeWindow, (event) => documentForEvent(event).window.minimize())
ipcMain.handle(IPC_CHANNELS.toggleMaximizeWindow, (event) => {
	const window = documentForEvent(event).window
	if (window.isMaximized()) window.unmaximize()
	else window.maximize()
})
ipcMain.handle(IPC_CHANNELS.closeWindow, (event) => documentForEvent(event).window.close())

ipcMain.handle(IPC_CHANNELS.localAIChat, async (_event, request: DesktopLocalAIChatRequest): Promise<string> => {
	if (!request || typeof request.baseUrl !== 'string' || typeof request.model !== 'string' || !Array.isArray(request.messages)) {
		throw new Error('Invalid local AI request')
	}
	const baseUrl = new URL(request.baseUrl)
	const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
	if (baseUrl.protocol !== 'http:' || !loopbackHosts.has(baseUrl.hostname)) {
		throw new Error('Desktop local AI requests must use a loopback HTTP address')
	}
	const response = await fetch(`${baseUrl.toString().replace(/\/+$/, '')}/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${request.apiKey || 'ollama'}`,
		},
		body: JSON.stringify({ model: request.model, messages: request.messages, stream: false }),
		signal: AbortSignal.timeout(120_000),
	})
	if (!response.ok) throw new Error((await response.text()) || `Ollama request failed (${response.status})`)
	const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
	const text = data.choices?.[0]?.message?.content
	if (typeof text !== 'string' || !text.trim()) throw new Error('Ollama returned an empty response')
	return text
})

// Updates are an online enhancement only. Failure is silent so startup and
// every local document workflow remain fully available without connectivity.
function checkForUpdatesSilently() {
	if (!app.isPackaged) return
	const { autoUpdater } = electronUpdater
	autoUpdater.autoDownload = true
	autoUpdater.autoInstallOnAppQuit = true
	autoUpdater.on('error', (error) => console.error('Auto-update check failed', error))
	autoUpdater.checkForUpdates().catch((error) => console.error('Auto-update check failed', error))
	setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000)
}

app.on('open-file', (event, filePath) => {
	event.preventDefault()
	if (app.isReady()) void openDocumentWindow(filePath)
	else pendingOpenFiles.push(filePath)
})

const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) app.quit()
else {
	app.on('second-instance', (_event, argv) => {
		const paths = argv.filter(isTldrFile)
		if (paths.length) paths.forEach((filePath) => void openDocumentWindow(filePath))
		else BrowserWindow.getAllWindows()[0]?.focus()
	})

	app.whenReady().then(async () => {
		buildApplicationMenu()
		checkForUpdatesSilently()
		const startupFiles = [
			...pendingOpenFiles,
			...process.argv.filter((argument) => isTldrFile(argument) && existsSync(argument)),
		]
		if (startupFiles.length) {
			for (const filePath of startupFiles) await openDocumentWindow(filePath)
		} else {
			await createDocumentWindow()
		}
		app.on('activate', () => {
			if (BrowserWindow.getAllWindows().length === 0) void createDocumentWindow()
		})
	})

	app.on('window-all-closed', () => {
		if (process.platform !== 'darwin') app.quit()
	})
}
