/// <reference types="vite/client" />

import type { BurroDesktopApi } from '@burro/core'

declare global {
	interface ImportMetaEnv {
		readonly VITE_BURRO_API_URL?: string
	}
	interface Window {
		burroDesktop: BurroDesktopApi
	}
}

export {}
