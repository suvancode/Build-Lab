const { connectDB, Site, RepoOverride, handleCors } = require('./_lib');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  const checks = {
    api: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    MONGODB_URI:    process.env.MONGODB_URI    ? 'configured' : 'MISSING',
    JWT_SECRET:     process.env.JWT_SECRET     ? 'configured' : 'MISSING',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? 'configured' : 'MISSING',
    db: 'untested',
    counts: {
      sites: 0,
      overrides: 0
    }
  };

  try {
    await connectDB();
    checks.db = 'connected';
    checks.counts.sites = await Site.countDocuments();
    checks.counts.overrides = await RepoOverride.countDocuments();
  } catch (err) {
    checks.db = 'error: ' + err.message;
  }

  const allOk = checks.MONGODB_URI === 'configured' && checks.JWT_SECRET === 'configured' && checks.db === 'connected';
  res.status(allOk ? 200 : 500).json(checks);
};
