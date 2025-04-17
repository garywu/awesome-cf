-- Create posts table
CREATE TABLE posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    author_username TEXT NOT NULL,
    content TEXT NOT NULL,  -- JSON string containing text and media URLs
    timestamp TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create tags table
CREATE TABLE post_tags (
    post_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag)
);

-- Create indexes
CREATE INDEX idx_posts_timestamp ON posts(timestamp DESC);
CREATE INDEX idx_post_tags_tag ON post_tags(tag); 