import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { ExecutionContext } from '@cloudflare/workers-types'
import { generateText, ModelMessage, smoothStream, streamText } from 'ai'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { AutoRouter, error, IRequest } from 'itty-router'
import { Environment } from './types'

const SYSTEM_PROMPT = `You are a concise, substantive assistant designed for a visual conversation canvas.

Guidelines:
1. Depth: Answer every part of the question in 70–100 words. Never exceed 120 words.
2. Structure: Lead with the answer. Use at most one short heading, and keep paragraphs to 1–2 sentences.
3. Formatting: Use clean markdown and no more than 3 bullets when a list is genuinely useful.
4. Concepts: Bold 3–6 specific terms that would make useful deep-dive topics. Bold the term itself, not whole sentences or generic words.
5. Content: Preserve the essential explanation, why it matters, and the most relevant example or implication. Remove repetition before removing information.
6. Tone: Clear, direct, and factual. Avoid filler, repeated conclusions, and conversational preambles.`

// Worker (handles AI requests directly)
export default class extends WorkerEntrypoint<Environment> {
	private readonly router = AutoRouter<IRequest, [env: Environment, ctx: ExecutionContext]>({
		catch: (e) => {
			console.error(e)
			return error(e)
		},
	})
		.post('/generate', (request, env) => this.generate(request, env))
		.post('/stream', (request, env) => this.stream(request, env))

	override fetch(request: IRequest): Promise<Response> {
		return this.router.fetch(request, this.env, this.ctx)
	}

	private getModel(env: Environment) {
		return createGoogleGenerativeAI({
			apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
		})
	}

	// Generate a new response from the model
	private async generate(request: IRequest, env: Environment) {
		try {
			const prompt = (await request.json()) as Array<ModelMessage>
			const { text } = await generateText({
				model: this.getModel(env)('gemini-3-flash-preview'),
				system: SYSTEM_PROMPT,
				messages: prompt,
			})

			// Send back the response as a JSON object
			return new Response(text, {
				headers: { 'Content-Type': 'application/json' },
			})
		} catch (error: any) {
			console.error('AI response error:', error)
			return new Response('An internal server error occurred.', {
				status: 500,
			})
		}
	}

	// Stream a new response from the model
	private async stream(request: IRequest, env: Environment): Promise<Response> {
		try {
			const prompt = (await request.json()) as Array<ModelMessage>
			const google = this.getModel(env)

			const result = streamText({
				model: google('gemini-3-flash-preview'),
				system: SYSTEM_PROMPT,
				messages: prompt,
				tools: {
					google_search: google.tools.googleSearch({}),
				},
				toolChoice: { type: 'tool', toolName: 'google_search' },
				experimental_transform: smoothStream(),
			})

			const encoder = new TextEncoder()
			const stream = new ReadableStream({
				async start(controller) {
					let fullText = ''
					const streamedSources: Array<{ id: string; url: string; title?: string }> = []

					const send = (event: string, data: unknown) => {
						controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
					}

					try {
						for await (const part of result.fullStream) {
							if (part.type === 'text-delta') {
								fullText += part.text
								send('text', part.text)
							} else if (part.type === 'source' && part.sourceType === 'url') {
								streamedSources.push({ id: part.id, url: part.url, title: part.title })
							}
						}

						const providerMetadata = (await result.providerMetadata) as any
						const googleMetadata = Object.values(providerMetadata ?? {}).find(
							(value: any) => value?.groundingMetadata
						) as any
						const grounding = googleMetadata?.groundingMetadata
						const chunks = grounding?.groundingChunks ?? []
						const sources: Array<{ id: string; url: string; title: string; domain: string }> = []
						const chunkToSource = new Map<number, number>()
						const sourceByUrl = new Map<string, number>()

						for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
							const web = chunks[chunkIndex]?.web
							if (!web?.uri) continue
							let sourceIndex = sourceByUrl.get(web.uri)
							if (sourceIndex === undefined) {
								sourceIndex = sources.length
								sourceByUrl.set(web.uri, sourceIndex)
								let domain = ''
								try {
									domain = new URL(web.uri).hostname.replace(/^www\./, '')
								} catch {
									// Keep the domain empty for provider redirect URLs that cannot be parsed.
								}
								sources.push({
									id: `source-${sourceIndex + 1}`,
									url: web.uri,
									title: web.title || domain || `Source ${sourceIndex + 1}`,
									domain,
								})
							}
							chunkToSource.set(chunkIndex, sourceIndex)
						}

						// Some provider responses expose sources without detailed grounding chunks.
						if (sources.length === 0) {
							for (const source of streamedSources) {
								if (sourceByUrl.has(source.url)) continue
								const sourceIndex = sources.length
								sourceByUrl.set(source.url, sourceIndex)
								let domain = ''
								try {
									domain = new URL(source.url).hostname.replace(/^www\./, '')
								} catch {}
								sources.push({
									id: source.id || `source-${sourceIndex + 1}`,
									url: source.url,
									title: source.title || domain || `Source ${sourceIndex + 1}`,
									domain,
								})
							}
						}

						const citations = (grounding?.groundingSupports ?? [])
							.map((support: any) => {
								const segment = support.segment
								const chunkIndices =
									support.groundingChunkIndices ?? support.supportChunkIndices ?? []
								const sourceIds = Array.from(
									new Set(
										chunkIndices
											.map((chunkIndex: number) => chunkToSource.get(chunkIndex))
											.filter((index: number | undefined): index is number => index !== undefined)
											.map((index: number) => sources[index].id)
									)
								)
								if (!segment || sourceIds.length === 0) return null
								return {
									start: segment.startIndex ?? 0,
									end: segment.endIndex ?? 0,
									text: segment.text ?? support.segment_text ?? '',
									sourceIds,
								}
							})
							.filter(Boolean)

						send('evidence', {
							text: fullText,
							sources,
							citations,
							grounded: sources.length > 0,
						})
					} catch (error) {
						send('error', { message: error instanceof Error ? error.message : 'Streaming failed' })
					} finally {
						controller.close()
					}
				},
			})

			return new Response(stream, {
				headers: {
					'Content-Type': 'text/event-stream; charset=utf-8',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
				},
			})
		} catch (error) {
			console.error('Stream error:', error)
			return new Response('An internal server error occurred.', {
				status: 500,
			})
		}
	}
}
