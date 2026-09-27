const { connectDB, Admin, handleCors, verifyToken, bcrypt, parseBody } = require('../_lib');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    verifyToken(req);
  } catch {
    return res.status(401).json({ error: 'Unauthorized: Admin token required' });
  }

  try {
    await connectDB();
    const body = await parseBody(req);
    const { currentPassword, newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const admin = await Admin.findOne();
    if (admin && admin.passwordHash) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }
      const match = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!match) {
        return res.status(401).json({ error: 'Incorrect current password' });
      }
    }

    const hash = await bcrypt.hash(newPassword, 12);
    if (admin) {
      admin.passwordHash = hash;
      admin.updatedAt = new Date();
      await admin.save();
    } else {
      await Admin.create({ passwordHash: hash });
    }

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
