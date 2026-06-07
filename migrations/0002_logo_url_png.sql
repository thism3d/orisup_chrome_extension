-- Replace legacy SVG logo path with PNG (orlenbd-logo.png ships in client/public).
UPDATE platform_settings
SET value = REPLACE(value, 'orlenbd-logo.svg', 'orlenbd-logo.png')
WHERE key = 'logo_url'
  AND value ILIKE '%orlenbd-logo.svg%';
