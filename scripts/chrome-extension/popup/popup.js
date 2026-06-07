/**
 * Orisup AliExpress Scraper - Popup Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // Handle image load errors globally (CSP-compliant alternative to inline onerror)
  document.addEventListener('error', (e) => {
    if (e.target && e.target.tagName === 'IMG') {
      e.target.src = 'https://via.placeholder.com/40x40/1e293b/475569?text=?';
    }
  }, true);

  // Elements
  const scrapeBtn = document.getElementById('scrapeBtn');
  const uploadBtn = document.getElementById('uploadBtn');
  const togglePanelBtn = document.getElementById('togglePanelBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const cancelSettings = document.getElementById('cancelSettings');
  const saveSettings = document.getElementById('saveSettings');
  const statusLabel = document.getElementById('statusLabel');
  const statusDetail = document.getElementById('statusDetail');
  const statusDot = document.querySelector('.status-dot');
  const recentList = document.getElementById('recentList');
  const openSidePanel = document.getElementById('openSidePanel');

  // Load settings
  chrome.storage.sync.get({
    orisupBaseUrl: 'http://localhost:5026',
    usdToBdtRate: 120,
    markupMultiplier: 2.0,
    defaultStock: 10,
    defaultStatus: 'draft',
    autoScrape: false,
  }, (settings) => {
    document.getElementById('baseUrl').value = settings.orisupBaseUrl;
    document.getElementById('usdToBdt').value = settings.usdToBdtRate;
    document.getElementById('markup').value = settings.markupMultiplier;
    document.getElementById('defaultStock').value = settings.defaultStock;
    document.getElementById('defaultStatus').value = settings.defaultStatus;
    document.getElementById('autoScrape').checked = settings.autoScrape;
  });

  // Load recent scrapes
  loadRecentScrapes();

  // Check current tab
  checkCurrentTab();

  // Event Listeners
  scrapeBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    scrapeBtn.disabled = true;
    scrapeBtn.innerHTML = `<div class="spinner" style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.2);border-top-color:white;border-radius:50%;animation:spin 0.8s linear infinite;"></div> Scraping...`;

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'scrape' });
      if (response?.success) {
        statusLabel.textContent = 'Scraped!';
        statusDetail.textContent = 'Product data captured';
        statusDot.className = 'status-dot active';
        uploadBtn.disabled = false;
        loadRecentScrapes();
      } else {
        throw new Error(response?.error || 'Scraping failed');
      }
    } catch (err) {
      statusLabel.textContent = 'Error';
      statusDetail.textContent = err.message;
      statusDot.className = 'status-dot warning';
    } finally {
      scrapeBtn.disabled = false;
      scrapeBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        Scrape Product
      `;
    }
  });

  uploadBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    uploadBtn.disabled = true;
    uploadBtn.innerHTML = `<div class="spinner" style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.2);border-top-color:white;border-radius:50%;animation:spin 0.8s linear infinite;"></div> Uploading...`;

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'upload' });
      if (response?.success) {
        statusLabel.textContent = 'Uploaded!';
        statusDetail.textContent = 'Product sent to Orisup';
        statusDot.className = 'status-dot active';
      } else {
        throw new Error(response?.error || 'Upload failed');
      }
    } catch (err) {
      statusLabel.textContent = 'Upload Error';
      statusDetail.textContent = err.message;
      statusDot.className = 'status-dot warning';
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        Upload
      `;
    }
  });

  togglePanelBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
      statusLabel.textContent = response?.open ? 'Panel Open' : 'Panel Closed';
    } catch {
      statusLabel.textContent = 'Not on AliExpress';
      statusDot.className = 'status-dot inactive';
    }
  });

  settingsBtn.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'flex' : 'none';
  });

  cancelSettings.addEventListener('click', () => {
    settingsPanel.style.display = 'none';
  });

  saveSettings.addEventListener('click', () => {
    chrome.storage.sync.set({
      orisupBaseUrl: document.getElementById('baseUrl').value,
      usdToBdtRate: Number(document.getElementById('usdToBdt').value),
      markupMultiplier: Number(document.getElementById('markup').value),
      defaultStock: Number(document.getElementById('defaultStock').value),
      defaultStatus: document.getElementById('defaultStatus').value,
      autoScrape: document.getElementById('autoScrape').checked,
    }, () => {
      settingsPanel.style.display = 'none';
      statusLabel.textContent = 'Settings Saved';
      statusDetail.textContent = 'Configuration updated';
      setTimeout(() => checkCurrentTab(), 1500);
    });
  });

  openSidePanel.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  });

  // Functions
  async function checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url?.includes('aliexpress.com') && tab.url.includes('/item/')) {
        statusLabel.textContent = 'Product Page';
        statusDetail.textContent = 'Ready to scrape';
        statusDot.className = 'status-dot active';
        scrapeBtn.disabled = false;
      } else if (tab?.url?.includes('aliexpress.com')) {
        statusLabel.textContent = 'On AliExpress';
        statusDetail.textContent = 'Open a product page';
        statusDot.className = 'status-dot warning';
        scrapeBtn.disabled = true;
      } else {
        statusLabel.textContent = 'Not on AliExpress';
        statusDetail.textContent = 'Navigate to aliexpress.com';
        statusDot.className = 'status-dot inactive';
        scrapeBtn.disabled = true;
      }
    } catch {
      statusLabel.textContent = 'Unknown';
      statusDetail.textContent = 'Cannot access tab';
    }
  }

  function loadRecentScrapes() {
    chrome.storage.local.get({ recentScrapes: [] }, ({ recentScrapes }) => {
      if (!recentScrapes.length) {
        recentList.innerHTML = '<p class="empty-state">No products scraped yet</p>';
        return;
      }

      recentList.innerHTML = recentScrapes.slice(0, 5).map(item => `
        <div class="recent-item" data-url="${item.source_url}">
          <img src="${item.images?.[0] || ''}" alt="" />
          <div class="info">
            <div class="title">${escapeHtml(item.title)}</div>
            <div class="meta">$${item.original_price_usd?.toFixed(2) || '0.00'}</div>
          </div>
          <span class="status status-${item.status || 'pending'}">${item.status || 'pending'}</span>
        </div>
      `).join('');

      // Add click handlers
      recentList.querySelectorAll('.recent-item').forEach(el => {
        el.addEventListener('click', () => {
          chrome.tabs.create({ url: el.dataset.url });
        });
      });
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});