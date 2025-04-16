# Step 8: Local Development and Testing

Testing your worker locally before deployment is crucial. Wrangler provides a local development server that simulates the Cloudflare environment.

## 8.1 Starting the Development Server

Ensure you have completed the previous setup steps (bindings configured, secrets potentially set locally if needed for full testing).

In your project's root directory (`simple-agent/`), run:

```bash
npm run dev
# or directly: npx wrangler dev
```

**Expected Output:**

Wrangler will compile your code and start a local server, usually on `http://localhost:8787`. You'll see output indicating it's ready, similar to:

```
 wrangler dev src/index.ts --local
⎔ Starting local server...
[mf:inf] Ready on http://127.0.0.1:8787
[mf:inf] - http://localhost:8787
```

**Important Considerations for `wrangler dev`:**

-   **Live Bindings:** Bindings like **AI** and **KV** often interact with *live* Cloudflare resources even during local development. This means:
    -   AI usage **will incur costs**.
    -   KV operations will read/write to your *actual* KV namespace unless you configure local persistence separately (more advanced).
-   **Secrets:** By default, `wrangler dev` does *not* load secrets defined using `wrangler secret put`. To test code relying on secrets locally, you have two main options:
    1.  **Use a `.dev.vars` file:** Create a file named `.dev.vars` in your project root (add it to `.gitignore`!). Define secrets like environment variables inside it:
        ```plaintext
        # .dev.vars
        API_KEY=your_test_api_key_value
        ALLOWED_IPS=127.0.0.1,::1,YOUR_LOCAL_IP
        ```
        `wrangler dev` automatically loads this file.
    2.  **Pass secrets via command line:** (Less common for multiple secrets)
        ```bash
        npx wrangler dev --secret API_KEY=your_key --secret ALLOWED_IPS=127.0.0.1
        ```
-   **Auto-Reload:** `wrangler dev` watches for file changes and automatically reloads. However, as noted in `wrangler.md`, sometimes inconsistencies can occur. If things behave unexpectedly after changes, try stopping (`Ctrl+C`) and restarting `wrangler dev`, or even `rm -rf .wrangler node_modules && npm install && npm run dev`.

## 8.2 Testing Functionality

With `wrangler dev` running:

1.  **Static Assets:**
    -   Open `http://localhost:8787/` in your browser.
    -   **Expected:** You should see the content of your `public/index.html`.

2.  **API Endpoint (Basic):**
    -   Open `http://localhost:8787/api?prompt=Hello` in your browser or use `curl`:
        ```bash
        curl "http://localhost:8787/api?prompt=Hello"
        ```
    -   **Expected (without security yet):** An AI-generated response (plain text).

3.  **IP Restriction:**
    -   Ensure your `.dev.vars` (or however you load secrets locally) includes `127.0.0.1` and `::1` in `ALLOWED_IPS`.
    -   Make a request from your local machine:
        ```bash
        # Assuming API_KEY is set in .dev.vars or not yet implemented
        curl -i "http://localhost:8787/api?prompt=Test%20IP"
        ```
    -   **Expected:** A successful response (e.g., HTTP 200).
    -   *(Harder to test locally)* Try making a request from a *different* machine/IP not in the list (if possible) or temporarily remove `127.0.0.1` from `.dev.vars` and restart `wrangler dev`.
    -   **Expected:** `HTTP/1.1 403 Forbidden` with the body "Forbidden: IP address not allowed."

4.  **API Key Authentication:**
    -   Ensure your `.dev.vars` has `API_KEY=your_test_key`.
    -   Make a request *without* the key:
        ```bash
        curl -i "http://localhost:8787/api?prompt=Test%20NoKey"
        ```
    -   **Expected:** `HTTP/1.1 401 Unauthorized` with the body "Unauthorized: Invalid API key."
    -   Make a request *with* the correct key:
        ```bash
        curl -i -H "x-api-key: your_test_key" "http://localhost:8787/api?prompt=Test%20WithKey"
        ```
    -   **Expected:** A successful response (HTTP 200).

5.  **Rate Limiting:**
    -   This requires the KV namespace to be accessible (which it is by default with `wrangler dev`, hitting the *live* namespace).
    -   Run a loop to send requests rapidly (adjust `REQUESTS_PER_WINDOW` in the loop limit if you changed it from 5):
        ```bash
        # Assumes API_KEY is set in .dev.vars
        for i in {1..7}; do \
          echo "Request $i"; \
          curl -i -H "x-api-key: your_test_key" "http://localhost:8787/api?prompt=RateLimitTest$i"; \
          sleep 0.2; \
        done
        ```
    -   **Expected:**
        -   The first 5 requests should return `HTTP/1.1 200 OK` with `X-RateLimit-Remaining` headers decreasing.
        -   Requests 6 and 7 should return `HTTP/1.1 429 Too Many Requests` with a `Retry-After` header.

## 8.3 Debugging

- Check the console output of the running `wrangler dev` process for `console.log` statements and error messages from your worker code.
- Use browser developer tools (Network tab) to inspect request/response headers and status codes.

**Next Step:** [Step 9: Deployment](./09-deployment.md) 