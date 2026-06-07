/**
 * Orisup AliExpress Scraper - Background Service Worker
 * Handles API communication, caching, and cross-origin requests
 */

// ── Configuration ────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  orisupBaseUrl: 'http://localhost:5026',
  usdToBdtRate: 120,
  markupMultiplier: 2.0,
  defaultStock: 10,
  defaultStatus: 'draft',
  autoScrape: false,
};

// ── Initialize ───────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings on install
    chrome.storage.sync.set(DEFAULT_SETTINGS);
    console.log('[Orisup Scraper] Extension installed');
  }
});

// ── Side Panel Behavior ──────────────────────────────────────────────────────

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch((err) => {
  console.error('[Orisup Scraper] Failed to set panel behavior:', err);
});

// ── Message Handling ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle proxy API requests from content scripts
  if (request.action === 'proxyRequest') {
    handleProxyRequest(request.config).then(sendResponse).catch(err => {
      sendResponse({ error: err.message });
    });
    return true; // Async response
  }

  // Handle image download requests
  if (request.action === 'downloadImage') {
    downloadImage(request.imageUrl).then(sendResponse).catch(err => {
      sendResponse({ error: err.message });
    });
    return true;
  }

  // Handle saving recent scrapes
  if (request.action === 'saveScrape') {
    saveRecentScrape(request.product).then(sendResponse).catch(err => {
      sendResponse({ error: err.message });
    });
    return true;
  }

  // Handle authentication check
  if (request.action === 'checkAuth') {
    checkOrisupAuth(request.baseUrl).then(sendResponse).catch(err => {
      sendResponse({ error: err.message });
    });
    return true;
  }
});

// ── API Proxy ────────────────────────────────────────────────────────────────

async function handleProxyRequest(config) {
  const { url, method = 'GET', headers = {}, body, credentials = 'include' } = config;

  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials,
  };

  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);
  const responseData = await response.json().catch(() => null);

  return {
    status: response.status,
    ok: response.ok,
    data: responseData,
    headers: Object.fromEntries(response.headers.entries()),
  };
}

// ── Image Download ───────────────────────────────────────────────────────────

async function downloadImage(imageUrl) {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.aliexpress.com/',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);

    return {
      success: true,
      dataUrl,
      size: blob.size,
      type: blob.type,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Recent Scrapes Storage ───────────────────────────────────────────────────

async function saveRecentScrape(product) {
  return new Promise((resolve) => {
    chrome.storage.local.get({ recentScrapes: [] }, ({ recentScrapes }) => {
      // Add new scrape to beginning, limit to 20
      const updated = [
        {
          ...product,
          scrapedAt: new Date().toISOString(),
          status: 'pending',
        },
        ...recentScrapes.filter(s => s.source_url !== product.source_url),
      ].slice(0, 20);

      chrome.storage.local.set({ recentScrapes: updated }, () => {
        resolve({ success: true, count: updated.length });
      });
    });
  });
}

// ── Auth Check ───────────────────────────────────────────────────────────────

async function checkOrisupAuth(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/vendor/me`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return { authenticated: false, vendor: null };
    }

    const data = await response.json();
    return {
      authenticated: true,
      vendor: data.vendor,
      memberRole: data.memberRole,
    };
  } catch (err) {
    return { authenticated: false, error: err.message };
  }
}

// ── Context Menu ─────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'orisup-scrape-page',
    title: 'Scrape with Orisup',
    contexts: ['page'],
    documentUrlPatterns: ['https://*.aliexpress.com/*'],
  });

  chrome.contextMenus.create({
    id: 'orisup-scrape-link',
    title: 'Scrape AliExpress Product with Orisup',
    contexts: ['link'],
    targetUrlPatterns: ['https://*.aliexpress.com/item/*'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'orisup-scrape-page') {
    // Send scrape message to content script
    chrome.tabs.sendMessage(tab.id, { action: 'scrape' }).catch(err => {
      console.error('[Orisup Scraper] Failed to send scrape message:', err);
    });
  } else if (info.menuItemId === 'orisup-scrape-link') {
    // Open the link and scrape
    chrome.tabs.create({ url: info.linkUrl }, (newTab) => {
      // Wait for tab to load then send scrape message
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, { action: 'scrape' }).catch(err => {
              console.error('[Orisup Scraper] Failed to send scrape message:', err);
            });
          }, 3000);
        }
      });
    });
  }
});

// ── Tab Update Handler ───────────────────────────────────────────────────────

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('aliexpress.com/item/')) {
    // Check if auto-scrape is enabled
    chrome.storage.sync.get({ autoScrape: false }, ({ autoScrape }) => {
      if (autoScrape) {
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, { action: 'scrape' }).catch(() => {
            // Content script may not be injected yet
          });
        }, 2500);
      }
    });
  }
});