# Step 6: Implementing API Key Authentication

Adding API key authentication provides another layer of security, ensuring only clients with a valid key can access the API, even if their IP is allowed.

## 6.1 Defining the API Key Secret

We'll use another Worker Secret, named `API_KEY`, to store the authentication key.

1.  **Generate a Secure API Key:** Create a strong, random key (e.g., using a password manager or online generator). Aim for at least 32 characters.
    *Example (do not use this specific key):* `sk-MyRandomKey789AbcDefGhiJklMnoPqr`
2.  **Set the secret using `wrangler`:**

    ```bash
    npx wrangler secret put API_KEY
    ```
    *   Wrangler will prompt you to paste your generated API key.

3.  **Verify the secret (optional):**
    ```bash
    npx wrangler secret list
    ```

## 6.2 Updating Worker Code (`src/index.ts`)

Modify the code to read the `API_KEY` secret and check for a matching `x-api-key` header in incoming requests.

```typescript
// src/index.ts

export interface Env {
  ASSETS: Fetcher;
  AI: Ai;
  ALLOWED_IPS: string;
  API_KEY: string; // Add the secret binding
  // Add RATE_LIMIT_STORE later
}

const AI_MODEL = '@cf/meta/llama-3-8b-instruct';

// Helper function to check IP (from previous step)
const isAllowedIP = (request: Request, allowedIpsStr: string): boolean => {
  const clientIP = request.headers.get('cf-connecting-ip') || 'unknown';
  if (!allowedIpsStr) return false;
  try {
    const allowedIps = allowedIpsStr.split(',').map(ip => ip.trim());
    return allowedIps.includes(clientIP);
  } catch (e) {
    console.error('Error parsing ALLOWED_IPS:', e);
    return false;
  }
};

// Helper function to validate API Key
const validateApiKey = (request: Request, env: Env): boolean => {
  const receivedKey = request.headers.get('x-api-key');
  // Check if the header key matches the secret key
  // Ensure env.API_KEY is actually set
  if (!env.API_KEY) {
      console.error('API_KEY secret is not set in the environment.');
      return false;
  }
  return receivedKey === env.API_KEY;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // --- Route requests for /api ---
    if (url.pathname.startsWith('/api')) {

      // 1. Check IP Address
      if (!isAllowedIP(request, env.ALLOWED_IPS)) {
        return new Response('Forbidden: IP address not allowed.', { status: 403, headers: { 'Content-Type': 'text/plain' } });
      }

      // 2. <<< VALIDATE API KEY >>>
      if (!validateApiKey(request, env)) {
        console.warn('Unauthorized: Invalid or missing API key.');
        return new Response('Unauthorized: Invalid API key.', {
          status: 401, // Use 401 for authentication errors
          headers: { 'Content-Type': 'text/plain' },
        });
      }

      console.log(`Handling API request: ${request.url} from IP: ${request.headers.get('cf-connecting-ip')}`);

      // 3. Get prompt
      const prompt = url.searchParams.get('prompt');
      if (!prompt) {
        return new Response('Bad Request: Missing required query parameter \"prompt\"', { status: 400, headers: { 'Content-Type': 'text/plain' } });
      }

      // 4. Validate prompt
      if (prompt.length > 1000) {
        return new Response('Bad Request: Prompt exceeds maximum length.', { status: 400, headers: { 'Content-Type': 'text/plain' } });
      }

      // 5. Call AI
      try {
        const messages = [{ role: 'user', content: prompt }];
        const aiResponse = await env.AI.run(AI_MODEL, { messages });

        if (typeof aiResponse === 'object' && aiResponse !== null && 'response' in aiResponse && typeof aiResponse.response === 'string') {
          return new Response(aiResponse.response, { headers: { 'Content-Type': 'text/plain' } });
        } else {
          console.error('Unexpected AI response structure:', aiResponse);
          return new Response('Internal Server Error: AI response format error.', { status: 500, headers: { 'Content-Type': 'text/plain' } });
        }
      } catch (e: unknown) {
        console.error(`Error processing AI request:`, e);
        return new Response(`Internal Server Error: ${e instanceof Error ? e.message : 'AI request failed'}`, { status: 500, headers: { 'Content-Type': 'text/plain' } });
      }
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

1.  **`Env` Interface:** Added `API_KEY: string;`.
2.  **`validateApiKey` Function:**
    *   Retrieves the value of the `x-api-key` header from the request.
    *   Compares it strictly (`===`) against the `env.API_KEY` secret value.
    *   Includes a check to ensure the `API_KEY` secret was actually loaded into the environment.
3.  **Fetch Handler:**
    *   Added a call to `validateApiKey()` **after** the IP check but **before** processing the prompt or calling the AI.
    *   If `validateApiKey()` returns `false`, a `401 Unauthorized` response is sent.

## 6.3 Regenerate Types

Again, regenerate types if you modified the `Env` interface:

```bash
npx wrangler types
```

## 6.4 Testing API Key Authentication

(Covered in [Step 8](./08-local-dev-testing.md). Testing involves making requests to `/api` using `curl` both with and without the correct `x-api-key` header.)

**Security Best Practices:**

- Use long, random, unpredictable API keys.
- Store keys securely (use secrets, don't commit them to code).
- Consider rotating API keys periodically.
- Do not reuse API keys across different services.

**Next Step:** [Step 7: Implementing Rate Limiting](./07-rate-limiting.md) 