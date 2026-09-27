const { connectDB, RepoOverride, handleCors, verifyToken, parseBody } = require('./_lib');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    await connectDB();

    // GET — public: fetch all repo overrides
    if (req.method === 'GET') {
      const overrides = await RepoOverride.find({}).sort({ pinned: -1, order: 1 });
      return res.json(overrides);
    }

    // POST / PUT / DELETE — admin only
    try {
      verifyToken(req);
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Admin token required' });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const body = await parseBody(req);
      const {
        repoId,
        repoName,
        displayName,
        customUrl,
        description,
        image,
        tags,
        category,
        pinned,
        hidden,
        order
      } = body;

      if (!repoId) {
        return res.status(400).json({ error: 'repoId is required' });
      }

      const update = { updatedAt: new Date() };
      if (repoName !== undefined) update.repoName = String(repoName);
      if (displayName !== undefined) update.displayName = String(displayName).trim();
      if (customUrl !== undefined) {
        let cleanUrl = String(customUrl).trim();
        if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) cleanUrl = 'https://' + cleanUrl;
        update.customUrl = cleanUrl;
      }
      if (description !== undefined) update.description = String(description).trim();
      if (image !== undefined) update.image = image;
      if (category !== undefined) update.category = String(category).trim();
      if (pinned !== undefined) update.pinned = Boolean(pinned);
      if (hidden !== undefined) update.hidden = Boolean(hidden);
      if (order !== undefined) update.order = Number(order);

      if (tags !== undefined) {
        if (Array.isArray(tags)) {
          update.tags = tags.map(t => String(t).trim().toLowerCase()).filter(Boolean);
        } else if (typeof tags === 'string') {
          update.tags = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
        }
      }

      const result = await RepoOverride.findOneAndUpdate(
        { repoId: String(repoId) },
        { $set: update, $setOnInsert: { repoName: String(repoName || repoId) } },
        { upsert: true, new: true }
      );

      return res.json(result);
    }

    if (req.method === 'DELETE') {
      const { repoId } = req.query || {};
      const body = await parseBody(req);
      const targetId = repoId || body.repoId;

      if (!targetId) {
        return res.status(400).json({ error: 'repoId parameter is required' });
      }

      await RepoOverride.deleteOne({ repoId: String(targetId) });
      return res.json({ success: true, message: 'Override removed' });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Overrides API error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
