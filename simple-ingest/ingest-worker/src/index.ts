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
	STORAGE: R2Bucket;  // For storing files
	DB: D1Database;     // For storing metadata
	RATE_LIMIT_STORE: KVNamespace;
	ALLOWED_IPS: string;
	CLOUDFLARE_API_TOKEN_SIMPLE_INGEST_WORKER: string;
}

interface Post {
	id: string;
	author: {
		id: string;
		username: string;
		avatar?: string;
	};
	content: {
		text: string;
		media?: {
			type: string;
			url: string;
		}[];
	};
	timestamp: string;
	tags: string[];
}

interface SimpleUpload {
	type: 'simple';
	source?: string;
	filename?: string;
}

interface PostUpload {
	type: 'post';
	metadata: {
		id: string;
		author: {
			id: string;
			username: string;
			avatar?: string;
		};
		content: {
			text: string;
		};
		timestamp: string;
		tags: string[];
	};
}

type UploadMetadata = SimpleUpload | PostUpload;

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

function isValidIPv4(ip: string): boolean {
	const parts = ip.split('.');
	if (parts.length !== 4) return false;
	
	return parts.every(part => {
		const num = parseInt(part, 10);
		return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
	});
}

function isValidIPv6(ip: string): boolean {
	const parts = ip.split(':');
	if (parts.length < 2 || parts.length > 8) return false;
	
	// Check for :: compression
	const hasEmpty = parts.includes('');
	if (hasEmpty) {
		if (parts[0] === '' && parts[1] === '') parts.splice(0, 1);
		if (parts[parts.length - 1] === '' && parts[parts.length - 2] === '') parts.pop();
		if (parts.filter(part => part === '').length > 1) return false;
	}
	
	return parts.every(part => {
		if (part === '') return true;
		return /^[0-9A-Fa-f]{1,4}$/.test(part);
	});
}

function isValidIP(ip: string): boolean {
	ip = ip.trim();
	if (ip === '::1' || ip === '127.0.0.1') return true; // Allow localhost
	return isValidIPv4(ip) || isValidIPv6(ip);
}

