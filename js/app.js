/**
 * BUILD LAB — MAIN APPLICATION BOOTSTRAP
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize UI & Admin state
  Ui.init();
  Admin.init();

  // Show loading indicator
  const mainContainer = document.getElementById('main-container');
  if (mainContainer) {
    mainContainer.innerHTML = `
      <div style="padding: 100px 20px; text-align: center; color: var(--text-muted);">
        <div class="pulse-dot" style="width: 14px; height: 14px; margin: 0 auto 16px auto;"></div>
        <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.1em; color: var(--accent);">INITIALIZING BUILD.LAB...</div>
        <div style="font-size: 10px; color: var(--text-dim); margin-top: 6px;">Fetching GitHub repos & MongoDB database</div>
      </div>
    `;
  }

  // Load initial datasets concurrently
  try {
    const [ghRepos, customSites, overrides] = await Promise.all([
      Api.fetchGithubRepos(),
      Api.fetchCustomSites(),
      Api.fetchRepoOverrides()
    ]);

    State.ghRepos = ghRepos;
    State.customSites = customSites;
    State.overrides = overrides;

    // Check API health status
    Api.pingApi().then(res => {
      const apiStatusEl = document.getElementById('api-status-text');
      if (apiStatusEl) {
        apiStatusEl.textContent = res.db === 'connected' ? 'API: connected' : 'API: degraded';
        apiStatusEl.style.color = res.db === 'connected' ? 'var(--badge-live)' : 'var(--badge-warning)';
      }
    }).catch(() => {
      const apiStatusEl = document.getElementById('api-status-text');
      if (apiStatusEl) {
        apiStatusEl.textContent = 'API: offline';
        apiStatusEl.style.color = 'var(--badge-error)';
      }
    });

  } catch (err) {
    console.error('Bootstrap error:', err);
    Ui.showToast('Failed to load initial data', 'err');
  }

  // Initial Render
  Ui.render();

  // ── Setup Event Listeners ─────────────────────────────────────────────────
  setupEventListeners();
});

function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      State.searchQuery = e.target.value.trim();
      Ui.render();
    });
  }

  // Filter chips (All, Pinned, Live, Pages, Custom, Issues)
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.activeFilter = btn.dataset.filter;
      Ui.render();
    });
  });

  // Sort dropdown
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', e => {
      State.sortBy = e.target.value;
      Ui.render();
    });
  }

  // View mode switcher (Grid vs List)
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.viewMode = btn.dataset.view;
      localStorage.setItem('build_lab_view', State.viewMode);
      Ui.render();
    });
  });

  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      Ui.applyTheme(btn.dataset.theme);
    });
  });

  // Scanline toggle
  const scanlineBtn = document.getElementById('btn-scanline');
  if (scanlineBtn) {
    const isScanline = localStorage.getItem('build_lab_scanlines') === '1';
    if (isScanline) document.documentElement.classList.add('scanlines-enabled');
    scanlineBtn.addEventListener('click', () => {
      const active = document.documentElement.classList.toggle('scanlines-enabled');
      localStorage.setItem('build_lab_scanlines', active ? '1' : '0');
      Ui.showToast(active ? 'CRT Scanlines enabled' : 'Scanlines disabled');
    });
  }

  // Batch Ping Health button
  const btnPingAll = document.getElementById('btn-ping-all');
  if (btnPingAll) {
    btnPingAll.addEventListener('click', () => {
      const liveUrls = State.getMergedSites()
        .filter(s => s.isLive && s.url)
        .map(s => s.url);
      Health.checkBatch(liveUrls);
    });
  }

  // Modal overlay click outside to close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
        const iframe = overlay.querySelector('iframe');
        if (iframe) iframe.src = 'about:blank';
      }
    });
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', e => {
    // Escape closes modals
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => {
        m.classList.remove('open');
        const iframe = m.querySelector('iframe');
        if (iframe) iframe.src = 'about:blank';
      });
    }

    // '/' or Ctrl+K focuses search
    if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      const search = document.getElementById('global-search');
      if (search) search.focus();
    }
  });

  // Drag and drop for image upload
  const dropZone = document.getElementById('drop-zone');
  if (dropZone) {
    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', e => {
      Admin.handleImageDrop(e);
    });
  }
}
