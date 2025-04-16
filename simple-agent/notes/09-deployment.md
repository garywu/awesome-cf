# Step 9: Deployment

This step covers deploying your completed and tested Worker to the Cloudflare global network.

## 9.1 Prerequisites for Deployment

Before deploying, ensure you have:

1.  **Configured Cloudflare Credentials:**
    -   Your Cloudflare **Account ID**.
    -   A Cloudflare **API Token** with the necessary deployment permissions (Workers Scripts: Edit, Workers KV Storage: Edit, Workers Routes: Edit). See Step 3 in the main `README.md` or the previous `DEPLOYMENT.md` notes for details on creating this token.
2.  **Set Up Environment Variables (for Deployment):**
    -   **Locally:** Ensure your `.env` file (copied from `.env.example`) contains:
        ```plaintext
        CLOUDFLARE_ACCOUNT_ID=YOUR_ACCOUNT_ID
        CLOUDFLARE_API_TOKEN=YOUR_DEPLOYMENT_API_TOKEN
        ```
        *(Wrangler reads this `.env` file automatically during deployment)*
    -   **CI/CD (e.g., GitHub Actions):** Configure these as secrets in your CI/CD environment (e.g., `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` secrets in GitHub repository settings).
3.  **Finalized `wrangler.jsonc`:** Double-check that `wrangler.jsonc` includes the correct bindings for `assets`, `ai`, and `kv_namespaces` (with the correct KV namespace ID).
4.  **Created Production Secrets:** Ensure the `ALLOWED_IPS` and `API_KEY` secrets have been set in your Cloudflare account using `npx wrangler secret put ...` for the *production* values you want to use.
5.  **Created Production KV Namespace:** Ensure the KV namespace specified in `wrangler.jsonc` (`RATE_LIMIT_STORE`) exists in your Cloudflare account (created via `npx wrangler kv:namespace create ...`).

## 9.2 Running the Deployment Command

From your project's root directory (`simple-agent/`), run:

```bash
npm run deploy
# or directly: npx wrangler deploy
```

**What Happens:**

1.  **Authentication:** Wrangler uses the `CLOUDFLARE_API_TOKEN` from your environment (or `.env`) to authenticate with the Cloudflare API.
2.  **Build:** Wrangler builds your TypeScript code into JavaScript suitable for the Workers runtime.
3.  **Asset Upload:** If you have static assets in `./public`, Wrangler compares them with previously uploaded versions and uploads any new or changed files.
4.  **Worker Upload:** The compiled Worker script is uploaded to Cloudflare.
5.  **Binding Configuration:** Wrangler ensures the bindings (AI, KV, Assets, Secrets) configured in `wrangler.jsonc` and your account are associated with the deployed Worker version.
6.  **Activation:** The new version is activated, and Cloudflare provides the public URL (e.g., `https://simple-agent.your-subdomain.workers.dev`).

**Expected Output:**

You should see output similar to this, confirming the steps and providing the live URL:

```
 wrangler deploy src/index.ts
 ⛅️ wrangler 4.x.x
-------------------
🌀 Building assets...
✨ Success!
🌀 Starting upload...
🌀 Uploading Worker bundle...
✨ Success! Uploaded Worker script.
✨ Success! Your Worker has access to the following bindings:
- KV Namespaces:
  - RATE_LIMIT_STORE: YOUR_KV_NAMESPACE_ID
- AI:
  - AI
- Assets
✨ Success! Deployed Worker "simple-agent" to:
  https://simple-agent.your-subdomain.workers.dev
```

## 9.3 Post-Deployment Verification

1.  **Access the Public URL:** Open the URL provided by Wrangler in your browser. You should see your static `index.html` page.
2.  **Test the Live API:** Use `curl` or another tool to test the live API endpoint, making sure to use your *production* API key and test from an *allowed* IP address.
    ```bash
    # Replace with your actual URL and production API key
    curl -i -H "x-api-key: YOUR_PRODUCTION_API_KEY" "https://simple-agent.your-subdomain.workers.dev/api?prompt=Deployment%20Test"
    ```
    Verify you get a `200 OK` response with the AI text and the correct `X-RateLimit-*` headers.
3.  **Test Security Rules:**
    -   Try accessing the API without the `x-api-key` header (expect 401).
    -   Try accessing from a disallowed IP (expect 403).
    -   Try exceeding the rate limit (expect 429).

## 9.4 Deployment Troubleshooting

Common deployment issues often relate to authentication or configuration:

-   **Error: Authentication error (10000)**
    -   **Cause:** Invalid or insufficient permissions on the `CLOUDFLARE_API_TOKEN`.
    -   **Solution:** Verify the token is correct and has the required **Edit** permissions (Workers Scripts, KV Storage, Routes) in the Cloudflare dashboard. Regenerate the token if unsure.
-   **Error: Binding not found / KV Namespace not found**
    -   **Cause:** The binding (e.g., `RATE_LIMIT_STORE`) mentioned in `wrangler.jsonc` or your code doesn't exist in your Cloudflare account, or the ID in `wrangler.jsonc` is wrong.
    -   **Solution:** Ensure you ran `npx wrangler kv:namespace create RATE_LIMIT_STORE` and correctly copied the `id` into the `kv_namespaces` section of `wrangler.jsonc`.
-   **Error: Secret not found**
    -   **Cause:** Your deployed code is trying to access `env.API_KEY` or `env.ALLOWED_IPS`, but the corresponding secret wasn't set for the worker in Cloudflare.
    -   **Solution:** Run `npx wrangler secret put API_KEY` and `npx wrangler secret put ALLOWED_IPS` to set the production values.
-   **Error: Script startup errors / Runtime errors**
    -   **Cause:** Issues in your worker code that only manifest in the Cloudflare environment.
    -   **Solution:** Use `npx wrangler tail` to view live logs from your deployed worker immediately after sending a request that causes an error. This often reveals the specific line number or reason for the failure.

**Next Step:** Review [Troubleshooting](./10-troubleshooting.md) and [Security Best Practices](./11-security-best-practices.md) (if created separately) or revisit previous steps. 