function checkIpAllowed(request: Request, env: Env): boolean {
	const clientIp = request.headers.get('cf-connecting-ip') || '';
	if (!isValidIP(clientIp)) return false;
	
	const allowedIps = env.ALLOWED_IPS.split(',')
		.map(ip => ip.trim())
		.filter(ip => isValidIP(ip));
	
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
					case '/api/ingest':
						if (request.method !== 'POST') {
							return makeResponse(new Response(JSON.stringify({ error: 'Method not allowed' }), {
								status: 405,
								headers: { 'Content-Type': 'application/json' }
							}));
						}

						try {
							const formData = await request.formData();
							const files = formData.getAll('files') as File[];
							const metadataStr = formData.get('metadata') as string;
							
							if (!metadataStr) {
								// Handle as simple upload if no metadata provided
								const file = files[0] || formData.get('file') as File;
								if (!file) {
									return makeResponse(new Response(JSON.stringify({ error: 'No file provided' }), {
										status: 400,
										headers: { 'Content-Type': 'application/json' }
									}));
								}

								const source = formData.get('source') as string || 'unknown';
								const filename = formData.get('filename') as string || file.name || 'unnamed-file';

								// Store file in R2
								const key = `uploads/${Date.now()}-${filename}`;
								await env.STORAGE.put(key, file, {
									httpMetadata: {
										contentType: file.type,
									},
								});

								// Store metadata in D1
								await env.DB.prepare(
									`INSERT INTO uploads (filename, key, type, size, source, timestamp)
									VALUES (?, ?, ?, ?, ?, datetime('now'))`
								).bind(
									filename,
									key,
									file.type,
									file.size,
									source
								).run();

								return makeResponse(new Response(JSON.stringify({
									success: true,
									file: {
										key,
										name: filename,
										type: file.type,
										size: file.size
									}
								}), {
									status: 200,
									headers: { 'Content-Type': 'application/json' }
								}));
							}

							// Handle as complex post upload
							const metadata = JSON.parse(metadataStr) as UploadMetadata;

							if (metadata.type === 'post') {
								const postData = metadata.metadata;
								
								// Store files in R2
								const mediaUrls = await Promise.all(files.map(async (file) => {
									const key = `media/${postData.id}/${file.name}`;
									await env.STORAGE.put(key, file, {
										httpMetadata: {
											contentType: file.type,
										},
									});
									return {
										type: file.type,
										url: key
									};
								}));

								// Update post with media URLs
								const content = {
									...postData.content,
									media: mediaUrls
								};

								// Store post metadata in D1
								await env.DB.prepare(
									`INSERT INTO posts (id, author_id, author_username, content, timestamp)
									VALUES (?, ?, ?, ?, ?)`
								).bind(
									postData.id,
									postData.author.id,
									postData.author.username,
									JSON.stringify(content),
									postData.timestamp
								).run();

								// Store tags
								for (const tag of postData.tags) {
									await env.DB.prepare(
										`INSERT INTO post_tags (post_id, tag) VALUES (?, ?)`
									).bind(postData.id, tag).run();
								}

								return makeResponse(new Response(JSON.stringify({ 
									success: true, 
									post: {
										...postData,
										content
									}
								}), {
									status: 200,
									headers: { 'Content-Type': 'application/json' }
								}));
							}

							return makeResponse(new Response(JSON.stringify({ error: 'Invalid metadata format' }), {
								status: 400,
								headers: { 'Content-Type': 'application/json' }
							}));
						} catch (error: any) {
							console.error('API Error:', error);
							return makeResponse(new Response(JSON.stringify({ 
								error: error instanceof Error ? error.message : 'Unknown error'
							}), {
								status: 500,
								headers: { 'Content-Type': 'application/json' }
							}));
						}

					case '/api/posts':
						const { results } = await env.DB.prepare(`
							SELECT 
								p.id,
								p.author_id,
								p.author_username,
								p.content,
								p.timestamp,
								GROUP_CONCAT(t.tag) as tags
							FROM posts p
							LEFT JOIN post_tags t ON p.id = t.post_id
							GROUP BY p.id
							ORDER BY p.timestamp DESC
						`).all();

						const posts = results.map(row => ({
							id: row.id as string,
							author: {
								id: row.author_id as string,
								username: row.author_username as string
							},
							content: JSON.parse(row.content as string),
							timestamp: row.timestamp as string,
							tags: (row.tags as string)?.split(',').filter(Boolean) || []
						}));

						return makeResponse(new Response(JSON.stringify(posts, null, 2), {
							headers: { 'Content-Type': 'application/json' }
						}));

					case '/api/stats':
						const [postCount, tagCount, popularTags] = await Promise.all([
							env.DB.prepare('SELECT COUNT(*) as count FROM posts').first(),
							env.DB.prepare('SELECT COUNT(DISTINCT tag) as count FROM post_tags').first(),
							env.DB.prepare(`
								SELECT tag, COUNT(*) as count 
								FROM post_tags 
								GROUP BY tag 
								ORDER BY count DESC 
								LIMIT 5
							`).all()
						]);

						return makeResponse(new Response(JSON.stringify({
							total_posts: (postCount as { count: number })?.count || 0,
							total_tags: (tagCount as { count: number })?.count || 0,
							popular_tags: (popularTags?.results || []).map(row => ({
								tag: row.tag as string,
								count: row.count as number
							}))
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
				console.error('API Error:', error);
				return makeResponse(new Response(JSON.stringify({ 
					error: error instanceof Error ? error.message : 'Unknown error'
				}), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				}));
			}
		}

		// Add deprecation notice for old /ingest endpoint
		if (url.pathname === '/ingest' && request.method === 'POST') {
			console.warn('Deprecated: /ingest endpoint is deprecated, please use /api/ingest instead');
			try {
				const formData = await request.formData();
				const file = formData.get('file') as File;
				const source = formData.get('source') as string || 'unknown';
				const filename = formData.get('filename') as string || file.name;
				
				// Forward to new endpoint
				const newFormData = new FormData();
				newFormData.append('files', file);
				newFormData.append('source', source);
				newFormData.append('filename', filename);
				
				const newRequest = new Request(`${url.origin}/api/ingest`, {
					method: 'POST',
					headers: request.headers,
					body: newFormData,
				});
				
				const response = await fetch(newRequest);
				const newResponse = new Response(response.body, response);
				newResponse.headers.set('X-Deprecation-Notice', 'This endpoint is deprecated, please use /api/ingest');
				return newResponse;
			} catch (error: any) {
				return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
					status: 500,
					headers: { 
						'Content-Type': 'application/json',
						'X-Deprecation-Notice': 'This endpoint is deprecated, please use /api/ingest'
					}
				});
			}
		}

		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	},
} satisfies ExportedHandler<Env>;
