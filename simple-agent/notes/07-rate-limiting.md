# Step 7: Implementing Rate Limiting

Rate limiting prevents abuse and helps manage costs by restricting the number of requests a client can make within a specific time window. We'll use Cloudflare KV storage for this.

## 7.1 Understanding KV (Key-Value) Storage

Cloudflare KV is a globally distributed key-value store. We'll use it to store request counts for each IP address.

## 7.2 Creating a KV Namespace

A KV namespace is a container for your key-value data.

1.  **Create the namespace using `wrangler`:**

    ```bash
    npx wrangler kv:namespace create "RATE_LIMIT_STORE"
    ```

2.  **Copy the Output:** The command will output something like:

    ```
    🌀 Creating namespace "RATE_LIMIT_STORE"
    ✅ Success! Created namespace RATE_LIMIT_STORE
    Add the following to your wrangler.jsonc:
    kv_namespaces = [
      { binding = "RATE_LIMIT_STORE", id = "YOUR_NEW_NAMESPACE_ID_HERE" }
    ]
    ```
    **Copy the `id` value.**

## 7.3 Configuring the KV Binding

1.  **Open `wrangler.jsonc`**.
2.  **Add the `kv_namespaces` configuration block** (or add to the existing array if it exists):

    ```jsonc
    {
      "name": "simple-agent",
      "main": "src/index.ts",
      "compatibility_date": "YYYY-MM-DD",
      "assets": { /* ... */ },
      "ai": { /* ... */ },
      // Add this block/entry:
      "kv_namespaces": [
        { 
          "binding": "RATE_LIMIT_STORE", // Name used in Worker code (Env interface)
          "id": "PASTE_YOUR_KV_ID_HERE" // The ID copied from the create command
        }
      ]
      // ... other configurations ...
    }
    ```
    Replace `PASTE_YOUR_KV_ID_HERE` with the actual ID you copied.

## 7.4 Updating Worker Code (`src/index.ts`)

Implement the rate limiting logic using the KV namespace.

