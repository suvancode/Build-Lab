/**
 * BUILD LAB — SITE HEALTH & LATENCY CHECKER MODULE
 */

const Health = {
  isCheckingAll: false,

  async checkSite(url) {
    if (!url || !/^https?:\/\//i.test(url)) return null;

    try {
      const data = await Api.pingSite(url);
      State.healthCache[url] = data;
      this.updateBadgeInDom(url, data);
      return data;
    } catch (err) {
      const fallback = { ok: false, status: 0, latency: null, canIframe: false, error: err.message };
      State.healthCache[url] = fallback;
      this.updateBadgeInDom(url, fallback);
      return fallback;
    }
  },

  async checkBatch(urls, concurrency = 4) {
    if (this.isCheckingAll) return;
    this.isCheckingAll = true;

    const btn = document.getElementById('btn-ping-all');
    if (btn) btn.innerHTML = '⚡ Checking...';

    const queue = [...urls];
    const workers = Array(concurrency).fill(null).map(async () => {
      while (queue.length > 0) {
        const target = queue.shift();
        if (target) {
          await this.checkSite(target);
        }
      }
    });

    await Promise.all(workers);
    this.isCheckingAll = false;

    if (btn) btn.innerHTML = '⚡ Check Health';
    Ui.showToast('Site health check complete', 'ok');
  },

  updateBadgeInDom(url, data) {
    const el = document.querySelector(`[data-health-url="${CSS.escape(url)}"]`);
    if (!el) return;

    if (data.ok && data.status >= 200 && data.status < 300) {
      el.innerHTML = `<span style="color:var(--badge-live)">● ${data.status}</span> <span style="opacity:0.6">${data.latency}ms</span>`;
    } else if (data.status >= 300 && data.status < 400) {
      el.innerHTML = `<span style="color:var(--badge-warning)">● ${data.status}</span> <span style="opacity:0.6">${data.latency}ms</span>`;
    } else if (data.status >= 400) {
      el.innerHTML = `<span style="color:var(--badge-error)">● ${data.status}</span>`;
    } else {
      el.innerHTML = `<span style="color:var(--badge-error)">● Offline</span>`;
    }
  }
};
