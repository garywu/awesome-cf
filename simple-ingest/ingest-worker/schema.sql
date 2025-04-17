-- Cloudflare D1 Schema for Simple Ingest

-- Drop the table if it already exists (useful for development/migration)
DROP TABLE IF EXISTS ingested_items;

-- Create the main table to store metadata about ingested files
CREATE TABLE ingested_items (
    id TEXT PRIMARY KEY NOT NULL,         -- Unique identifier for the ingested item (e.g., UUID)
    r2_object_key TEXT NOT NULL UNIQUE,   -- The key (path) of the object stored in the R2 bucket
    filename TEXT NOT NULL,               -- Original filename provided during upload
    size INTEGER NOT NULL,                -- File size in bytes
    content_type TEXT NOT NULL,           -- MIME type of the file (e.g., 'video/mp4', 'application/json')
    source TEXT,                          -- Optional description of where the file came from
    ingested_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) -- Timestamp (ISO 8601 format) when the item was ingested
);

-- Optional: Create indexes for faster querying based on common lookup fields
-- CREATE INDEX IF NOT EXISTS idx_ingested_items_source ON ingested_items(source);
-- CREATE INDEX IF NOT EXISTS idx_ingested_items_content_type ON ingested_items(content_type);
-- CREATE INDEX IF NOT EXISTS idx_ingested_items_ingested_at ON ingested_items(ingested_at);

-- Create the uploads table
CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    key TEXT NOT NULL,
    type TEXT,
    size INTEGER,
    source TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    author_username TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS post_tags (
    post_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (post_id, tag),
    FOREIGN KEY (post_id) REFERENCES posts(id)
); 