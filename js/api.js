/**
 * BUILD LAB — API CLIENT MODULE
 */

const API_BASE = '/api';
const TOKEN_STORAGE_KEY = 'build_lab_token';
const DEFAULT_GH_USER = 'adityasing9';

const Api = {
  getToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  },

  setToken(token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  },

  removeToken() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  },

  isAdmin() {
    return !!this.getToken();
  },

  getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const opts = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...(options.headers || {})
      }
    };

    const res = await fetch(url, opts);

    if (res.status === 401 && this.getToken()) {
      this.removeToken();
      window.dispatchEvent(new CustomEvent('auth:expired'));
      throw new Error('Admin session expired. Please log in again.');
    }

    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      const errMsg = (data && data.error) || (typeof data === 'string' ? data : 'API Request Failed');
      throw new Error(errMsg);
    }

    return data;
  },

  // ── GitHub Repos ──────────────────────────────────────────────────────────
  async fetchGithubRepos(username = DEFAULT_GH_USER) {
    try {
      const url = `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`GitHub API error: ${res.statusText}`);
      const repos = await res.json();

      return repos.map(r => {
        // Intelligent Live URL detection:
        // 1. Homepage URL if set (Vercel, Render, Streamlit, etc.)
        // 2. Custom github.io user site if repo is username.github.io
        // 3. GitHub Pages deployment URL
        const isUserSite = r.name.toLowerCase() === `${username.toLowerCase()}.github.io`;
        let liveUrl = '';
        let isLive = false;

        if (r.homepage && /^https?:\/\//i.test(r.homepage.trim())) {
          liveUrl = r.homepage.trim();
          isLive = true;
        } else if (isUserSite) {
          liveUrl = `https://${username}.github.io/`;
          isLive = true;
        } else if (r.has_pages) {
          liveUrl = `https://${username}.github.io/${r.name}/`;
          isLive = true;
        } else {
          liveUrl = `https://${username}.github.io/${r.name}`;
          isLive = false;
        }

        return {
          _id: 'gh_' + r.id,
          repoId: 'gh_' + r.id,
          name: r.name,
          url: liveUrl,
          githubUrl: r.html_url,
          description: r.description || '',
          language: r.language,
          stars: r.stargazers_count || 0,
          forks: r.forks_count || 0,
          updatedAt: r.updated_at,
          hasPages: r.has_pages || isUserSite,
          isLive: isLive,
          isGh: true,
          source: r.homepage ? 'Deployment' : (r.has_pages ? 'GitHub Pages' : 'GitHub')
        };
      });
    } catch (err) {
      console.warn('Failed to fetch GitHub repos:', err);
      return [];
    }
  },

  // ── Custom Sites ──────────────────────────────────────────────────────────
  async fetchCustomSites() {
    try {
      return await this.request('/sites');
    } catch (err) {
      console.warn('Failed to fetch custom sites:', err);
      return [];
    }
  },

  async createSite(siteData) {
    return await this.request('/sites', {
      method: 'POST',
      body: JSON.stringify(siteData)
    });
  },

  async updateSite(id, siteData) {
    return await this.request(`/sites/${id}`, {
      method: 'PUT',
      body: JSON.stringify(siteData)
    });
  },

  async deleteSite(id) {
    return await this.request(`/sites/${id}`, {
      method: 'DELETE'
    });
  },

  // ── Repo Overrides ────────────────────────────────────────────────────────
  async fetchRepoOverrides() {
    try {
      return await this.request('/overrides');
    } catch (err) {
      console.warn('Failed to fetch repo overrides:', err);
      return [];
    }
  },

  async saveRepoOverride(overrideData) {
    return await this.request('/overrides', {
      method: 'POST',
      body: JSON.stringify(overrideData)
    });
  },

  async deleteRepoOverride(repoId) {
    return await this.request(`/overrides?repoId=${encodeURIComponent(repoId)}`, {
      method: 'DELETE'
    });
  },

  // ── Site Health Pinger ────────────────────────────────────────────────────
  async pingSite(url) {
    return await this.request(`/ping-site?url=${encodeURIComponent(url)}`);
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  async loginAdmin(password) {
    const data = await this.request('/auth', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    if (data && data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async changePassword(currentPassword, newPassword) {
    return await this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  // ── Backup Export / Import ────────────────────────────────────────────────
  async exportBackup() {
    return await this.request('/export');
  },

  async importBackup(backupData, mode = 'merge') {
    return await this.request('/export', {
      method: 'POST',
      body: JSON.stringify({ ...backupData, mode })
    });
  },

  async pingApi() {
    return await this.request('/ping');
  }
};
