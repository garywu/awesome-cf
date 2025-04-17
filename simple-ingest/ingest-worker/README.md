# Ingest Worker

This Cloudflare Worker handles file ingestion, uploads to R2, and metadata storage in D1.

## Setup

1.  **Configure `wrangler.jsonc`:**
    -   Add bindings for your R2 bucket (e.g., `INGEST_BUCKET`).
    -   Add bindings for your D1 database (e.g., `INGEST_DB`).
    -   Ensure `compatibility_date` is set.
2.  **Create D1 Table:** Define and create the necessary table in your D1 database (see `schema.sql` example).
3.  **Set Environment Variables/Secrets (Optional):** If needed for authentication or other configuration.
4.  **Deploy:** `npm run deploy`

## Endpoint

-   `POST /ingest`:
    -   Expects `multipart/form-data`.
    -   Requires a `file` field containing the uploaded file.
    -   Optional `source` field for metadata.
    -   Returns `201 Created` with the generated item ID on success. 