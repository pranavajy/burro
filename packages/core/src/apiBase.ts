/**
 * Base URL for Burro's hosted API (the Cloudflare worker that proxies AI
 * providers). The web app is served from the same origin as the worker, so it
 * uses relative URLs (empty base). The desktop app runs from file:// in
 * production, so it must point at the deployed worker explicitly.
 */
let apiBaseUrl = ''

export function setApiBaseUrl(url: string) {
	apiBaseUrl = url.replace(/\/+$/, '')
}

export function getApiBaseUrl(): string {
	return apiBaseUrl
}

/** Resolve a Burro API path (e.g. '/stream') against the configured base. */
export function apiUrl(path: string): string {
	return `${apiBaseUrl}${path}`
}
