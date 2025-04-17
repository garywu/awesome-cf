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

interface Env {
	ASSETS: { fetch: (req: Request) => Promise<Response> };
	RATE_LIMIT_STORE: KVNamespace;
	ALLOWED_IPS: string;
}

interface ContentIndex {
	last_updated: string;
	total_items: number;
	content_types: {
		[key: string]: {
			count: number;
			items: string[];
		};
	};
	tags: {
		[key: string]: number;
	};
}

async function checkRateLimit(request: Request, env: Env): Promise<{ isAllowed: boolean; remaining: number; reset: number }> {
	const ip = request.headers.get('cf-connecting-ip') || '';
	const key = `rate_limit:${ip}`;
	const limit = 10; // requests per minute
	const window = 60; // seconds

	const current = await env.RATE_LIMIT_STORE.get(key, 'json') as { count: number; timestamp: number } | null;
	const now = Math.floor(Date.now() / 1000);

	if (!current || now - current.timestamp >= window) {
		await env.RATE_LIMIT_STORE.put(key, JSON.stringify({ count: 1, timestamp: now }), { expirationTtl: window });
		return { isAllowed: true, remaining: limit - 1, reset: window };
	}

	if (current.count >= limit) {
		return { isAllowed: false, remaining: 0, reset: window - (now - current.timestamp) };
	}

	await env.RATE_LIMIT_STORE.put(key, JSON.stringify({ 
		count: current.count + 1, 
		timestamp: current.timestamp 
	}), { expirationTtl: window - (now - current.timestamp) });

	return { 
		isAllowed: true, 
		remaining: limit - (current.count + 1),
		reset: window - (now - current.timestamp)
	};
}

function checkIpAllowed(request: Request, env: Env): boolean {
	const clientIp = request.headers.get('cf-connecting-ip') || '';
	const allowedIps = env.ALLOWED_IPS.split(',').map(ip => ip.trim());
	return allowedIps.includes(clientIp);
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		
		// Check IP restriction first
		if (!checkIpAllowed(request, env)) {
			return new Response(JSON.stringify({ error: 'Access denied' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Check rate limit for API endpoints
		if (url.pathname.startsWith('/api/')) {
			const rateLimit = await checkRateLimit(request, env);
			
			if (!rateLimit.isAllowed) {
				return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
					status: 429,
					headers: {
						'Content-Type': 'application/json',
						'X-RateLimit-Limit': '10',
						'X-RateLimit-Remaining': '0',
						'X-RateLimit-Reset': rateLimit.reset.toString()
					}
				});
			}

			// Add rate limit headers to all API responses
			const makeResponse = (response: Response): Response => {
				const headers = new Headers(response.headers);
				headers.set('X-RateLimit-Limit', '10');
				headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
				headers.set('X-RateLimit-Reset', rateLimit.reset.toString());
				return new Response(response.body, {
					status: response.status,
					headers
				});
			};

			try {
				switch (url.pathname) {
					case '/api/content':
						return makeResponse(await env.ASSETS.fetch(new Request(url.origin + '/metadata/content_index.json')));

					case '/api/posts':
						const posts = [];
						// Directly try to fetch all posts
						const post1Response = await env.ASSETS.fetch(new Request(url.origin + '/posts/post1.json'));
						const post2Response = await env.ASSETS.fetch(new Request(url.origin + '/posts/post2.json'));
						const post3Response = await env.ASSETS.fetch(new Request(url.origin + '/posts/post3.json'));
						
						if (post1Response.ok) {
							const post1 = await post1Response.json();
							posts.push(post1);
						}
						
						if (post2Response.ok) {
							const post2 = await post2Response.json();
							posts.push(post2);
						}

						if (post3Response.ok) {
							const post3 = await post3Response.json();
							posts.push(post3);
						}
						
						return makeResponse(new Response(JSON.stringify(posts, null, 2), {
							headers: { 'Content-Type': 'application/json' }
						}));

					case '/api/stats':
						const indexResponse = await env.ASSETS.fetch(new Request(url.origin + '/metadata/content_index.json'));
						if (!indexResponse.ok) {
							throw new Error('Content index not found');
						}
						const contentIndex = await indexResponse.json();
						
						return makeResponse(new Response(JSON.stringify({
							total_items: contentIndex.total_items,
							content_types: Object.keys(contentIndex.content_types).map(type => ({
								type,
								count: contentIndex.content_types[type].count
							})),
							total_tags: Object.keys(contentIndex.tags).length,
							popular_tags: Object.entries(contentIndex.tags)
								.sort(([,a], [,b]) => b - a)
								.slice(0, 5)
								.map(([tag, count]) => ({ tag, count }))
						}, null, 2), {
							headers: { 'Content-Type': 'application/json' }
						}));

					default:
						return makeResponse(new Response(JSON.stringify({ error: 'Not found' }), {
							status: 404,
							headers: { 'Content-Type': 'application/json' }
						}));
				}
			} catch (error) {
				return makeResponse(new Response(JSON.stringify({ error: error.message }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				}));
			}
		}

		// Non-API routes serve static assets directly
		return env.ASSETS.fetch(request);
	},
} satisfies ExportedHandler<Env>;
