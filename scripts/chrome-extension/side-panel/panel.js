/**
 * Orisup AliExpress Scraper - Side Panel Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // Handle image load errors globally (CSP-compliant alternative to inline onerror)
  document.addEventListener('error', (e) => {
    if (e.target && e.target.tagName === 'IMG') {
      if (e.target.classList.contains('main-image')) {
        e.target.src = 'https://via.placeholder.com/200x200/1e293b/475569?text=No+Image';
      } else if (e.target.closest('.queue-item') || e.target.closest('.recent-item')) {
        e.target.src = 'https://via.placeholder.com/56x56/1e293b/475569?text=?';
      } else {
        e.target.style.display = 'none';
      }
    }
  }, true);

  // Navigation
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const viewName = item.dataset.view;

      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      views.forEach(v => v.classList.remove('active'));
      document.getElementById(`${viewName}View`).classList.add('active');

      if (viewName === 'queue') {
        loadQueue();
      }
    });
  });

  // Settings
  loadSettings();

  document.getElementById('saveConnectionBtn').addEventListener('click', saveSettings);
  document.getElementById('testConnectionBtn').addEventListener('click', testConnection);

  // Scraper
  document.getElementById('scrapeUrlBtn').addEventListener('click', scrapeFromUrl);
  document.getElementById('productUrl').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') scrapeFromUrl();
  });

  // Queue
  document.getElementById('clearQueueBtn').addEventListener('click', clearQueue);
  document.getElementById('uploadAllBtn').addEventListener('click', uploadAll);

  // Check connection on load
  testConnection();

  // Listen for product updates from content script
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'productScraped') {
      displayProduct(request.product);
      updateQueueBadge();
    }
  });
});

// ── Settings ─────────────────────────────────────────────────────────────────

function loadSettings() {
  chrome.storage.sync.get({
    orisupBaseUrl: 'http://localhost:5026',
    usdToBdtRate: 120,
    markupMultiplier: 2.0,
    defaultStock: 10,
    defaultStatus: 'draft',
    autoScrape: false,
  }, (settings) => {
    document.getElementById('settingBaseUrl').value = settings.orisupBaseUrl;
    document.getElementById('settingRate').value = settings.usdToBdtRate;
    document.getElementById('settingMarkup').value = settings.markupMultiplier;
    document.getElementById('settingStock').value = settings.defaultStock;
    document.getElementById('settingStatus').value = settings.defaultStatus;
    document.getElementById('settingAutoScrape').checked = settings.autoScrape;
  });
}

function saveSettings() {
  chrome.storage.sync.set({
    orisupBaseUrl: document.getElementById('settingBaseUrl').value,
    usdToBdtRate: Number(document.getElementById('settingRate').value),
    markupMultiplier: Number(document.getElementById('settingMarkup').value),
    defaultStock: Number(document.getElementById('settingStock').value),
    defaultStatus: document.getElementById('settingStatus').value,
    autoScrape: document.getElementById('settingAutoScrape').checked,
  }, () => {
    showToast('Settings saved successfully', 'success');
  });
}

async function testConnection() {
  const statusEl = document.getElementById('connectionStatus');
  const baseUrl = document.getElementById('settingBaseUrl').value || 'http://localhost:5026';

  statusEl.className = 'connection-status';
  statusEl.querySelector('.label').textContent = 'Checking...';

  try {
    const response = await fetch(`${baseUrl}/api/vendor/me`, {
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.vendor) {
        statusEl.classList.add('connected');
        statusEl.querySelector('.label').textContent = `Connected: ${data.vendor.name}`;
      } else {
        statusEl.classList.add('error');
        statusEl.querySelector('.label').textContent = 'Not a vendor';
      }
    } else {
      statusEl.classList.add('error');
      statusEl.querySelector('.label').textContent = 'Not authenticated';
    }
  } catch {
    statusEl.classList.add('error');
    statusEl.querySelector('.label').textContent = 'Connection failed';
  }
}

// ── Scraper ──────────────────────────────────────────────────────────────────

async function scrapeFromUrl() {
  const urlInput = document.getElementById('productUrl');
  const url = urlInput.value.trim();

  if (!url || !url.includes('aliexpress.com')) {
    showToast('Please enter a valid AliExpress URL', 'error');
    return;
  }

  const preview = document.getElementById('productPreview');
  preview.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><p>Scraping product...</p></div>';

  try {
    // Open URL in new tab and scrape
    const tab = await chrome.tabs.create({ url, active: false });

    // Wait for page load
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Page load timeout')), 30000);
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    // Wait a bit for dynamic content
    await new Promise(r => setTimeout(r, 3000));

    // Send scrape message to content script
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'scrape' });

    if (response?.success) {
      // Get the product data
      const productResponse = await chrome.tabs.sendMessage(tab.id, { action: 'getProduct' });
      if (productResponse?.product) {
        displayProduct(productResponse.product);
        // Add to queue
        addToQueue(productResponse.product);
      }
      showToast('Product scraped successfully!', 'success');
    } else {
      throw new Error(response?.error || 'Scraping failed');
    }

    // Close the tab
    chrome.tabs.remove(tab.id);

  } catch (err) {
    preview.innerHTML = `
      <div class="empty-state">
        <p style="color: #ef4444;">Scraping failed</p>
        <span>${escapeHtml(err.message)}</span>
      </div>
    `;
    showToast('Scraping failed: ' + err.message, 'error');
  }
}

function displayProduct(product) {
  const preview = document.getElementById('productPreview');
  const settings = getSettingsSync();

  const priceBdt = Math.round(product.original_price_usd * settings.usdToBdtRate);
  const sellingBdt = Math.round(product.original_price_usd * settings.usdToBdtRate * settings.markupMultiplier);

  const mainImage = product.images[0] || '';
  const thumbs = product.images.slice(1, 9);
  const variantTags = product.variants.slice(0, 10).map(v => `
    <span class="variant-tag">
      ${v.image ? `<img src="${v.image}" alt="" />` : ''}
      <span class="v-kind">${v.kind}</span>
      ${v.value}
    </span>
  `).join('');

  preview.innerHTML = `
    <div class="product-card">
      <div class="product-images">
        <img class="main-image" src="${mainImage}" alt="" />
        <div class="image-thumbs">
          ${thumbs.map(img => `<img src="${img}" alt="" />`).join('')}
        </div>
      </div>
      <div class="product-details">
        <h3 class="product-title">${escapeHtml(product.title)}</h3>
        <div class="product-meta">
          <div class="meta-item">
            <div class="label">USD Price</div>
            <div class="value price">$${product.original_price_usd.toFixed(2)}</div>
          </div>
          <div class="meta-item">
            <div class="label">BDT Price</div>
            <div class="value price-bdt">৳${sellingBdt.toLocaleString()}</div>
          </div>
          <div class="meta-item">
            <div class="label">Variants</div>
            <div class="value">${product.variants.length}</div>
          </div>
        </div>
        ${product.variants.length > 0 ? `
        <div>
          <div class="label" style="margin-bottom: 6px;">Variants</div>
          <div class="product-variants">
            ${variantTags}
            ${product.variants.length > 10 ? `<span style="color: #64748b; font-size: 12px;">+${product.variants.length - 10} more</span>` : ''}
          </div>
        </div>
        ` : ''}
        <div class="product-description">
          ${product.description ? stripHtml(product.description).slice(0, 300) + '...' : 'No description'}
        </div>
        <div class="product-actions">
          <button class="btn-primary" id="panelUploadBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Upload to Orisup
          </button>
          <button class="btn-secondary" id="panelAddToQueueBtn">
            Add to Queue
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('panelUploadBtn').addEventListener('click', () => uploadProduct(product));
  document.getElementById('panelAddToQueueBtn').addEventListener('click', () => {
    addToQueue(product);
    showToast('Added to queue', 'success');
  });
}

// ── Queue ────────────────────────────────────────────────────────────────────

async function addToQueue(product) {
  return new Promise((resolve) => {
    chrome.storage.local.get({ queue: [] }, ({ queue }) => {
      // Check if already in queue
      const exists = queue.some(item => item.source_url === product.source_url);
      if (!exists) {
        queue.unshift({
          ...product,
          queueStatus: 'pending',
          queuedAt: new Date().toISOString(),
        });
        chrome.storage.local.set({ queue: queue.slice(0, 50) }, () => {
          updateQueueBadge();
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

function loadQueue() {
  chrome.storage.local.get({ queue: [] }, ({ queue }) => {
    const list = document.getElementById('queueList');
    const badge = document.getElementById('queueBadge');

    badge.textContent = queue.length;
    badge.style.display = queue.length > 0 ? 'block' : 'none';

    if (!queue.length) {
      list.innerHTML = `
        <div class="empty-state">
          <p>Queue is empty</p>
          <span>Scrape products to add them to the queue</span>
        </div>
      `;
      return;
    }

    list.innerHTML = queue.map((item, index) => `
      <div class="queue-item" data-index="${index}">
        <img src="${item.images?.[0] || ''}" alt="" />
        <div class="info">
          <div class="title">${escapeHtml(item.title)}</div>
          <div class="meta">$${item.original_price_usd?.toFixed(2)} • ${item.variants?.length || 0} variants</div>
        </div>
        <span class="status status-${item.queueStatus}">${item.queueStatus}</span>
        <div class="actions">
          <button class="upload" title="Upload" data-index="${index}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
            </svg>
          </button>
          <button class="delete" title="Remove" data-index="${index}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

    // Event listeners
    list.querySelectorAll('.actions .upload').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        uploadQueueItem(index);
      });
    });

    list.querySelectorAll('.actions .delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        removeFromQueue(index);
      });
    });
  });
}

async function uploadQueueItem(index) {
  chrome.storage.local.get({ queue: [] }, async ({ queue }) => {
    if (index >= queue.length) return;

    queue[index].queueStatus = 'uploading';
    chrome.storage.local.set({ queue });
    loadQueue();

    try {
      await uploadProduct(queue[index], false);
      queue[index].queueStatus = 'done';
    } catch {
      queue[index].queueStatus = 'error';
    }

    chrome.storage.local.set({ queue });
    loadQueue();
  });
}

async function uploadAll() {
  chrome.storage.local.get({ queue: [] }, async ({ queue }) => {
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].queueStatus === 'pending' || queue[i].queueStatus === 'error') {
        await uploadQueueItem(i);
        await new Promise(r => setTimeout(r, 1500)); // Rate limiting
      }
    }
  });
}

function removeFromQueue(index) {
  chrome.storage.local.get({ queue: [] }, ({ queue }) => {
    queue.splice(index, 1);
    chrome.storage.local.set({ queue }, () => {
      loadQueue();
      updateQueueBadge();
    });
  });
}

function clearQueue() {
  chrome.storage.local.set({ queue: [] }, () => {
    loadQueue();
    updateQueueBadge();
    showToast('Queue cleared', 'success');
  });
}

function updateQueueBadge() {
  chrome.storage.local.get({ queue: [] }, ({ queue }) => {
    const badge = document.getElementById('queueBadge');
    badge.textContent = queue.length;
    badge.style.display = queue.length > 0 ? 'block' : 'none';
  });
}

// ── Upload ───────────────────────────────────────────────────────────────────

async function uploadProduct(product, showNotifications = true) {
  const settings = await chrome.storage.sync.get({
    orisupBaseUrl: 'http://localhost:5026',
    usdToBdtRate: 120,
    markupMultiplier: 2.0,
    defaultStock: 10,
    defaultStatus: 'draft',
  });

  try {
    // Check auth
    const authRes = await fetch(`${settings.orisupBaseUrl}/api/vendor/me`, {
      credentials: 'include',
    });

    if (!authRes.ok) {
      throw new Error('Not authenticated. Please log in to Orisup.');
    }

    const authData = await authRes.json();
    if (!authData.vendor) {
      throw new Error('You need to be a vendor to upload products.');
    }

    // Prepare payload
    const payload = {
      title: product.title,
      slug: product.slug,
      description: product.description,
      price: String(Math.round(product.original_price_usd * settings.usdToBdtRate * settings.markupMultiplier)),
      compareAtPrice: Math.round(product.original_price_usd * settings.usdToBdtRate * settings.markupMultiplier * 1.3) || null,
      stock: settings.defaultStock,
      images: product.images.slice(0, 10),
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

    const res = await fetch(`${settings.orisupBaseUrl}/api/vendor/products`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

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

    if (showNotifications) {
      showToast(`Uploaded! ID: ${data.id?.slice(0, 8)}...`, 'success');
    }

    return data;
  } catch (err) {
    if (showNotifications) {
      showToast('Upload failed: ' + err.message, 'error');
    }
    throw err;
  }
}

// ── Utilities ────────────────────────────────────────────────────────────────

function getSettingsSync() {
  // Return defaults - actual values loaded asynchronously
  return {
    orisupBaseUrl: 'http://localhost:5026',
    usdToBdtRate: 120,
    markupMultiplier: 2.0,
    defaultStock: 10,
    defaultStatus: 'draft',
  };
}

function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}