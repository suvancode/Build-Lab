const { connectDB, Site, RepoOverride, handleCors, verifyToken, parseBody } = require('./_lib');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    verifyToken(req);
  } catch {
    return res.status(401).json({ error: 'Unauthorized: Admin token required' });
  }

  try {
    await connectDB();

    // GET — export all data as JSON
    if (req.method === 'GET') {
      const sites = await Site.find({});
      const overrides = await RepoOverride.find({});

      const backup = {
        exportedAt: new Date().toISOString(),
        version: '2.0.0',
        sites,
        overrides
      };

      return res.json(backup);
    }

    // POST — import data from JSON backup
    if (req.method === 'POST') {
      const body = await parseBody(req);
      const { sites, overrides, mode = 'merge' } = body;

      if (mode === 'replace') {
        await Site.deleteMany({});
        await RepoOverride.deleteMany({});
      }

      let importedSites = 0;
      let importedOverrides = 0;

      if (Array.isArray(sites) && sites.length > 0) {
        for (const s of sites) {
          if (!s.url || !s.name) continue;
          await Site.findOneAndUpdate(
            { url: s.url },
            {
              $set: {
                name: s.name,
                description: s.description || '',
                image: s.image || '',
                tags: s.tags || [],
                category: s.category || 'Web Apps',
                pinned: Boolean(s.pinned),
                githubUrl: s.githubUrl || '',
                order: s.order || 0,
                updatedAt: new Date()
              }
            },
            { upsert: true }
          );
          importedSites++;
        }
      }

      if (Array.isArray(overrides) && overrides.length > 0) {
        for (const o of overrides) {
          if (!o.repoId) continue;
          await RepoOverride.findOneAndUpdate(
            { repoId: o.repoId },
            {
              $set: {
                repoName: o.repoName || o.repoId,
                displayName: o.displayName || '',
                customUrl: o.customUrl || '',
                description: o.description || '',
                image: o.image || '',
                tags: o.tags || [],
                category: o.category || '',
                pinned: Boolean(o.pinned),
                hidden: Boolean(o.hidden),
                order: o.order || 0,
                updatedAt: new Date()
              }
            },
            { upsert: true }
          );
          importedOverrides++;
        }
      }

      return res.json({
        success: true,
        message: `Import complete: ${importedSites} sites, ${importedOverrides} overrides processed`,
        importedSites,
        importedOverrides
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Export/Import API error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
