# Ingest CLI

This command-line tool sends files to the `ingest-worker` endpoint.

## Setup

1.  Install dependencies:
    ```bash
    npm install
    ```

## Usage

```bash
node index.js --file <path/to/your/file> --url <ingest-worker-url> [--source <optional source description>]
```

-   `--file`: Path to the file you want to upload (required).
-   `--url`: The full URL of the deployed `ingest-worker` (e.g., `https://your-worker.workers.dev/ingest`) (required).
-   `--source`: An optional string describing the source of the file.

**Example:**

```bash
node index.js --file ./my-report.pdf --url https://ingest.example.com/ingest --source "Internal Report Q1"
``` 