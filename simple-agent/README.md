# Simple Agent - Cloudflare Worker

This project is a simple Cloudflare Worker demonstrating basic functionality:

*   **AI Integration:** Uses the Cloudflare AI binding (`env.AI`) to connect to a text generation model (`@cf/mistral/mistral-7b-instruct-v0.1`).
*   **API Endpoint:** Exposes an `/api` endpoint that takes a `prompt` query parameter and returns an AI-generated response.
*   **Static Site:** Serves a basic static HTML page from the `/public` directory at the root URL (`/`).

## Running Locally

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Start Development Server:**
    ```bash
    # Uses wrangler dev internally
    npm run start 
    # Or directly:
    # npm run dev
    ```
    Wrangler will start the server, typically on `http://localhost:8787`.

3.  **Access the Worker:**
    *   **Static Page:** Open your browser to `http://localhost:8787/`.
    *   **API:** Access the API endpoint with a prompt, e.g., `http://localhost:8787/api?prompt=Hello%20world`.

    *Note:* Using the AI binding during local development (`npm run dev` / `npm run start`) will interact with live Cloudflare resources and may incur costs.

## Deployment

To deploy the worker to your Cloudflare account:

```bash
npm run deploy
```

This will build and publish the worker based on your `wrangler.jsonc` configuration.

## CI/CD Test
This line was added to test the CI/CD pipeline and secret configuration. 