# Step 4: Building the API Endpoint

This step refines the worker code to create a dedicated `/api` endpoint that takes user prompts and returns AI responses.

## 4.1 Designing the API Route

We'll create an endpoint at `/api` that accepts GET requests with a query parameter named `prompt`.

- **URL:** `https://your-worker-url.workers.dev/api?prompt=Your%20question%20here`
- **Method:** GET
- **Query Parameter:** `prompt` (required, contains the user's input for the AI)
- **Response:** Plain text AI completion.

## 4.2 Updating Worker Code (`src/index.ts`)

Modify the `fetch` handler in `src/index.ts` to implement this API logic.

```typescript
// src/index.ts

export interface Env {
  ASSETS: Fetcher;
  AI: Ai;
  // Add other bindings later (KV, secrets)
}

// Define the AI model to use
const AI_MODEL = '@cf/meta/llama-3-8b-instruct'; // Or your preferred model

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // --- Route requests for /api ---
    if (url.pathname.startsWith('/api')) {
      console.log(`Handling API request: ${request.url}`);

      // 1. Get prompt from query parameter
      const prompt = url.searchParams.get('prompt');
      if (!prompt) {
        return new Response('Bad Request: Missing required query parameter \"prompt\"', {
          status: 400,
          headers: { 'Content-Type': 'text/plain' },
        });
      }

      // 2. Basic prompt validation (example: length)
      if (prompt.length > 1000) { // Adjust limit as needed
        return new Response('Bad Request: Prompt exceeds maximum length of 1000 characters.', {
          status: 400,
          headers: { 'Content-Type': 'text/plain' },
        });
      }

      // 3. Call the AI model
      try {
        const messages = [{ role: 'user', content: prompt }]; // Simple user prompt
        const aiResponse = await env.AI.run(AI_MODEL, { messages });

        console.log('AI Response Structure:', aiResponse);

        // 4. Process and return AI response
        // Check if the response is in the expected format { response: string }
        if (typeof aiResponse === 'object' && aiResponse !== null && 'response' in aiResponse && typeof aiResponse.response === 'string') {
           return new Response(aiResponse.response, {
             headers: { 'Content-Type': 'text/plain' },
           });
        } else {
           // Log unexpected structure and return error
           console.error('Unexpected AI response structure:', aiResponse);
           return new Response('Internal Server Error: AI returned an unexpected response format.', {
             status: 500,
             headers: { 'Content-Type': 'text/plain' },
           });
        }

      } catch (e: unknown) {
        console.error(`Error processing AI request for prompt \"${prompt}\":`, e);
        let errorMessage = 'Internal Server Error: Failed to process AI request.';
        if (e instanceof Error) {
          errorMessage += ` Details: ${e.message}`;
        }
        return new Response(errorMessage, {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    }

    // --- Handle other requests (serve static assets) ---
    try {
      // console.log(`Attempting to serve static asset for: ${url.pathname}`);
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

1.  **Routing:** Checks if `url.pathname` starts with `/api`.
2.  **Get Prompt:** Extracts the `prompt` value from `url.searchParams`.
3.  **Validation:** Returns a `400 Bad Request` if `prompt` is missing or too long.
4.  **AI Call:** Constructs the `messages` array and calls `env.AI.run()` with the chosen `AI_MODEL`.
5.  **Response Handling:** Checks if the `aiResponse` has the expected structure (`{ response: string }`). If yes, returns the `aiResponse.response` text. If not, logs an error and returns a `500 Internal Server Error`.
6.  **Error Handling:** Includes a `try...catch` block for the AI call to handle potential network or API errors, returning a `500 Internal Server Error` with details.
7.  **Static Assets:** The fallback to `env.ASSETS.fetch()` remains for non-`/api` requests.

## 4.3 Testing the API Endpoint

(Covered in [Step 8](./08-local-dev-testing.md). Testing involves running `npm run dev` and making requests using `curl` or a browser to `http://localhost:8787/api?prompt=YourPromptHere`.)

**Next Step:** [Step 5: Implementing IP Restriction](./05-ip-restriction.md) 