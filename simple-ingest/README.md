# Simple Ingest Project

This project demonstrates a simple ingestion pipeline using Cloudflare Workers, R2, and D1.

It consists of two main parts:

1.  **`ingest-worker/`**: A Cloudflare Worker that exposes an `/ingest` endpoint.
    -   Receives file uploads (multipart/form-data).
    -   Uploads the file content to an R2 bucket.
    -   Records metadata about the file (filename, size, type, R2 key, source) in a D1 database.
2.  **`ingest-cli/`**: A command-line tool to send files to the `ingest-worker`.

## Setup

See the README files within the `ingest-worker` and `ingest-cli` directories for specific setup instructions.

**Note:** You will need to create an R2 bucket and a D1 database in your Cloudflare account and configure the bindings in `ingest-worker/wrangler.jsonc`. 