```typescript
// src/index.ts

export interface Env {
  ASSETS: Fetcher;
  AI: Ai;
  ALLOWED_IPS: string;
  API_KEY: string;
  RATE_LIMIT_STORE: KVNamespace; // Add the KV binding
}

const AI_MODEL = '@cf/meta/llama-3-8b-instruct';

// Rate limit configuration constants
const RATE_LIMIT_CONFIG = {
  // e.g., 5 requests per 60 seconds per IP
  REQUESTS_PER_WINDOW: 5,
  WINDOW_SECONDS: 60, 
};

// Helper function to check IP (from previous step)
const isAllowedIP = (/* ... */) => { /* ... as before ... */ };
// Helper function to validate API Key (from previous step)
const validateApiKey = (/* ... */) => { /* ... as before ... */ };

// Rate limiting function using KV
async function checkRateLimit(request: Request, env: Env): Promise<{ allowed: boolean; remaining: number }> {
  const clientIP = request.headers.get('cf-connecting-ip') || 'unknown';
  if (clientIP === 'unknown') {
      // Cannot rate limit if IP is unknown, decide how to handle (e.g., deny or allow cautiously)
      console.warn('Cannot rate limit request without a client IP.');
      return { allowed: true, remaining: RATE_LIMIT_CONFIG.REQUESTS_PER_WINDOW }; // Example: Allow if IP unknown
  }

  const now = Math.floor(Date.now() / 1000);
  // Create a rolling window key based on IP and time window
  const windowTimeSegment = Math.floor(now / RATE_LIMIT_CONFIG.WINDOW_SECONDS);
  const windowKey = `${clientIP}:${windowTimeSegment}`;

  // Get the current request count for this IP in this time window
  const currentCountStr = await env.RATE_LIMIT_STORE.get(windowKey);
  const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;

  if (currentCount >= RATE_LIMIT_CONFIG.REQUESTS_PER_WINDOW) {
    // Limit exceeded
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    return { allowed: false, remaining: 0 };
  }

  // Increment the count and set expiration (TTL) for the key
  // The key will automatically expire after the window passes
  const newCount = currentCount + 1;
  await env.RATE_LIMIT_STORE.put(windowKey, newCount.toString(), {
    expirationTtl: RATE_LIMIT_CONFIG.WINDOW_SECONDS, // Key expires after window duration
  });

  const remaining = RATE_LIMIT_CONFIG.REQUESTS_PER_WINDOW - newCount;
  console.log(`Rate limit check for IP ${clientIP}: Count ${newCount}, Remaining ${remaining}`);
  return { allowed: true, remaining: remaining };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // --- Route requests for /api ---
    if (url.pathname.startsWith('/api')) {

      // 1. Check IP Address
      if (!isAllowedIP(request, env.ALLOWED_IPS)) { /* ... return 403 ... */ }

      // 2. Validate API Key
      if (!validateApiKey(request, env)) { /* ... return 401 ... */ }
      
      // 3. <<< CHECK RATE LIMIT >>>
      const rateLimitResult = await checkRateLimit(request, env);
      if (!rateLimitResult.allowed) {
        return new Response('Too Many Requests: Rate limit exceeded.', {
          status: 429, // Standard HTTP status for rate limiting
          headers: {
            'Content-Type': 'text/plain',
            // Inform client when they can retry (in seconds)
            'Retry-After': RATE_LIMIT_CONFIG.WINDOW_SECONDS.toString(),
          },
        });
      }

      console.log(`Handling API request: ${request.url} from IP: ${request.headers.get('cf-connecting-ip')}`);

      // 4. Get & Validate prompt
      const prompt = url.searchParams.get('prompt');
      if (!prompt) { /* ... return 400 ... */ }
      if (prompt.length > 1000) { /* ... return 400 ... */ }

      // 5. Call AI
      try {
        const messages = [{ role: 'user', content: prompt }];
        const aiResponse = await env.AI.run(AI_MODEL, { messages });

        if (typeof aiResponse === 'object' /* ... response check ... */) {
          // <<< ADD RATE LIMIT HEADERS TO SUCCESSFUL RESPONSE >>>
          return new Response(aiResponse.response, {
            headers: {
              'Content-Type': 'text/plain',
              'X-RateLimit-Limit': RATE_LIMIT_CONFIG.REQUESTS_PER_WINDOW.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': RATE_LIMIT_CONFIG.WINDOW_SECONDS.toString(), // Seconds until *next* window could start
            },
          });
        } else { /* ... return 500 AI format error ... */ }
      } catch (e: unknown) { /* ... return 500 AI processing error ... */ }
    }

    // --- Handle other requests (serve static assets) ---
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response('Not found', { status: 404 });
    }
  },
} satisfies ExportedHandler<Env>;
```

**Explanation:**

1.  **`Env` Interface:** Added `RATE_LIMIT_STORE: KVNamespace;`.
2.  **`RATE_LIMIT_CONFIG`:** Constants defined for easy adjustment of limits.
3.  **`checkRateLimit` Function:**
    *   Gets the client IP.
    *   Calculates a `windowKey` based on the IP and the current time segment (e.g., groups requests into 60-second buckets).
    *   Reads the current count from KV using `env.RATE_LIMIT_STORE.get(windowKey)`.
    *   If count exceeds limit, returns `allowed: false`.
    *   If allowed, increments the count and writes it back to KV using `env.RATE_LIMIT_STORE.put()` with an `expirationTtl` equal to the window size. This ensures keys automatically disappear after the window, preventing old data buildup.
    *   Returns `allowed: true` and the `remaining` count.
4.  **Fetch Handler:**
    *   Calls `checkRateLimit()` after successful IP and API key checks.
    *   If rate limited, returns a `429 Too Many Requests` response with a `Retry-After` header.
    *   **Crucially:** Adds `X-RateLimit-*` headers to successful API responses to inform the client about their current status.

## 7.5 Regenerate Types

Regenerate types for the new `KVNamespace` binding:

```bash
npx wrangler types
```

## 7.6 Testing Rate Limiting

(Covered in [Step 8](./08-local-dev-testing.md). Testing involves sending rapid requests to `/api` using `curl` or a script and observing the `429` responses and `X-RateLimit-*` headers.)

**Next Step:** [Step 8: Local Development and Testing](./08-local-dev-testing.md) 