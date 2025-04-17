# Ingest CLI

This command-line tool sends files to the `ingest-worker` endpoint.

## Setup

1.  Install dependencies:
    ```bash
    npm install
    ```

## Usage

The CLI supports two types of uploads: simple file uploads and post uploads with metadata.

### Simple File Upload

```bash
node index.js --file <path/to/your/file> --url <ingest-worker-url> [--source <optional source description>]
```

-   `--file`: Path to the file you want to upload (required).
-   `--url`: The full URL of the deployed `ingest-worker` (e.g., `https://your-worker.workers.dev/api/ingest`) (required).
-   `--source`: An optional string describing the source of the file.
-   `--type`: Set to "simple" (default) for basic file uploads

**Example:**

```bash
node index.js --file ./my-report.pdf --url https://ingest.example.com/api/ingest --source "Internal Report Q1"
```

### Post Upload with Metadata

```bash
node index.js --file <path/to/your/file> --url <ingest-worker-url> --type post --text <post text> --author-id <id> --author-username <username> [--tags <tag1,tag2>]
```

-   `--file`: Path to the file to attach to the post (required).
-   `--url`: The full URL of the deployed `ingest-worker` (required).
-   `--type`: Set to "post" for creating a post with metadata.
-   `--text`: The text content of the post (required for post type).
-   `--author-id`: The ID of the post author (required for post type).
-   `--author-username`: The username of the post author (required for post type).
-   `--tags`: Optional comma-separated list of tags.

**Example:**

```bash
node index.js \
  --file ./image.jpg \
  --url https://ingest.example.com/api/ingest \
  --type post \
  --text "Check out this amazing photo!" \
  --author-id "user123" \
  --author-username "john_doe" \
  --tags "photo,nature,amazing"
```

## Response Format

### Simple Upload Response
```json
{
  "success": true,
  "file": {
    "key": "uploads/1234567890-filename.ext",
    "name": "filename.ext",
    "type": "application/octet-stream",
    "size": 12345
  }
}
```

### Post Upload Response
```json
{
  "success": true,
  "post": {
    "id": "generated-uuid",
    "author": {
      "id": "user123",
      "username": "john_doe"
    },
    "content": {
      "text": "Check out this amazing photo!",
      "media": [
        {
          "type": "image/jpeg",
          "url": "media/generated-uuid/image.jpg"
        }
      ]
    },
    "timestamp": "2024-03-21T12:00:00Z",
    "tags": ["photo", "nature", "amazing"]
  }
}
``` 