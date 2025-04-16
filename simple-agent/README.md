# Simple Agent - Cloudflare Worker AI API

A simple, secure API to access Cloudflare's AI capabilities.

## Features

- 🤖 AI-powered responses (Mistral-7B)
- 🔒 Secure access (IP Whitelist, API Key)
- 🚦 Rate Limiting
- ⚡ Fast performance via Cloudflare Workers

## Quick Start

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/garywu/awesome-cf.git
    cd awesome-cf/simple-agent
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Cloudflare Credentials & Secrets:**

    *   **Find your Account ID:**
        *   Log in to the Cloudflare dashboard.
        *   Select any domain.
        *   Find the **Account ID** in the right sidebar under the "API" section. Copy it.
    *   **Create an API Token:**
        *   In the Cloudflare dashboard, go to My Profile > API Tokens.
        *   Click "Create Token".
        *   Find the "Edit Cloudflare Workers" template and click "Use template".
        *   Ensure the following **Permissions** are included and set to **Edit**:
            *   Account > Workers Scripts: **Edit**
            *   Account > Workers KV Storage: **Edit**
            *   Account > Workers Routes: **Edit**
        *   Ensure **Account Resources** is set to your account.
        *   Click "Continue to summary", then "Create Token".
        *   **Copy the generated token immediately** – it will only be shown once.
    *   **Set Environment Variables:**
        *   Copy `.env.example` to `.env`:
          ```bash
          cp .env.example .env
          ```
        *   Edit the `.env` file and paste your **Account ID** and the **API Token** you just created:
          ```plaintext
          CLOUDFLARE_ACCOUNT_ID=YOUR_ACCOUNT_ID_HERE
          CLOUDFLARE_API_TOKEN=YOUR_API_TOKEN_HERE
          ```
          *(For CI/CD, set these as secrets like `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in your repository settings)*
    *   **Set API Key Secret:**
        *   Choose a secure API key (at least 32 characters recommended).
        *   Run the following command and paste your key when prompted:
          ```bash
          npx wrangler secret put API_KEY
          ```
    *   **Set Allowed IPs Secret:**
        *   Find your public IP address (e.g., by searching "what is my IP" online).
        *   Run the following, replacing `YOUR_PUBLIC_IP_ADDRESS`:
          ```bash
          echo "YOUR_PUBLIC_IP_ADDRESS,127.0.0.1,::1" | npx wrangler secret put ALLOWED_IPS
          ```
    *   **Create KV Namespace:**
        *   Run:
          ```bash
          npx wrangler kv:namespace create "RATE_LIMIT_STORE"
          ```
        *   Copy the `id` value from the output.
        *   Open `wrangler.jsonc` and paste the ID into the `kv_namespaces` section:
          ```jsonc
          "kv_namespaces": [
            { "binding": "RATE_LIMIT_STORE", "id": "PASTE_YOUR_KV_ID_HERE" }
          ]
          ```

4.  **Local Development:**
    ```bash
    npm run dev
    ```
    Access at `http://localhost:8787`.

5.  **Deploy:**
    ```bash
    npm run deploy
    ```
    (Your API will be live at the URL provided)

## Usage

Make requests to your deployed worker URL:

```bash
curl -H "x-api-key: YOUR_API_KEY" "https://your-worker-url.workers.dev/api?prompt=Hello%20world"
```

- Replace `YOUR_API_KEY` with the key you set.
- Replace `your-worker-url.workers.dev` with your actual worker URL.

## More Information

For detailed technical documentation, deployment troubleshooting, and security configuration, see the [Notes](./notes/README.md).

## License

MIT License - See [LICENSE](./LICENSE) for details.
