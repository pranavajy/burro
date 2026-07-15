/// <reference lib="dom" />
/**
 * Offline-first document persistence.
 *
 * Local storage is the source of truth: .tldr files on desktop, IndexedDB on
 * web. Everything is keyed by a document id and stores an opaque serialized
 * tldraw snapshot (JSON string), so a future sync layer can reconcile
 * local → server without either app changing how it saves.
 */

export interface PersistedDocument {
	id: string
	content: string
	updatedAt: number
}

export interface DocumentPersistence {
	/** Load a document's serialized snapshot, or null if it doesn't exist. */
	load(id: string): Promise<PersistedDocument | null>
	/** Save (create or overwrite) a document's serialized snapshot. */
	save(id: string, content: string): Promise<void>
	/** Remove a document. Missing documents are ignored. */
	remove(id: string): Promise<void>
	/** List the ids of all persisted documents. */
	list(): Promise<string[]>
}

// ---------------------------------------------------------------------------
// Web: IndexedDB
// ---------------------------------------------------------------------------

const IDB_NAME = 'burro-documents'
const IDB_STORE = 'documents'

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(IDB_NAME, 1)
		request.onupgradeneeded = () => {
			if (!request.result.objectStoreNames.contains(IDB_STORE)) {
				request.result.createObjectStore(IDB_STORE, { keyPath: 'id' })
			}
		}
		request.onsuccess = () => resolve(request.result)
		request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB'))
	})
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result)
		request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
	})
}

/**
 * IndexedDB-backed persistence for the web app. Note that the live tldraw
 * canvas already persists itself through `persistenceKey`; this store is the
 * abstract seam a future sync layer reads from and reconciles against.
 */
export function createIndexedDbPersistence(): DocumentPersistence {
	const withStore = async <T>(
		mode: IDBTransactionMode,
		run: (store: IDBObjectStore) => IDBRequest<T>
	): Promise<T> => {
		const database = await openDatabase()
		try {
			return await requestToPromise(run(database.transaction(IDB_STORE, mode).objectStore(IDB_STORE)))
		} finally {
			database.close()
		}
	}

	return {
		async load(id) {
			const record = await withStore<PersistedDocument | undefined>('readonly', (store) => store.get(id))
			return record ?? null
		},
		async save(id, content) {
			const record: PersistedDocument = { id, content, updatedAt: Date.now() }
			await withStore('readwrite', (store) => store.put(record))
		},
		async remove(id) {
			await withStore('readwrite', (store) => store.delete(id))
		},
		async list() {
			const keys = await withStore<IDBValidKey[]>('readonly', (store) => store.getAllKeys())
			return keys.filter((key): key is string => typeof key === 'string')
		},
	}
}

// ---------------------------------------------------------------------------
// Desktop: files on disk, via the typed IPC bridge
// ---------------------------------------------------------------------------

/**
 * The subset of file operations the desktop main process exposes for
 * persistence. Implemented over IPC in apps/desktop's preload script.
 */
export interface DesktopPersistenceHost {
	readDocumentFile(id: string): Promise<PersistedDocument | null>
	writeDocumentFile(id: string, content: string): Promise<void>
	removeDocumentFile(id: string): Promise<void>
	listDocumentFiles(): Promise<string[]>
}

/** File-backed persistence for the desktop app (documents live on disk). */
export function createDesktopFilePersistence(host: DesktopPersistenceHost): DocumentPersistence {
	return {
		load: (id) => host.readDocumentFile(id),
		save: (id, content) => host.writeDocumentFile(id, content),
		remove: (id) => host.removeDocumentFile(id),
		list: () => host.listDocumentFiles(),
	}
}
