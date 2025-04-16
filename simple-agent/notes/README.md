# Simple Agent Development Notes

This folder contains a step-by-step guide detailing how to build the `simple-agent` Cloudflare Worker project from scratch, including configuration, security features, testing, and deployment.

## Tutorial Steps

1.  **[Project Initialization](./01-project-initialization.md)**
    -   Setting up the basic project structure using Wrangler.

2.  **[Setting Up Static Assets](./02-static-assets.md)**
    -   Configuring Wrangler to serve static files (HTML, etc.) from the `public` directory.
    -   Updating worker code to handle asset requests.

3.  **[Integrating Cloudflare AI](./03-ai-integration.md)**
    -   Adding the AI binding in `wrangler.jsonc`.
    -   Updating worker code to call an AI model.

4.  **[Building the API Endpoint](./04-api-endpoint.md)**
    -   Creating the `/api` route.
    -   Handling `prompt` query parameters.
    -   Processing and returning AI responses.

5.  **[Implementing IP Restriction](./05-ip-restriction.md)**
    -   Using Worker Secrets to store allowed IP addresses (`ALLOWED_IPS`).
    -   Adding code to check the client IP address.

6.  **[Implementing API Key Authentication](./06-api-key-auth.md)**
    -   Using Worker Secrets to store an API key (`API_KEY`).
    -   Adding code to validate the `x-api-key` header.

7.  **[Implementing Rate Limiting](./07-rate-limiting.md)**
    -   Creating and configuring a KV Namespace (`RATE_LIMIT_STORE`).
    -   Adding code to track requests per IP using KV.
    -   Returning `429 Too Many Requests` responses and rate limit headers.

8.  **[Local Development and Testing](./08-local-dev-testing.md)**
    -   Using `wrangler dev` to run the worker locally.
    -   Strategies for testing with secrets (`.dev.vars`).
    -   Testing static assets, API functionality, IP restriction, API key auth, and rate limiting locally.

9.  **[Deployment](./09-deployment.md)**
    -   Prerequisites for deployment (credentials, secrets, KV).
    -   Running `wrangler deploy`.
    -   Post-deployment verification.
    -   Common deployment troubleshooting tips.

## Additional Notes

-   **[Wrangler Tips](./wrangler.md):** General observations and tips for working with Wrangler CLI.
-   **[Project Knowledge](./knowledge.md):** Other project-specific context and learnings.

---

*Navigate back to the main [User Quick Start](../README.md).*
