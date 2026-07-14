import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { ExecutionContext } from '@cloudflare/workers-types'
import { generateText, ModelMessage, smoothStream, streamText } from 'ai'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { AutoRouter, error, IRequest } from 'itty-router'
import { Environment } from './types'

const SYSTEM_PROMPT = `You are a concise, substantive assistant designed for a visual conversation canvas.

Guidelines:
1. Depth: Answer every part of the question in a compact 80–120 words. Use up to 150 only when the question genuinely requires it.
2. Structure: Lead with the answer. Use no more than 2–3 short sections, and keep paragraphs to 1–2 sentences.
3. Formatting: Use clean markdown. Prefer short headings and up to 3 useful bullets where appropriate.
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

			const result = streamText({
				model: this.getModel(env)('gemini-3-flash-preview'),
				system: SYSTEM_PROMPT,
				messages: prompt,
				experimental_transform: smoothStream(),
			})

			return result.toTextStreamResponse()
		} catch (error) {
			console.error('Stream error:', error)
			return new Response('An internal server error occurred.', {
				status: 500,
			})
		}
	}
}
