import type { DesktopPersistenceHost } from './persistence'

export const IPC_CHANNELS = {
	getPlatform: 'app:get-platform',
	getDocumentState: 'document:get-state',
	newDocument: 'document:new',
	openDocument: 'document:open',
	saveDocument: 'document:save',
	autosaveDocument: 'document:autosave',
	setDocumentDirty: 'document:set-dirty',
	openRecentDocument: 'document:open-recent',
	readDocumentFile: 'documents:read',
	writeDocumentFile: 'documents:write',
	removeDocumentFile: 'documents:remove',
	listDocumentFiles: 'documents:list',
	minimizeWindow: 'window:minimize',
	toggleMaximizeWindow: 'window:toggle-maximize',
	closeWindow: 'window:close',
	localAIChat: 'ai:local-chat',
	menuCommand: 'menu:command',
} as const

export type DesktopPlatform = 'darwin' | 'win32' | 'linux'
export type DocumentSaveMode = 'save' | 'save-as'
export type DesktopMenuCommand =
	| 'save'
	| 'save-as'
	| 'undo'
	| 'redo'
	| 'zoom-in'
	| 'zoom-out'
	| 'zoom-reset'

export interface DesktopDocumentState {
	filePath: string | null
	displayName: string
	content: string | null
	dirty: boolean
}

export interface DesktopSaveResult {
	canceled: boolean
	filePath: string | null
	displayName: string
}

export interface DesktopLocalAIChatRequest {
	baseUrl: string
	model: string
	apiKey?: string
	messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
}

export interface BurroDesktopApi extends DesktopPersistenceHost {
	getPlatform(): Promise<DesktopPlatform>
	getDocumentState(): Promise<DesktopDocumentState>
	newDocument(): Promise<void>
	openDocument(): Promise<void>
	openRecentDocument(filePath: string): Promise<void>
	saveDocument(content: string, mode: DocumentSaveMode): Promise<DesktopSaveResult>
	autosaveDocument(content: string): Promise<void>
	setDocumentDirty(dirty: boolean): Promise<void>
	minimizeWindow(): Promise<void>
	toggleMaximizeWindow(): Promise<void>
	closeWindow(): Promise<void>
	localAIChat(request: DesktopLocalAIChatRequest): Promise<string>
	onMenuCommand(listener: (command: DesktopMenuCommand) => void): () => void
}
