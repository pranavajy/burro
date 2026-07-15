import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

export default defineConfig({
	main: {
		build: {
			externalizeDeps: {
				exclude: ['@burro/core'],
			},
		},
	},
	preload: {
		build: {
			externalizeDeps: {
				exclude: ['@burro/core'],
			},
			rollupOptions: {
				external: ['electron'],
				output: {
					format: 'cjs',
					entryFileNames: '[name].cjs',
				},
			},
		},
	},
	renderer: {
		plugins: [react(), tailwindcss()],
	},
})
