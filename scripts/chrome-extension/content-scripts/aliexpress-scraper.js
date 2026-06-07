/**
 * Orisup AliExpress Scraper - Content Script
 * Runs on AliExpress product pages to scrape and upload products
 */

(function() {
  'use strict';

  // Prevent double-injection
  if (window.__ORISUP_SCRAPER_ACTIVE__) return;
  window.__ORISUP_SCRAPER_ACTIVE__ = true;

  let panelEl = null;
  let fabEl = null;
  let toastEl = null;
  let currentProduct = null;
  let isPanelOpen = false;

  // ── Settings ─────────────────────────────────────────────────────────────────

  async function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get({
        orisupBaseUrl: 'http://localhost:5026',
        usdToBdtRate: 120,
        markupMultiplier: 2.0,
        autoScrape: false,
        defaultStock: 10,
        defaultStatus: 'draft',
      }, resolve);
    });
  }

  // ── Toast Notifications ──────────────────────────────────────────────────────

  function showToast(message, type = 'info', duration = 3000) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'orisup-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.className = `orisup-toast ${type} show`;
    setTimeout(() => {
      toastEl.classList.remove('show');
    }, duration);
  }

  // ── Panel UI ─────────────────────────────────────────────────────────────────

  function createPanel() {
    if (panelEl) return;

    panelEl = document.createElement('div');
    panelEl.id = 'orisup-scraper-panel';
    panelEl.className = 'collapsed';
    panelEl.innerHTML = `
      <div class="orisup-panel-header" id="orisupPanelHeader">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          Orisup Scraper
          <span class="orisup-badge">ALI</span>
        </h3>
        <div class="orisup-panel-controls">
          <button id="orisupMinimize" title="Minimize">−</button>
          <button id="orisupClose" title="Close">✕</button>
        </div>
      </div>
      <div class="orisup-panel-body" id="orisupPanelBody">
        <div class="orisup-loading" id="orisupLoading">
          <div class="orisup-spinner"></div>
          <span>Scraping product data...</span>
        </div>
        <div id="orisupContent" style="display: none;"></div>
      </div>
    `;
    document.body.appendChild(panelEl);

    // Header click to minimize
    document.getElementById('orisupPanelHeader').addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      panelEl.classList.toggle('minimized');
    });

    document.getElementById('orisupMinimize').addEventListener('click', () => {
      panelEl.classList.toggle('minimized');
    });

    document.getElementById('orisupClose').addEventListener('click', () => {
      panelEl.classList.add('collapsed');
      isPanelOpen = false;
    });
  }

  function createFab() {
    if (fabEl) return;
    fabEl = document.createElement('button');
    fabEl.className = 'orisup-fab';
    fabEl.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
    `;
    fabEl.title = 'Open Orisup Scraper';
    fabEl.addEventListener('click', () => {
      if (isPanelOpen) {
        panelEl.classList.add('collapsed');
        isPanelOpen = false;
      } else {
        panelEl.classList.remove('collapsed');
        panelEl.classList.remove('minimized');
        isPanelOpen = true;
        if (!currentProduct) {
          scrapeAndDisplay();
        }
      }
    });
    document.body.appendChild(fabEl);
  }

  // ── Render Product Data ──────────────────────────────────────────────────────

  async function renderProduct(product) {
    const settings = await getSettings();
    const content = document.getElementById('orisupContent');
    const loading = document.getElementById('orisupLoading');

    // Calculate prices
    const priceBdt = Math.round(product.original_price_usd * settings.usdToBdtRate);
    const sellingBdt = Math.round(product.original_price_usd * settings.usdToBdtRate * settings.markupMultiplier);
    const compareAtBdt = sellingBdt > priceBdt ? Math.round(sellingBdt * 1.3) : 0;

    product.original_price_bdt = priceBdt;
    product.selling_price_bdt = sellingBdt;
    product.compare_at_price_bdt = compareAtBdt;

    const imageHtml = product.images.slice(0, 8).map(img =>
      `<img src="${img}" alt="" />`
    ).join('');

    const variantHtml = product.variants.length > 0
      ? product.variants.slice(0, 10).map(v => `
        <div class="orisup-variant-item">
          ${v.image ? `<img src="${v.image}" alt="" />` : '<div style="width:28px;height:28px;background:rgba(255,255,255,0.06);border-radius:4px;"></div>'}
          <span class="v-kind">${v.kind}</span>
          <span class="v-value">${v.value}</span>
        </div>
      `).join('')
      : '<p style="color: #64748b; font-size: 12px; margin: 0;">No variants found</p>';

    const specCount = product.specifications.length;

    content.innerHTML = `
      <div class="orisup-section">
        <h4>Product</h4>
        <p class="orisup-product-title">${escapeHtml(product.title)}</p>
      </div>

      <div class="orisup-section">
        <h4>Pricing</h4>
        <div class="orisup-price-row">
          <span class="orisup-price">$${product.original_price_usd.toFixed(2)}</span>
          <span class="orisup-price-converted">৳${sellingBdt.toLocaleString()} selling</span>
        </div>
      </div>

      <div class="orisup-section">
        <h4>Images (${product.images.length})</h4>
        <div class="orisup-image-grid">
          ${imageHtml}
        </div>
      </div>

      <div class="orisup-section">
        <h4>Details</h4>
        <div class="orisup-meta-grid">
          <div class="orisup-meta-item">
            <span class="label">Product ID</span>
            <span class="value">${product.ali_product_id || 'N/A'}</span>
          </div>
          <div class="orisup-meta-item">
            <span class="label">Variants</span>
            <span class="value">${product.variants.length}</span>
          </div>
          <div class="orisup-meta-item">
            <span class="label">Specifications</span>
            <span class="value">${specCount}</span>
          </div>
          <div class="orisup-meta-item">
            <span class="label">Slug</span>
            <span class="value" style="font-size: 10px;">${product.slug}</span>
          </div>
        </div>
      </div>

      ${product.variants.length > 0 ? `
      <div class="orisup-section">
        <h4>Variants</h4>
        <div class="orisup-variant-list">
          ${variantHtml}
        </div>
        ${product.variants.length > 10 ? `<p style="color: #64748b; font-size: 11px; margin: 4px 0 0;">+${product.variants.length - 10} more variants</p>` : ''}
      </div>
      ` : ''}

      <div class="orisup-actions">
        <button class="orisup-btn orisup-btn-secondary" id="orisupRefreshBtn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          Refresh
        </button>
        <button class="orisup-btn orisup-btn-success" id="orisupSettingsBtn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Settings
        </button>
        <button class="orisup-btn orisup-btn-primary" id="orisupUploadBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Upload to Orisup
        </button>
      </div>
    `;

    loading.style.display = 'none';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '14px';

    // Event listeners
    document.getElementById('orisupRefreshBtn').addEventListener('click', scrapeAndDisplay);
    document.getElementById('orisupUploadBtn').addEventListener('click', () => uploadProduct(product));
    document.getElementById('orisupSettingsBtn').addEventListener('click', showSettings);
  }

  function showSettings() {
    const content = document.getElementById('orisupContent');
    const loading = document.getElementById('orisupLoading');
    loading.style.display = 'none';
    content.style.display = 'block';

    chrome.storage.sync.get({
      orisupBaseUrl: 'http://localhost:5026',
      usdToBdtRate: 120,
      markupMultiplier: 2.0,
      defaultStock: 10,
      defaultStatus: 'draft',
    }, (settings) => {
      content.innerHTML = `
        <div class="orisup-section">
          <h4>Orisup API Settings</h4>
          <div class="orisup-settings-form">
            <div class="orisup-form-group">
              <label>Orisup Base URL</label>
              <input type="text" id="settingBaseUrl" value="${settings.orisupBaseUrl}" placeholder="http://localhost:5026" />
            </div>
            <div class="orisup-form-group">
              <label>USD to BDT Rate</label>
              <input type="number" id="settingRate" value="${settings.usdToBdtRate}" />
            </div>
            <div class="orisup-form-group">
              <label>Markup Multiplier</label>
              <input type="number" id="settingMarkup" value="${settings.markupMultiplier}" step="0.1" />
            </div>
            <div class="orisup-form-group">
              <label>Default Stock</label>
              <input type="number" id="settingStock" value="${settings.defaultStock}" />
            </div>
            <div class="orisup-form-group">
              <label>Default Status</label>
              <select id="settingStatus">
                <option value="draft" ${settings.defaultStatus === 'draft' ? 'selected' : ''}>Draft</option>
                <option value="active" ${settings.defaultStatus === 'active' ? 'selected' : ''}>Active</option>
              </select>
            </div>
          </div>
        </div>
        <div class="orisup-actions">
          <button class="orisup-btn orisup-btn-secondary" id="orisupBackBtn">← Back</button>
          <button class="orisup-btn orisup-btn-primary" id="orisupSaveSettingsBtn">Save Settings</button>
        </div>
      `;

      document.getElementById('orisupBackBtn').addEventListener('click', () => {
        if (currentProduct) renderProduct(currentProduct);
      });

      document.getElementById('orisupSaveSettingsBtn').addEventListener('click', () => {
        chrome.storage.sync.set({
          orisupBaseUrl: document.getElementById('settingBaseUrl').value,
          usdToBdtRate: Number(document.getElementById('settingRate').value),
          markupMultiplier: Number(document.getElementById('settingMarkup').value),
          defaultStock: Number(document.getElementById('settingStock').value),
          defaultStatus: document.getElementById('settingStatus').value,
        }, () => {
          showToast('Settings saved!', 'success');
          if (currentProduct) renderProduct(currentProduct);
        });
      });
    });
  }

  // ── Scrape ───────────────────────────────────────────────────────────────────

  async function scrapeAndDisplay() {
    const loading = document.getElementById('orisupLoading');
    const content = document.getElementById('orisupContent');
    if (loading) loading.style.display = 'flex';
    if (content) content.style.display = 'none';

    try {
      // Wait for dynamic content
      await waitForProductContent();

      const product = await window.OrisupScraper.scrapeAliExpressProduct();
      currentProduct = product;
      await renderProduct(product);
      showToast('Product scraped successfully!', 'success');
    } catch (err) {
      console.error('[Orisup Scraper]', err);
      if (loading) loading.style.display = 'none';
      if (content) {
        content.style.display = 'block';
        content.innerHTML = `
          <div class="orisup-section" style="border-color: rgba(239,68,68,0.3);">
            <h4 style="color: #ef4444;">Scraping Failed</h4>
            <p style="color: #94a3b8; font-size: 13px;">${escapeHtml(err.message)}</p>
            <button class="orisup-btn orisup-btn-secondary" style="margin-top: 10px;" onclick="document.getElementById('orisupRefreshBtn')?.click()">
              Try Again
            </button>
          </div>
        `;
      }
      showToast('Scraping failed: ' + err.message, 'error');
    }
  }

  async function waitForProductContent() {
    return new Promise((resolve) => {
      let attempts = 0;
      const check = () => {
        attempts++;
        const hasTitle = document.querySelector('h1')?.textContent?.length > 5;
        const hasPrice = document.querySelector('.price, [data-role="price"], .product-price, [itemprop="price"]');
        if ((hasTitle && hasPrice) || attempts > 30) {
          resolve();
        } else {
          setTimeout(check, 500);
        }
      };
      check();
    });
  }

  // ── Upload ───────────────────────────────────────────────────────────────────

  async function uploadProduct(product) {
    const settings = await getSettings();
    const uploadBtn = document.getElementById('orisupUploadBtn');
    if (uploadBtn) {
      uploadBtn.disabled = true;
      uploadBtn.innerHTML = `<div class="orisup-spinner" style="width:16px;height:16px;border-width:2px;"></div> Uploading...`;
    }

    const proxyFetch = (url, config = {}) => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'proxyRequest',
          config: { url, ...config }
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!response) {
            reject(new Error('No response from background proxy'));
          } else if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });
    };

    try {
      // First check if user is authenticated with Orisup
      const authRes = await proxyFetch(`${settings.orisupBaseUrl}/api/vendor/me`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!authRes.ok) {
        throw new Error('Not authenticated with Orisup. Please log in to your Orisup vendor account first.');
      }

      const authData = authRes.data;
      if (!authData || !authData.vendor) {
        throw new Error('You need to be a registered vendor on Orisup to upload products.');
      }

      // Prepare upload payload matching the vendor API schema
      const payload = {
        title: product.title,
        slug: product.slug,
        description: product.description,
        price: String(product.selling_price_bdt),
        compareAtPrice: product.compare_at_price_bdt > 0 ? String(product.compare_at_price_bdt) : null,
        stock: settings.defaultStock,
        images: product.images.slice(0, 10), // Send URLs, backend will handle
        status: settings.defaultStatus,
        keyFeaturesJson: { en: product.title, bn: '' },
        specificationsJson: product.specifications,
        generalInfoJson: { en: product.description, bn: '' },
        variants: product.variants.map((v, i) => ({
          kind: v.kind,
          name: v.name,
          value: v.value,
          price: String(Math.round(v.price_usd * settings.usdToBdtRate * settings.markupMultiplier)),
          stock: settings.defaultStock,
          sortOrder: i,
        })),
      };

      const res = await proxyFetch(`${settings.orisupBaseUrl}/api/vendor/products`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });

      const data = res.data;

      if (!res.ok) {
        let errMsg = 'Upload failed';
        if (data && data.error) {
          if (typeof data.error === 'string') {
            errMsg = data.error;
          } else if (data.error.message) {
            errMsg = data.error.message;
          } else if (data.error.fieldErrors) {
            const errors = [];
            for (const [field, messages] of Object.entries(data.error.fieldErrors)) {
              errors.push(`${field}: ${messages.join(', ')}`);
            }
            if (errors.length) errMsg = errors.join('; ');
          } else {
            errMsg = JSON.stringify(data.error);
          }
        }
        throw new Error(errMsg);
      }

      showToast(`✅ Uploaded! Product ID: ${data.id || 'N/A'}`, 'success', 5000);

      // Reset button
      if (uploadBtn) {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Uploaded Successfully
        `;
        uploadBtn.classList.remove('orisup-btn-primary');
        uploadBtn.classList.add('orisup-btn-success');
      }
    } catch (err) {
      console.error('[Orisup Upload]', err);
      showToast('Upload failed: ' + err.message, 'error', 5000);

      if (uploadBtn) {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Upload to Orisup
        `;
      }
    }
  }

  // ── Utility ──────────────────────────────────────────────────────────────────

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ── Initialize ───────────────────────────────────────────────────────────────

  function init() {
    // Handle image load errors globally inside scraper panel (CSP-compliant alternative to inline onerror)
    document.addEventListener('error', (e) => {
      if (e.target && e.target.tagName === 'IMG' && e.target.closest('#orisup-scraper-panel')) {
        e.target.style.display = 'none';
      }
    }, true);

    // Only run on product pages
    if (!window.location.href.match(/\/item\/\d+/)) {
      return;
    }

    createPanel();
    createFab();

    // Auto-scrape if enabled
    chrome.storage.sync.get({ autoScrape: false }, ({ autoScrape }) => {
      if (autoScrape) {
        setTimeout(() => {
          panelEl.classList.remove('collapsed');
          panelEl.classList.remove('minimized');
          isPanelOpen = true;
          scrapeAndDisplay();
        }, 2000);
      }
    });

    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'scrape') {
        scrapeAndDisplay().then(() => sendResponse({ success: true })).catch(e => sendResponse({ success: false, error: e.message }));
        return true;
      }
      if (request.action === 'getProduct') {
        sendResponse({ product: currentProduct });
      }
      if (request.action === 'upload') {
        if (currentProduct) {
          uploadProduct(currentProduct).then(() => sendResponse({ success: true })).catch(e => sendResponse({ success: false, error: e.message }));
          return true;
        } else {
          sendResponse({ success: false, error: 'No product scraped yet' });
        }
      }
      if (request.action === 'togglePanel') {
        if (isPanelOpen) {
          panelEl.classList.add('collapsed');
          isPanelOpen = false;
        } else {
          panelEl.classList.remove('collapsed');
          panelEl.classList.remove('minimized');
          isPanelOpen = true;
          if (!currentProduct) scrapeAndDisplay();
        }
        sendResponse({ open: isPanelOpen });
      }
    });
  }

  // Wait for page to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();