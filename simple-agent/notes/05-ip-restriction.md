# Step 5: Implementing IP Restriction

To control who can access your API endpoint, we'll implement IP address whitelisting using Cloudflare Worker Secrets.

## 5.1 Understanding Worker Secrets

Secrets are environment variables intended for sensitive data like API keys or configuration values. They are managed using the `wrangler secret` command and are not stored in your code or `wrangler.jsonc`.

## 5.2 Defining the Secret

We will use a secret named `ALLOWED_IPS` to store a comma-separated list of permitted IP addresses.

1.  **Choose your allowed IPs:** Include your development machine's public IP, `127.0.0.1` and `::1` for local testing, and any other IPs that need access.
2.  **Set the secret using `wrangler`:**

    ```bash
    # Replace YOUR_IP_ADDRESS with your actual public IP
    echo "YOUR_IP_ADDRESS,127.0.0.1,::1" | npx wrangler secret put ALLOWED_IPS
    ```

    *   Wrangler will prompt you to confirm.
    *   The `echo "..." |` part pipes the string of IPs directly into the command.

3.  **Verify the secret (optional):**
    ```bash
    npx wrangler secret list
    ```

## 5.3 Updating Worker Code (`src/index.ts`)

Modify the code to read the `ALLOWED_IPS` secret and check the incoming request's IP address.

```typescript
// src/index.ts

export interface Env {
  ASSETS: Fetcher;
  AI: Ai;
  ALLOWED_IPS: string; // Add the secret binding
  // Add API_KEY and RATE_LIMIT_STORE later
}

const AI_MODEL = '@cf/meta/llama-3-8b-instruct';

// Helper function to check IP
const isAllowedIP = (request: Request, allowedIpsStr: string): boolean => {
  // Get client IP from Cloudflare header, fallback to other headers
  const clientIP = request.headers.get('cf-connecting-ip') 
                 || request.headers.get('x-forwarded-for') 
                 || 'unknown'; // Provide a default if IP is not found
  
  // Handle potential null or empty secret
  if (!allowedIpsStr) {
    console.error('ALLOWED_IPS secret is not set or empty.');
    return false; 
  }

  try {
    // Split the comma-separated string from the secret into an array
    const allowedIps = allowedIpsStr.split(',').map(ip => ip.trim());
    console.log(`Checking IP: ${clientIP} against allowed IPs: [${allowedIps.join(', ')}]`);
    // Check if the client IP is in the allowed list
    return allowedIps.includes(clientIP);
  } catch (e) {
    console.error('Error parsing ALLOWED_IPS secret:', e);
    return false; // Deny access if parsing fails
  }
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // --- Route requests for /api ---
    if (url.pathname.startsWith('/api')) {
      
      // 1. <<< CHECK IP ADDRESS FIRST >>>
      if (!isAllowedIP(request, env.ALLOWED_IPS)) {
        console.warn(`Forbidden: IP ${request.headers.get('cf-connecting-ip') || 'unknown'} not allowed.`);
        return new Response('Forbidden: IP address not allowed.', {
          status: 403,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      
      console.log(`Handling API request: ${request.url} from IP: ${request.headers.get('cf-connecting-ip')}`);

      // 2. Get prompt
      const prompt = url.searchParams.get('prompt');
      if (!prompt) {
        return new Response('Bad Request: Missing required query parameter \"prompt\"', { status: 400, headers: { 'Content-Type': 'text/plain' } });
      }

      // 3. Validate prompt
      if (prompt.length > 1000) {
        return new Response('Bad Request: Prompt exceeds maximum length.', { status: 400, headers: { 'Content-Type': 'text/plain' } });
      }

      // 4. Call AI
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
      // Basic error handling for assets
      return new Response('Not found', { status: 404 });
    }
  },
} satisfies ExportedHandler<Env>;
```

**Explanation:**

1.  **`Env` Interface:** Added `ALLOWED_IPS: string;` to declare the secret.
2.  **`isAllowedIP` Function:**
    *   Retrieves the client IP using `request.headers.get('cf-connecting-ip')` (Cloudflare's standard header).
    *   Reads the `allowedIpsStr` (passed from `env.ALLOWED_IPS`).
    *   Handles cases where the secret might be missing or empty.
    *   Splits the comma-separated string into an array.
    *   Checks if the `clientIP` is present in the `allowedIps` array.
    *   Includes error handling for parsing.
3.  **Fetch Handler:**
    *   The very **first action** inside the `/api` route block is now the call to `isAllowedIP()`. This ensures unauthorized IPs are rejected immediately.
    *   If `isAllowedIP()` returns `false`, a `403 Forbidden` response is sent.

## 5.4 Regenerate Types

Secrets don't strictly require type regeneration as they are simple strings passed via the environment, but it's good practice if you modify the `Env` interface:

```bash
npx wrangler types
```

## 5.5 Testing IP Restriction

(Covered in [Step 8](./08-local-dev-testing.md). Testing involves running `npm run dev` and making requests from both allowed and disallowed IPs to `/api`.)

**Next Step:** [Step 6: Implementing API Key Authentication](./06-api-key-auth.md) 