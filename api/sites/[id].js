const { connectDB, Site, handleCors, verifyToken, parseBody } = require('../_lib');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    await connectDB();

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing site ID parameter' });

    // GET /api/sites/:id — public
    if (req.method === 'GET') {
      const site = await Site.findById(id);
      if (!site) return res.status(404).json({ error: 'Site not found' });
      return res.json(site);
    }

    // PUT + DELETE — admin only
    try {
      verifyToken(req);
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Admin token required' });
    }

    if (req.method === 'PUT') {
      const body = await parseBody(req);
      const { name, url, description, image, tags, category, pinned, githubUrl, order } = body;
      const update = { updatedAt: new Date() };

      if (name !== undefined) update.name = String(name).trim();
      if (url !== undefined) {
        let cleanUrl = String(url).trim();
        if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = 'https://' + cleanUrl;
        update.url = cleanUrl;
      }
      if (description !== undefined) update.description = String(description).trim();
      if (image !== undefined) update.image = image;
      if (category !== undefined) update.category = String(category).trim();
      if (pinned !== undefined) update.pinned = Boolean(pinned);
      if (githubUrl !== undefined) update.githubUrl = String(githubUrl).trim();
      if (order !== undefined) update.order = Number(order);

      if (tags !== undefined) {
        if (Array.isArray(tags)) {
          update.tags = tags.map(t => String(t).trim().toLowerCase()).filter(Boolean);
        } else if (typeof tags === 'string') {
          update.tags = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
        }
      }

      const site = await Site.findByIdAndUpdate(id, update, { new: true });
      if (!site) return res.status(404).json({ error: 'Site not found' });
      return res.json(site);
    }

    if (req.method === 'DELETE') {
      const site = await Site.findByIdAndDelete(id);
      if (!site) return res.status(404).json({ error: 'Site not found' });
      return res.json({ success: true, message: 'Site deleted successfully' });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Site[id] API error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
