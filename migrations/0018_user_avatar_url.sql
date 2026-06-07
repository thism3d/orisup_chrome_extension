-- Public profile image URL (upload path or OAuth CDN URL).
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
