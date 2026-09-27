/**
 * BUILD LAB — USER INTERFACE & RENDERING MODULE
 */

const Ui = {
  currentModalUrl: '',
  currentDeviceMode: 'desktop',
  isLandscape: false,

  init() {
    this.applyTheme(State.activeTheme);
  },

  applyTheme(themeName) {
    State.activeTheme = themeName;
    localStorage.setItem('build_lab_theme', themeName);

    document.body.className = document.body.className
      .replace(/theme-\w+/g, '')
      .trim();

    if (themeName !== 'matrix') {
      document.body.classList.add(`theme-${themeName}`);
    }

    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === themeName);
    });
  },

  showToast(message, type = 'ok') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'ok' ? '✓' : '⚠'}</span> <span>${this.esc(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  },

  esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  screenshotUrl(url) {
    return `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
  },

  // ── Render Master ─────────────────────────────────────────────────────────
  render() {
    const sites = State.getFilteredSites();
    const allMerged = State.getMergedSites();

    // 1. Update Counts
    const siteCountEl = document.getElementById('stat-count');
    if (siteCountEl) siteCountEl.textContent = sites.length;

    const totalCountEl = document.getElementById('count-all');
    if (totalCountEl) totalCountEl.textContent = allMerged.length;

    const pinnedCountEl = document.getElementById('count-pinned');
    if (pinnedCountEl) pinnedCountEl.textContent = allMerged.filter(s => s.pinned).length;

    const liveCountEl = document.getElementById('count-live');
    if (liveCountEl) liveCountEl.textContent = allMerged.filter(s => s.isLive).length;

    const pagesCountEl = document.getElementById('count-pages');
    if (pagesCountEl) pagesCountEl.textContent = allMerged.filter(s => s.hasPages).length;

    const customCountEl = document.getElementById('count-custom');
    if (customCountEl) customCountEl.textContent = allMerged.filter(s => !s.isGh).length;

    // 2. Render Tag Ribbon
    this.renderTagRibbon();

    // 3. Render Main View (Grid or Compact List)
    const mainContainer = document.getElementById('main-container');
    if (!mainContainer) return;

    if (sites.length === 0) {
      mainContainer.innerHTML = `
        <div style="padding: 60px 20px; text-align: center; color: var(--text-dim); font-size: 12px; letter-spacing: 0.08em;">
          // NO MATCHING PROJECTS FOUND<br/>
          <span style="font-size: 10px; opacity: 0.7;">Try clearing filters or search query</span>
        </div>
      `;
      return;
    }

    if (State.viewMode === 'list') {
      this.renderCompactList(mainContainer, sites);
    } else {
      this.renderGrid(mainContainer, sites);
    }
  },

  renderTagRibbon() {
    const ribbon = document.getElementById('tag-ribbon');
    if (!ribbon) return;

    const tags = State.getAllUniqueTags();
    let html = `
      <span class="tag-label">Tags:</span>
      <button class="tag-pill ${State.activeTag === 'all' ? 'active' : ''}" onclick="Ui.setTag('all')">all</button>
    `;

    tags.forEach(t => {
      const active = State.activeTag.toLowerCase() === t.toLowerCase() ? 'active' : '';
      html += `<button class="tag-pill ${active}" onclick="Ui.setTag('${this.esc(t)}')">${this.esc(t)}</button>`;
    });

    ribbon.innerHTML = html;
  },

  setTag(tag) {
    State.activeTag = tag;
    this.render();
  },

  // ── Render Cards Grid ─────────────────────────────────────────────────────
  renderGrid(container, sites) {
    container.innerHTML = `
      <div class="grid-container">
        ${sites.map(site => this.generateCardHtml(site)).join('')}
      </div>
    `;

    // Lazy load previews
    setTimeout(() => {
      sites.forEach(s => {
        if (!s.isLive || s.image) return;
        const cardId = this.getCardId(s);
        if (State.livePlaying.has(cardId)) return;
        if (!State.previewState[cardId]) {
          this.initCardPreview(cardId, s.url, s.name);
        }
      });
    }, 60);
  },

  getCardId(site) {
    return (site.isGh ? 'gh-' : 'site-') + String(site._id).replace(/[^a-z0-9]/gi, '');
  },

  generateCardHtml(site) {
    const cardId = this.getCardId(site);
    const isPlaying = State.livePlaying.has(cardId);
    const health = State.healthCache[site.url];

    let healthBadge = '<span style="color:var(--text-dim)">○ unchecked</span>';
    if (health) {
      if (health.ok && health.status >= 200 && health.status < 300) {
        healthBadge = `<span style="color:var(--badge-live)">● ${health.status}</span> <span style="opacity:0.6">${health.latency}ms</span>`;
      } else if (health.status >= 300 && health.status < 400) {
        healthBadge = `<span style="color:var(--badge-warning)">● ${health.status}</span>`;
      } else if (health.status >= 400) {
        healthBadge = `<span style="color:var(--badge-error)">● ${health.status}</span>`;
      } else {
        healthBadge = `<span style="color:var(--badge-error)">● Offline</span>`;
      }
    }

    const previewInner = this.getPreviewInnerHtml(cardId, site, isPlaying);

    const safeUrl = this.esc(site.url);
    const safeName = this.esc(site.name);
    const safeDesc = this.esc(site.description || 'No description provided.');

    return `
      <div class="project-card ${site.pinned ? 'pinned' : ''} ${!site.isGh ? 'custom-project' : ''}" data-card-id="${cardId}">
        <!-- Header -->
        <div class="card-header">
          <div class="window-dots">
            <div class="w-dot red"></div>
            <div class="w-dot amber"></div>
            <div class="w-dot green"></div>
          </div>
          <div class="card-title-area">
            ${site.pinned ? '<span class="pin-indicator" title="Pinned Project">★</span>' : ''}
            <span class="card-title" title="${safeName}">${safeName}</span>
          </div>
          <div class="card-badges">
            <span class="badge badge-source">${this.esc(site.source)}</span>
            ${site.stars > 0 ? `<span class="badge badge-stars">★ ${site.stars}</span>` : ''}
          </div>
        </div>

        <!-- Preview -->
        <div class="preview-container" onclick="Ui.openPreviewModal('${safeUrl}', '${safeName}')">
          <div class="preview-wrap-${cardId}" style="width:100%;height:100%;">
            ${previewInner}
          </div>
          <div class="preview-overlay">
            <span>[⤢ Responsive Preview]</span>
          </div>
        </div>

        <!-- Body -->
        <div class="card-body">
          <div class="card-desc">${safeDesc}</div>
          <div class="card-tags">
            ${(site.tags || []).map(t => `<span class="card-tag">#${this.esc(t)}</span>`).join('')}
          </div>
        </div>

        <!-- Footer -->
        <div class="card-footer">
          <div class="card-health" data-health-url="${safeUrl}">
            ${healthBadge}
          </div>
          <div class="card-actions">
            <a class="btn-card" href="${safeUrl}" target="_blank" rel="noopener" title="Visit Live Site">[↗]</a>
            ${site.isLive ? `<button class="btn-card ${isPlaying ? 'active-live' : ''}" onclick="event.stopPropagation(); Ui.toggleLiveCard('${cardId}', '${safeUrl}')">[▶]</button>` : ''}
            <button class="btn-card" onclick="event.stopPropagation(); Ui.openQrModal('${safeUrl}', '${safeName}')" title="Scan QR Code">[📱]</button>
            <button class="btn-card" onclick="event.stopPropagation(); Ui.copyToClipboard('${safeUrl}')" title="Copy URL">[⎘]</button>
            ${site.githubUrl ? `<a class="btn-card" href="${this.esc(site.githubUrl)}" target="_blank" rel="noopener" title="GitHub Code">[gh]</a>` : ''}

            <!-- Admin Actions -->
            <div class="admin-actions">
              <button class="btn-card" onclick="event.stopPropagation(); Admin.togglePin(${this.escJson(site)})" title="Toggle Pin">${site.pinned ? '★' : '☆'}</button>
              <button class="btn-card" onclick="event.stopPropagation(); ${site.isGh ? `Admin.openGhOverrideModal(${this.escJson(site)})` : `Admin.openSiteModal(${this.escJson(site)})`}" title="Edit Project">[edit]</button>
              <button class="btn-card" onclick="event.stopPropagation(); Admin.openImageModal(${this.escJson(site)})" title="Upload Custom Screenshot">[img]</button>
              <button class="btn-card" onclick="event.stopPropagation(); Admin.confirmDelete(${this.escJson(site)})" title="Delete / Reset">[del]</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  escJson(obj) {
    return this.esc(JSON.stringify(obj)).replace(/"/g, '&quot;');
  },

  getPreviewInnerHtml(cardId, site, isPlaying) {
    if (isPlaying) {
      return `
        <div class="live-play-bar">
          <span>● INTERACTIVE LIVE MODE</span>
          <button onclick="event.stopPropagation(); Ui.toggleLiveCard('${cardId}', '${this.esc(site.url)}')">[Stop]</button>
        </div>
        <iframe class="live-iframe" src="${this.esc(site.url)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
      `;
    }

    if (site.image) {
      return `<img class="preview-img" src="${this.esc(site.image)}" alt="${this.esc(site.name)}" loading="lazy" />`;
    }

    if (!site.isLive) {
      const domain = site.url.replace(/^https?:\/\//, '').split('/')[0];
      return `
        <div class="preview-fallback">
          <div class="fallback-domain">${this.esc(domain)}</div>
          <div class="fallback-note">no deployment active</div>
        </div>
      `;
    }

    const state = State.previewState[cardId] || 'loading';
    if (state === 'loading') {
      return `
        <div class="preview-loading">
          <div class="spinner"></div>
          <div>LOADING PREVIEW...</div>
        </div>
      `;
    }

    if (state === 'screenshot') {
      const shot = this.screenshotUrl(site.url);
      return `
        <img class="preview-img" src="${this.esc(shot)}" alt="${this.esc(site.name)}" onerror="Ui.onScreenshotError('${cardId}', '${this.esc(site.url)}')" loading="lazy" />
      `;
    }

    // Fallback
    const domain = site.url.replace(/^https?:\/\//, '').split('/')[0];
    return `
      <div class="preview-fallback">
        <div class="fallback-domain">${this.esc(domain)}</div>
        <div class="fallback-note">click to open responsive simulator</div>
      </div>
    `;
  },

  initCardPreview(cardId, url, name) {
    // If the site is known to block framing, immediately use screenshot
    const health = State.healthCache[url];
    if (health && health.canIframe === false) {
      State.previewState[cardId] = 'screenshot';
      this.updateCardPreview(cardId, url, name);
      return;
    }

    // Default to screenshot generator for crisp high-speed previews
    State.previewState[cardId] = 'screenshot';
    this.updateCardPreview(cardId, url, name);
  },

  updateCardPreview(cardId, url, name) {
    const wrap = document.querySelector(`.preview-wrap-${cardId}`);
    if (wrap) {
      const site = State.getMergedSites().find(s => this.getCardId(s) === cardId);
      if (site) {
        wrap.innerHTML = this.getPreviewInnerHtml(cardId, site, State.livePlaying.has(cardId));
      }
    }
  },

  onScreenshotError(cardId, url) {
    State.previewState[cardId] = 'fallback';
    const wrap = document.querySelector(`.preview-wrap-${cardId}`);
    if (wrap) {
      const domain = url.replace(/^https?:\/\//, '').split('/')[0];
      wrap.innerHTML = `
        <div class="preview-fallback">
          <div class="fallback-domain">${this.esc(domain)}</div>
          <div class="fallback-note">click to preview</div>
        </div>
      `;
    }
  },

  toggleLiveCard(cardId, url) {
    if (State.livePlaying.has(cardId)) {
      State.livePlaying.delete(cardId);
    } else {
      State.livePlaying.add(cardId);
    }
    this.updateCardPreview(cardId, url, '');
  },

  // ── Render Compact List View ──────────────────────────────────────────────
  renderCompactList(container, sites) {
    let rows = sites.map(site => {
      const health = State.healthCache[site.url];
      let healthBadge = '○ Unchecked';
      if (health) {
        healthBadge = health.ok ? `● ${health.status} (${health.latency}ms)` : `● Offline`;
      }

      return `
        <tr>
          <td>${site.pinned ? '★' : ''}</td>
          <td>
            <a href="${this.esc(site.url)}" target="_blank" style="font-weight:700;color:var(--text-main);">${this.esc(site.name)}</a>
            <div style="font-size:10px;color:var(--text-muted);">${this.esc(site.url)}</div>
          </td>
          <td><span class="badge badge-source">${this.esc(site.source)}</span></td>
          <td style="font-size:10px;">${healthBadge}</td>
          <td>
            <div class="card-tags">
              ${(site.tags || []).slice(0, 3).map(t => `<span class="card-tag">${this.esc(t)}</span>`).join('')}
            </div>
          </td>
          <td>
            <div style="display:flex;gap:4px;">
              <button class="btn-card" onclick="Ui.openPreviewModal('${this.esc(site.url)}', '${this.esc(site.name)}')">[preview]</button>
              <button class="btn-card" onclick="Ui.openQrModal('${this.esc(site.url)}', '${this.esc(site.name)}')">[qr]</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="compact-table">
        <thead>
          <tr>
            <th style="width:24px;"></th>
            <th>Project</th>
            <th>Source</th>
            <th>Status</th>
            <th>Tags</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  },

  // ── Device Simulator Preview Modal ────────────────────────────────────────
  openPreviewModal(url, name) {
    if (!url) return;
    this.currentModalUrl = url;
    this.currentDeviceMode = 'desktop';
    this.isLandscape = false;

    const modal = document.getElementById('preview-modal');
    document.getElementById('modal-title-text').textContent = `> ${name || url}`;
    document.getElementById('modal-live-link').href = url;

    this.updateDeviceFrame();

    const iframe = document.getElementById('device-iframe');
    iframe.src = url;

    modal.classList.add('open');
  },

  closePreviewModal() {
    const modal = document.getElementById('preview-modal');
    if (modal) modal.classList.remove('open');
    const iframe = document.getElementById('device-iframe');
    if (iframe) iframe.src = 'about:blank';
  },

  setDeviceMode(mode) {
    this.currentDeviceMode = mode;
    document.querySelectorAll('.dev-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    this.updateDeviceFrame();
  },

  toggleLandscape() {
    this.isLandscape = !this.isLandscape;
    this.updateDeviceFrame();
  },

  updateDeviceFrame() {
    const wrapper = document.getElementById('frame-wrapper');
    if (!wrapper) return;

    wrapper.className = `frame-wrapper mode-${this.currentDeviceMode} ${this.isLandscape ? 'landscape' : ''}`;
  },

  reloadDeviceIframe() {
    const iframe = document.getElementById('device-iframe');
    if (iframe && this.currentModalUrl) {
      iframe.src = this.currentModalUrl;
    }
  },

  // ── QR Code Modal ─────────────────────────────────────────────────────────
  openQrModal(url, name) {
    const modal = document.getElementById('qr-modal');
    document.getElementById('qr-site-name').textContent = name;
    document.getElementById('qr-site-url').textContent = url;

    const container = document.getElementById('qr-svg-container');
    Qr.renderToContainer(container, url, 200);

    modal.classList.add('open');
  },

  closeQrModal() {
    const modal = document.getElementById('qr-modal');
    if (modal) modal.classList.remove('open');
  },

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Copied to clipboard', 'ok');
    }).catch(() => {
      this.showToast('Failed to copy', 'err');
    });
  }
};
