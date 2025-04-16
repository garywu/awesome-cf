# Step 2: Setting Up Static Assets

Cloudflare Workers can serve static files (HTML, CSS, JS, images) directly alongside your dynamic worker logic.

## 2.1 Understanding the `public` Directory

The default project structure created by `wrangler init` includes a `public` directory. This is the conventional location for static assets.

- Any files placed here can potentially be served by the worker.
- The default `public/index.html` will be served at the root path (`/`) if configured correctly.

## 2.2 Configuring the Assets Binding

To tell Wrangler to serve files from the `public` directory, you need to configure an `assets` binding in `wrangler.jsonc`.

1.  **Open `wrangler.jsonc`**.
2.  **Add the `assets` configuration block** (if it doesn't exist from the template, although recent templates usually include it):

    ```jsonc
    {
      "name": "simple-agent",
      "main": "src/index.ts",
      "compatibility_date": "YYYY-MM-DD",
      // Add this block:
      "assets": {
        "binding": "ASSETS", // This name is used in the Worker code (Env interface)
        "directory": "./public" // Points to the directory containing static files
      }
      // ... other configurations ...
    }
    ```

**Explanation:**

- `binding`: Defines the name (`ASSETS`) that will be used to access the static assets functionality within your Worker code (via the `Env` interface).
- `directory`: Specifies the path (relative to the project root) where your static files are located.

## 2.3 Creating a Custom Static Page (Optional)

You can replace the default `public/index.html` with your own content. For example:

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<title>Simple Agent</title>
		<style>
			body { font-family: sans-serif; padding: 2em; }
		</style>
	</head>
	<body>
		<h1>Simple AI Agent - Welcome</h1>
		<p>This is the static landing page served by the Worker.</p>
		<p>The API endpoint is available at <code>/api</code>.</p>
	</body>
</html>
```

Save this content as `public/index.html`.

## 2.4 Updating Worker Code to Serve Assets

Now, modify your `src/index.ts` to handle requests for static assets.

1.  **Define the `Env` Interface:** Ensure your environment interface includes the `ASSETS` binding name you defined in `wrangler.jsonc`.
2.  **Implement Fetch Logic:** In the `fetch` handler, if a request doesn't match your dynamic routes (like `/api`), pass it to the `env.ASSETS.fetch()` method.

```typescript
// src/index.ts

// Define the expected environment bindings
export interface Env {
  // Add other bindings later (AI, KV, secrets)
  ASSETS: Fetcher; // Matches the binding name in wrangler.jsonc
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Example: Handle API routes later
    // if (url.pathname.startsWith('/api')) {
    //   // ... API logic ...
    // }

    // For any other request, attempt to serve static assets
    try {
      console.log(`Attempting to serve static asset for: ${url.pathname}`);
      // Pass the request to the Assets binding
      return await env.ASSETS.fetch(request);
    } catch (e) {
      // If the asset isn't found, ASSETS.fetch() might throw
      // or return a 404 response depending on configuration.
      // For simplicity here, we return a basic 404.
      console.error(`Failed to fetch asset: ${e}`);
      // A basic 404 response if the asset is not found
      // Note: In production, env.ASSETS often handles 404s automatically.
      // This catch block is more for demonstrating the flow or handling unexpected errors.
      if (e instanceof Error && e.message.includes('Not Found')) {
        return new Response('Static Asset Not Found', { status: 404 });
      }
      return new Response('Internal Server Error', { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
```

**Explanation:**

- The `Env` interface now includes `ASSETS: Fetcher;`.
- The `fetch` handler tries to serve static assets using `env.ASSETS.fetch(request)` for any request not explicitly handled by other routes.
- Basic error handling is included.

## 2.5 Regenerate Types

After modifying `wrangler.jsonc` to add the binding, regenerate the TypeScript types:

```bash
npx wrangler types
```

This updates `worker-configuration.d.ts` so TypeScript understands the `env.ASSETS` binding.

## 2.6 Testing Static Assets

(We will cover detailed local testing in [Step 8](./08-local-dev-testing.md), but the basic idea is to run `npm run dev` and navigate to `http://localhost:8787/` in your browser. You should see the content of `public/index.html`.)

**Next Step:** [Step 3: Integrating Cloudflare AI](./03-ai-integration.md) 