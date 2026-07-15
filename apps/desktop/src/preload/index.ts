import { contextBridge, ipcRenderer } from 'electron'
import {
	IPC_CHANNELS,
	type BurroDesktopApi,
	type DesktopDocumentState,
	type DesktopLocalAIChatRequest,
	type DesktopMenuCommand,
	type DesktopPlatform,
	type DesktopSaveResult,
	type DocumentSaveMode,
	type PersistedDocument,
} from '@burro/core'

const desktopApi: BurroDesktopApi = {
	getPlatform: () => ipcRenderer.invoke(IPC_CHANNELS.getPlatform) as Promise<DesktopPlatform>,
	getDocumentState: () => ipcRenderer.invoke(IPC_CHANNELS.getDocumentState) as Promise<DesktopDocumentState>,
	newDocument: () => ipcRenderer.invoke(IPC_CHANNELS.newDocument) as Promise<void>,
	openDocument: () => ipcRenderer.invoke(IPC_CHANNELS.openDocument) as Promise<void>,
	openRecentDocument: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.openRecentDocument, filePath) as Promise<void>,
	saveDocument: (content: string, mode: DocumentSaveMode) => ipcRenderer.invoke(IPC_CHANNELS.saveDocument, content, mode) as Promise<DesktopSaveResult>,
	autosaveDocument: (content: string) => ipcRenderer.invoke(IPC_CHANNELS.autosaveDocument, content) as Promise<void>,
	setDocumentDirty: (dirty: boolean) => ipcRenderer.invoke(IPC_CHANNELS.setDocumentDirty, dirty) as Promise<void>,
	readDocumentFile: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.readDocumentFile, id) as Promise<PersistedDocument | null>,
	writeDocumentFile: (id: string, content: string) => ipcRenderer.invoke(IPC_CHANNELS.writeDocumentFile, id, content) as Promise<void>,
	removeDocumentFile: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.removeDocumentFile, id) as Promise<void>,
	listDocumentFiles: () => ipcRenderer.invoke(IPC_CHANNELS.listDocumentFiles) as Promise<string[]>,
	minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.minimizeWindow) as Promise<void>,
	toggleMaximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.toggleMaximizeWindow) as Promise<void>,
	closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.closeWindow) as Promise<void>,
	localAIChat: (request: DesktopLocalAIChatRequest) => ipcRenderer.invoke(IPC_CHANNELS.localAIChat, request) as Promise<string>,
	onMenuCommand(listener: (command: DesktopMenuCommand) => void) {
		const handler = (_event: Electron.IpcRendererEvent, command: DesktopMenuCommand) => listener(command)
		ipcRenderer.on(IPC_CHANNELS.menuCommand, handler)
		return () => ipcRenderer.removeListener(IPC_CHANNELS.menuCommand, handler)
	},
}

contextBridge.exposeInMainWorld('burroDesktop', desktopApi)
