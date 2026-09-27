const { connectDB, Site, handleCors, verifyToken, parseBody } = require('./_lib');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    await connectDB();

    // GET — public: fetch all custom sites
    if (req.method === 'GET') {
      const { excludeImages } = req.query || {};
      const projection = excludeImages === 'true' ? '-image' : '';
      const sites = await Site.find({}, projection).sort({ pinned: -1, order: 1, createdAt: -1 });
      return res.json(sites);
    }

    // POST — admin only: create a new site
    if (req.method === 'POST') {
      try {
        verifyToken(req);
      } catch (authErr) {
        return res.status(401).json({ error: 'Unauthorized: Admin token required' });
      }

      const body = await parseBody(req);
      let { name, url, description, image, tags, category, pinned, githubUrl } = body;

      if (!name || !url) {
        return res.status(400).json({ error: 'Name and URL are required' });
      }

      url = String(url).trim();
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }

      // Check for duplicate URL
      const exists = await Site.findOne({ url });
      if (exists) {
        return res.status(409).json({ error: 'A site with this URL already exists' });
      }

      // Format tags
      let parsedTags = [];
      if (Array.isArray(tags)) {
        parsedTags = tags.map(t => String(t).trim().toLowerCase()).filter(Boolean);
      } else if (typeof tags === 'string') {
        parsedTags = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      }

      const count = await Site.countDocuments();
      const site = await Site.create({
        name: String(name).trim(),
        url,
        description: description ? String(description).trim() : '',
        image: image || '',
        tags: parsedTags,
        category: category ? String(category).trim() : 'Web Apps',
        pinned: Boolean(pinned),
        githubUrl: githubUrl ? String(githubUrl).trim() : '',
        order: count,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return res.status(201).json(site);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Sites API error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
