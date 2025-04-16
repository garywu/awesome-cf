/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// Define the environment bindings expected by the Worker
// AI binding is defined in wrangler.jsonc
// ASSETS binding is implicitly configured by wrangler.jsonc to serve from ./public
export interface Env {
	AI: Ai;
	ASSETS: Fetcher;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// --- Route requests for /api ---
		if (url.pathname.startsWith('/api')) {
			console.log(`Handling API request: ${request.url}`);
			const prompt = url.searchParams.get('prompt');
			if (!prompt) {
				return new Response('Missing prompt query parameter for /api: ?prompt=YourPrompt', { status: 400 });
			}

			try {
				const messages = [{ role: 'user', content: prompt }];
				// Use type assertion for non-streaming response
				const aiResponse = (await env.AI.run('@cf/mistral/mistral-7b-instruct-v0.1', { messages })) as { response: string };

				// Now we can safely access aiResponse.response
				if (aiResponse && typeof aiResponse.response === 'string') {
					return new Response(aiResponse.response, { headers: { 'Content-Type': 'text/plain' } });
				} else {
					console.error('Unexpected AI response structure after type assertion:', aiResponse);
					return new Response('AI returned an unexpected response format.', { status: 500 });
				}
			} catch (e: unknown) {
				console.error('Error processing AI request:', e);
				let errorMessage = 'Failed to process AI request.';
				if (e instanceof Error) {
					errorMessage += ` Error: ${e.message}`;
				}
				return new Response(errorMessage, { status: 500 });
			}
		}

		// --- Handle other requests (attempt to serve static assets via ASSETS binding) ---
		console.log(`Passing non-API request to ASSETS: ${request.url}`);
		try {
			// Let the ASSETS binding handle serving static files from ./public
			// It will return 404 if the file is not found
			return await env.ASSETS.fetch(request);
		} catch (e) {
			console.error('Error fetching from ASSETS binding:', e);
			return new Response('Internal Server Error fetching asset', { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;
