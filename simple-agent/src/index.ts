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
	RATE_LIMIT_STORE: KVNamespace;
	API_KEY: string;
	ALLOWED_IPS: string;
}

// Import allowed IPs
import allowedIpsConfig from '../allowed_ips.json';

// Rate limit configuration
const RATE_LIMIT = {
	REQUESTS_PER_MINUTE: 5,
	WINDOW_SIZE: 60, // seconds
};

// IP validation
const isAllowedIP = (ip: string, allowedIpsStr: string): boolean => {
	try {
		const allowedIps = allowedIpsStr.split(',').map(ip => ip.trim());
		return allowedIps.includes(ip);
	} catch (e) {
		console.error('Error parsing allowed IPs:', e);
		return false;
	}
};

// API key validation
const validateApiKey = (request: Request, env: Env): boolean => {
	const apiKey = request.headers.get('x-api-key');
	return apiKey === env.API_KEY;
};

// Rate limiting function
async function checkRateLimit(ip: string, env: Env): Promise<{ allowed: boolean; remaining: number }> {
	const now = Math.floor(Date.now() / 1000);
	const windowKey = `${ip}:${Math.floor(now / RATE_LIMIT.WINDOW_SIZE)}`;

	// Get the current count for this window
	const currentCount = parseInt(await env.RATE_LIMIT_STORE.get(windowKey) || '0');
	
	if (currentCount >= RATE_LIMIT.REQUESTS_PER_MINUTE) {
		return { allowed: false, remaining: 0 };
	}

	// Increment the counter
	await env.RATE_LIMIT_STORE.put(windowKey, (currentCount + 1).toString(), {
		expirationTtl: RATE_LIMIT.WINDOW_SIZE,
	});

	return {
		allowed: true,
		remaining: RATE_LIMIT.REQUESTS_PER_MINUTE - (currentCount + 1),
	};
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Get client IP
		const clientIP = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';

		// --- Route requests for /api ---
		if (url.pathname.startsWith('/api')) {
			console.log(`Handling API request: ${request.url} from IP: ${clientIP}`);

			// 1. Check IP allowlist
			if (!isAllowedIP(clientIP, env.ALLOWED_IPS)) {
				return new Response('Forbidden: IP not allowed', {
					status: 403,
					headers: {
						'Content-Type': 'text/plain',
					},
				});
			}

			// 2. Validate API key
			if (!validateApiKey(request, env)) {
				return new Response('Unauthorized: Invalid API key', { status: 401 });
			}

			// 3. Check rate limit
			const rateLimitResult = await checkRateLimit(clientIP, env);
			if (!rateLimitResult.allowed) {
				return new Response('Rate limit exceeded. Please try again later.', {
					status: 429,
					headers: {
						'Retry-After': RATE_LIMIT.WINDOW_SIZE.toString(),
					},
				});
			}

			// 4. Validate request
			const prompt = url.searchParams.get('prompt');
			if (!prompt) {
				return new Response('Missing prompt query parameter for /api: ?prompt=YourPrompt', { status: 400 });
			}

			// 5. Validate prompt length and content
			if (prompt.length > 1000) {
				return new Response('Prompt too long. Maximum length is 1000 characters.', { status: 400 });
			}

			try {
				const messages = [{ role: 'user', content: prompt }];
				const aiResponse = (await env.AI.run('@cf/mistral/mistral-7b-instruct-v0.1', { messages })) as { response: string };

				if (aiResponse && typeof aiResponse.response === 'string') {
					return new Response(aiResponse.response, {
						headers: {
							'Content-Type': 'text/plain',
							'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
							'X-RateLimit-Reset': (RATE_LIMIT.WINDOW_SIZE).toString(),
						},
					});
				} else {
					console.error('Unexpected AI response structure:', aiResponse);
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
			return await env.ASSETS.fetch(request);
		} catch (e) {
			console.error('Error fetching from ASSETS binding:', e);
			return new Response('Internal Server Error fetching asset', { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;
