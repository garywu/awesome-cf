# Step 3: Integrating Cloudflare AI

This step adds Cloudflare's Workers AI functionality to the project.

## 3.1 Configuring the AI Binding

Similar to static assets, AI integration uses a binding configured in `wrangler.jsonc`.

1.  **Open `wrangler.jsonc`**.
2.  **Add the `ai` configuration block**:

    ```jsonc
    {
      "name": "simple-agent",
      "main": "src/index.ts",
      "compatibility_date": "YYYY-MM-DD",
      "assets": {
        "binding": "ASSETS",
        "directory": "./public"
      },
      "ai": {
        "binding": "AI"
      }
    }
    ```

**Explanation:**

- `binding`: Defines the name (`AI`) that will be used to access the Workers AI functionality within your Worker code via the `Env` interface.

**Important Note on AI Costs:** Using the AI binding, even during local development (`wrangler dev`), interacts with Cloudflare's backend AI models and **will incur usage charges** based on Cloudflare's pricing for Workers AI.

## 3.2 Updating Worker Code for AI

Modify `src/index.ts` to include the AI binding in the `Env` interface.

```typescript
// src/index.ts

// Define the expected environment bindings
export interface Env {
  ASSETS: Fetcher;
  AI: Ai;
  // Add other bindings later (KV, secrets)
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Basic check for AI functionality (will be expanded in the API step)
    if (url.pathname === '/ai-test') {
      try {
        console.log('Running AI test...');
        const messages = [{ role: 'system', content: 'You are friendly' }, { role: 'user', content: 'Hello?' }];
        const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', { messages });
        console.log('AI Response:', response);
        // Ensure response structure is as expected before stringifying
        let responseBody = '';
        if (typeof response === 'object' && response !== null && 'response' in response) {
          responseBody = response.response as string;
        } else {
          responseBody = JSON.stringify(response); // Fallback
        }

        return new Response(responseBody, { headers: { 'Content-Type': 'text/plain' } });
      } catch (e) {
        console.error('AI Error:', e);
        return new Response(`AI Error: ${e instanceof Error ? e.message : String(e)}`, { status: 500 });
      }
    }

    // Fallback to static assets
    try {
      console.log(`Attempting to serve static asset for: ${url.pathname}`);
      return await env.ASSETS.fetch(request);
    } catch (e) {
      console.error(`Failed to fetch asset: ${e}`);
      if (e instanceof Error && e.message.includes('Not Found')) {
         return new Response('Static Asset Not Found', { status: 404 });
       }
      return new Response('Internal Server Error fetching asset', { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
```

**Explanation:**

- The `Env` interface now includes `AI: Ai;`. The `Ai` type is provided by `@cloudflare/workers-types`.
- A temporary `/ai-test` route is added to demonstrate calling `env.AI.run()`.
- We use a specific model (`@cf/meta/llama-3-8b-instruct` - you can choose others from the Cloudflare docs).
- The `messages` format follows the standard required by many chat/instruction models.
- Includes basic error handling for the AI call.
- **Important:** The code now checks if the response object has a `response` property (common for text generation) before trying to access it. If not, it stringifies the whole response as a fallback.

## 3.3 Regenerate Types

Update the TypeScript types again to include the `AI` binding:

```bash
npx wrangler types
```

## 3.4 Testing AI Integration

(Covered in [Step 8](./08-local-dev-testing.md). Testing involves running `npm run dev` and navigating to `http://localhost:8787/ai-test`.)

**Next Step:** [Step 4: Building the API Endpoint](./04-api-endpoint.md) 