-- Rename mega-store layout id forexbd → orynbd (platform_settings + any env already uses orynbd for new installs).
UPDATE platform_settings
SET value = 'orynbd'
WHERE key = 'storefront_ui_template'
  AND value IN ('forexbd', 'template3', 'showcase');
