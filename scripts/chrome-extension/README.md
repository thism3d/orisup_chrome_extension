# Orisup AliExpress Scraper - Chrome Extension

A Chrome Extension that scrapes product data from AliExpress and uploads directly to your [Orisup](https://github.com/thism3d/orisup) store.

## Features

- **One-Click Scraping** - Automatically extracts product title, price, images, description, variants, and specifications from any AliExpress product page
- **Real-Time Price Conversion** - Converts USD prices to BDT with configurable exchange rates and markup multipliers
- **Direct Upload** - Uploads products directly to your Orisup vendor account via API
- **Floating Panel** - Elegant dark-themed floating panel on AliExpress pages for quick access
- **Upload Queue** - Queue multiple products and batch upload them
- **Side Panel** - Full-featured side panel for managing scrapes and queue
- **Auto-Scrape** - Optional automatic scraping when opening product pages
- **Context Menu** - Right-click on any AliExpress product link to scrape

## File Structure

```
chrome-extension/
├── manifest.json                          # Extension manifest (MV3)
├── README.md                              # This file
├── background/
│   └── service-worker.js                  # Service worker for API proxy, auth, context menus
├── content-scripts/
│   ├── aliexpress-scraper.js              # Main content script for AliExpress pages
│   └── scraper-panel.css                  # Styles for floating panel
├── lib/
│   └── scraper-core.js                    # Shared scraping utilities
├── popup/
│   ├── popup.html                         # Extension popup UI
│   ├── popup.css                          # Popup styles
│   └── popup.js                           # Popup logic
├── side-panel/
│   ├── panel.html                         # Side panel UI
│   ├── panel.css                          # Side panel styles
│   └── panel.js                           # Side panel logic
└── icons/
    ├── icon16.png                         # Extension icons
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Installation

### Method 1: Developer Mode (Recommended for Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `chrome-extension` folder from this directory
5. The extension icon should appear in your Chrome toolbar

### Method 2: Building a CRX (For Distribution)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Pack extension**
4. Select the `chrome-extension` folder
5. The `.crx` file will be generated for distribution

## Configuration

### 1. Set Your Orisup Base URL

Click the extension icon and open **Settings**:

- **Orisup Base URL**: Your Orisup instance URL (e.g., `http://localhost:3000` for local development, or `https://your-domain.com` for production)

### 2. Configure Pricing

- **USD → BDT Rate**: Exchange rate (default: 120)
- **Markup Multiplier**: Selling price multiplier (default: 2.0x)
  - Example: Product costs $10 → 10 × 120 × 2.0 = ৳2,400 selling price

### 3. Set Product Defaults

- **Default Stock**: Stock quantity for uploaded products (default: 10)
- **Default Status**: `draft` or `active`
- **Auto-scrape**: Automatically scrape when opening product pages

### 4. Authentication

Make sure you are logged into your Orisup vendor account. The extension uses your existing session cookies to authenticate API requests.

## Usage

### Scraping a Product

**Method 1 - Floating Panel (Recommended):**
1. Navigate to any AliExpress product page (e.g., `aliexpress.com/item/1234567890.html`)
2. The floating panel will appear automatically (if auto-scrape is enabled)
3. Or click the blue floating action button (FAB) in the bottom-right corner
4. The panel will show scraped product data including:
   - Product title and slug
   - Price in USD and converted BDT selling price
   - Image gallery with thumbnails
   - Variant options (color, size, etc.)
   - Product specifications

**Method 2 - Side Panel:**
1. Open the side panel (click "Open Side Panel" in the popup)
2. Paste an AliExpress product URL in the input field
3. Click "Scrape"

**Method 3 - Context Menu:**
1. Right-click on any AliExpress product link
2. Select "Scrape AliExpress Product with Orisup"

### Uploading to Orisup

1. After scraping, click the **"Upload to Orisup"** button
2. The extension will:
   - Verify you're authenticated as a vendor
   - Match the product to an appropriate category
   - Upload the product with all data (title, description, images, variants, specs)
3. You'll see a success message with the new product ID

### Using the Queue

1. Scrape multiple products using any method
2. Add them to the queue with "Add to Queue"
3. Go to the **Queue** tab in the side panel
4. Click **"Upload All"** to batch upload

## API Integration

The extension integrates with the following Orisup API endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/vendor/me` | GET | Check vendor authentication |
| `/api/vendor/products` | POST | Create new product |
| `/api/categories` | GET | List categories for matching |

The extension sends the following product payload:

```json
{
  "title": "Product Title",
  "slug": "product-title",
  "description": "<html>Product description...</html>",
  "price": "2400",
  "compareAtPrice": "3120",
  "stock": 10,
  "images": ["/uploads/image1.jpg", "/uploads/image2.jpg"],
  "status": "draft",
  "keyFeaturesJson": { "en": "Product Title", "bn": "" },
  "specificationsJson": [{ "label": "Brand", "value": "Example" }],
  "generalInfoJson": { "en": "Description", "bn": "" },
  "variants": [
    {
      "kind": "color",
      "name": "Color",
      "value": "Red",
      "price": "2400",
      "stock": 10,
      "sortOrder": 0
    }
  ]
}
```

## Permissions

The extension requires the following permissions:

- **activeTab**: Interact with the current AliExpress page
- **storage**: Save settings and queue data
- **scripting**: Inject scraper code
- **sidePanel**: Open the side panel
- **host_permissions**: Access AliExpress and your Orisup instance

## Data Storage

All data is stored locally in your browser:

- **chrome.storage.sync**: Settings (synced across devices)
- **chrome.storage.local**: Scraped products queue

No data is sent to any third-party servers except your configured Orisup instance.

## Troubleshooting

### Extension not working on AliExpress

1. Make sure you're on a product page URL containing `/item/`
2. Check that the extension has permission for `aliexpress.com`
3. Try refreshing the page

### Authentication errors

1. Log into your Orisup account
2. Ensure you have vendor privileges
3. Check that the Base URL in settings is correct

### Upload fails

1. Verify you're authenticated: click "Test Connection" in Settings
2. Check browser console for error details
3. Ensure your Orisup API is accessible from the browser

## Development

### Making Changes

1. Edit the source files in the `chrome-extension` directory
2. Go to `chrome://extensions/` and click the refresh icon on the extension card
3. Changes are applied immediately

### Debug Mode

1. Click the **background page** link on the extension card to debug the service worker
2. Use Chrome DevTools on AliExpress pages to debug content scripts
3. Check the Console for scraping logs

## License

This project is part of the Orisup platform. See the main repository for licensing information.