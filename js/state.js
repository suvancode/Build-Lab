/**
 * BUILD LAB — STATE STORE & DATA MERGING MODULE
 */

const State = {
  ghRepos: [],
  customSites: [],
  overrides: [],
  healthCache: {},
  previewState: {},
  livePlaying: new Set(),

  activeFilter: 'all',
  activeTag: 'all',
  searchQuery: '',
  sortBy: 'updated',
  viewMode: localStorage.getItem('build_lab_view') || 'grid',
  activeTheme: localStorage.getItem('build_lab_theme') || 'matrix',

  // ── Merging Data ──────────────────────────────────────────────────────────
  getMergedSites() {
    const overrideMap = new Map();
    this.overrides.forEach(ov => {
      if (ov.repoId) overrideMap.set(String(ov.repoId), ov);
    });

    // Process GitHub repos
    const processedGh = this.ghRepos
      .map(repo => {
        const ov = overrideMap.get(String(repo.repoId)) || overrideMap.get(String(repo.name));
        
        // If marked hidden by admin override
        if (ov && ov.hidden && !Api.isAdmin()) {
          return null;
        }

        const tags = new Set();
        if (repo.language) tags.add(repo.language);
        if (ov && ov.tags && Array.isArray(ov.tags)) {
          ov.tags.forEach(t => tags.add(t));
        }

        return {
          _id: repo._id,
          repoId: repo.repoId,
          name: (ov && ov.displayName) || repo.name,
          rawName: repo.name,
          url: (ov && ov.customUrl) || repo.url,
          githubUrl: repo.githubUrl,
          description: (ov && ov.description !== undefined && ov.description !== '') ? ov.description : repo.description,
          image: (ov && ov.image) || '',
          tags: Array.from(tags),
          category: (ov && ov.category) || 'GitHub Project',
          pinned: (ov && ov.pinned !== undefined) ? ov.pinned : false,
          hidden: (ov && ov.hidden !== undefined) ? ov.hidden : false,
          stars: repo.stars || 0,
          forks: repo.forks || 0,
          updatedAt: repo.updatedAt,
          hasPages: repo.hasPages,
          isLive: repo.isLive,
          isGh: true,
          source: (ov && ov.customUrl) ? 'Custom URL' : repo.source
        };
      })
      .filter(Boolean);

    // Process custom sites
    const processedCustom = this.customSites.map(site => {
      const tags = Array.isArray(site.tags) ? site.tags : [];
      return {
        _id: String(site._id),
        name: site.name,
        rawName: site.name,
        url: site.url,
        githubUrl: site.githubUrl || '',
        description: site.description || '',
        image: site.image || '',
        tags: tags,
        category: site.category || 'Web Apps',
        pinned: Boolean(site.pinned),
        hidden: false,
        stars: 0,
        forks: 0,
        updatedAt: site.updatedAt || site.createdAt,
        hasPages: false,
        isLive: true,
        isGh: false,
        source: 'Custom Deployment'
      };
    });

    return [...processedCustom, ...processedGh];
  },

  // ── Filtered & Sorted Sites ───────────────────────────────────────────────
  getFilteredSites() {
    let list = this.getMergedSites();

    // 1. Primary Filter Tabs
    if (this.activeFilter === 'pinned') {
      list = list.filter(s => s.pinned);
    } else if (this.activeFilter === 'live') {
      list = list.filter(s => s.isLive);
    } else if (this.activeFilter === 'pages') {
      list = list.filter(s => s.hasPages);
    } else if (this.activeFilter === 'custom') {
      list = list.filter(s => !s.isGh);
    } else if (this.activeFilter === 'issues') {
      list = list.filter(s => {
        const h = this.healthCache[s.url];
        return h && (!h.ok || h.status >= 400 || h.status === 0);
      });
    }

    // 2. Tag Filter
    if (this.activeTag && this.activeTag !== 'all') {
      const targetTag = this.activeTag.toLowerCase();
      list = list.filter(s => s.tags && s.tags.some(t => t.toLowerCase() === targetTag));
    }

    // 3. Search Query
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.url.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.tags && s.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // 4. Sorting
    list.sort((a, b) => {
      // Pinned items always appear first
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }

      if (this.sortBy === 'stars') {
        return (b.stars || 0) - (a.stars || 0);
      }
      if (this.sortBy === 'az') {
        return a.name.localeCompare(b.name);
      }
      if (this.sortBy === 'latency') {
        const latA = this.healthCache[a.url] ? this.healthCache[a.url].latency || 9999 : 9999;
        const latB = this.healthCache[b.url] ? this.healthCache[b.url].latency || 9999 : 9999;
        return latA - latB;
      }
      // Default: recently updated
      const dateA = new Date(a.updatedAt || 0).getTime();
      const dateB = new Date(b.updatedAt || 0).getTime();
      return dateB - dateA;
    });

    return list;
  },

  getAllUniqueTags() {
    const tags = new Set();
    const all = this.getMergedSites();
    all.forEach(s => {
      if (s.tags && Array.isArray(s.tags)) {
        s.tags.forEach(t => {
          if (t && t.trim()) tags.add(t.trim());
        });
      }
    });
    return Array.from(tags).sort();
  }
};
