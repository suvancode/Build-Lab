/**
 * BUILD LAB — ADMIN CONTROLS & MANAGEMENT MODULE
 */

const Admin = {
  activeEditSite: null,
  activeEditIsGh: false,
  pendingImgSite: null,
  pendingImgData: null,

  init() {
    this.updateAdminUi();
    window.addEventListener('auth:expired', () => {
      this.updateAdminUi();
      Ui.showToast('Session expired. Please log in again.', 'err');
    });
  },

  updateAdminUi() {
    const isAuthed = Api.isAdmin();
    document.body.classList.toggle('admin-mode', isAuthed);

    const btnLogin = document.getElementById('btn-admin-auth');
    if (btnLogin) {
      btnLogin.textContent = isAuthed ? '[Logout Admin]' : '[Admin Login]';
    }

    const badgeAdmin = document.getElementById('admin-badge');
    if (badgeAdmin) {
      badgeAdmin.style.display = isAuthed ? 'inline-flex' : 'none';
    }

    const btnAdd = document.getElementById('btn-add-site');
    if (btnAdd) {
      btnAdd.style.display = isAuthed ? 'inline-flex' : 'none';
    }

    const btnExport = document.getElementById('btn-backup');
    if (btnExport) {
      btnExport.style.display = isAuthed ? 'inline-flex' : 'none';
    }
  },

  handleAuthToggle() {
    if (Api.isAdmin()) {
      Api.removeToken();
      this.updateAdminUi();
      Ui.render();
      Ui.showToast('Admin logged out', 'ok');
    } else {
      this.openLoginModal();
    }
  },

  // ── Auth Dialog ───────────────────────────────────────────────────────────
  openLoginModal() {
    const modal = document.getElementById('login-modal');
    if (!modal) return;
    document.getElementById('login-password').value = '';
    document.getElementById('login-msg').textContent = '';
    modal.classList.add('open');
    setTimeout(() => document.getElementById('login-password').focus(), 100);
  },

  closeLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.classList.remove('open');
  },

  async submitLogin() {
    const pwdInput = document.getElementById('login-password');
    const msg = document.getElementById('login-msg');
    const password = pwdInput.value.trim();

    if (!password) {
      msg.textContent = 'ERR: Enter admin password';
      msg.className = 'form-label msg err';
      return;
    }

    msg.textContent = 'Verifying credentials...';
    msg.className = 'form-label msg';

    try {
      await Api.loginAdmin(password);
      this.updateAdminUi();
      this.closeLoginModal();
      Ui.render();
      Ui.showToast('Admin authenticated successfully', 'ok');
    } catch (err) {
      msg.textContent = `ERR: ${err.message}`;
      msg.className = 'form-label msg err';
    }
  },

  // ── Change Password Modal ─────────────────────────────────────────────────
  openPasswordModal() {
    if (!Api.isAdmin()) return;
    const modal = document.getElementById('password-modal');
    if (!modal) return;
    document.getElementById('old-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('pwd-msg').textContent = '';
    modal.classList.add('open');
  },

  closePasswordModal() {
    const modal = document.getElementById('password-modal');
    if (modal) modal.classList.remove('open');
  },

  async submitChangePassword() {
    const oldPwd = document.getElementById('old-password').value.trim();
    const newPwd = document.getElementById('new-password').value.trim();
    const msg = document.getElementById('pwd-msg');

    if (!newPwd || newPwd.length < 6) {
      msg.textContent = 'ERR: New password must be at least 6 characters';
      msg.className = 'form-label msg err';
      return;
    }

    msg.textContent = 'Updating password...';
    try {
      await Api.changePassword(oldPwd, newPwd);
      this.closePasswordModal();
      Ui.showToast('Password changed successfully', 'ok');
    } catch (err) {
      msg.textContent = `ERR: ${err.message}`;
      msg.className = 'form-label msg err';
    }
  },

  // ── Add / Edit Custom Site Modal ──────────────────────────────────────────
  openSiteModal(site = null) {
    if (!Api.isAdmin()) {
      this.openLoginModal();
      return;
    }

    this.activeEditSite = site;
    this.activeEditIsGh = false;

    const modal = document.getElementById('site-modal');
    const title = document.getElementById('site-modal-title');
    title.textContent = site ? '> edit project' : '> add new project';

    document.getElementById('site-name').value = site ? site.name : '';
    document.getElementById('site-url').value = site ? site.url : '';
    document.getElementById('site-desc').value = site ? (site.description || '') : '';
    document.getElementById('site-tags').value = site ? (site.tags ? site.tags.join(', ') : '') : '';
    document.getElementById('site-category').value = site ? (site.category || 'Web Apps') : 'Web Apps';
    document.getElementById('site-github').value = site ? (site.githubUrl || '') : '';
    document.getElementById('site-pinned').checked = site ? Boolean(site.pinned) : false;
    document.getElementById('site-msg').textContent = '';

    modal.classList.add('open');
  },

  closeSiteModal() {
    const modal = document.getElementById('site-modal');
    if (modal) modal.classList.remove('open');
    this.activeEditSite = null;
  },

  async saveSite() {
    const name = document.getElementById('site-name').value.trim();
    let url = document.getElementById('site-url').value.trim();
    const desc = document.getElementById('site-desc').value.trim();
    const tags = document.getElementById('site-tags').value.trim();
    const category = document.getElementById('site-category').value.trim();
    const githubUrl = document.getElementById('site-github').value.trim();
    const pinned = document.getElementById('site-pinned').checked;
    const msg = document.getElementById('site-msg');

    if (!name || !url) {
      msg.textContent = 'ERR: Title and Live URL are required';
      msg.className = 'form-label msg err';
      return;
    }

    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    const payload = {
      name,
      url,
      description: desc,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      category,
      githubUrl,
      pinned
    };

    msg.textContent = 'Saving project...';

    try {
      if (this.activeEditSite && this.activeEditSite._id) {
        const updated = await Api.updateSite(this.activeEditSite._id, payload);
        const idx = State.customSites.findIndex(s => String(s._id) === String(this.activeEditSite._id));
        if (idx !== -1) State.customSites[idx] = updated;
        Ui.showToast('Project updated successfully', 'ok');
      } else {
        const created = await Api.createSite(payload);
        State.customSites.unshift(created);
        Ui.showToast('New project created', 'ok');
      }
      this.closeSiteModal();
      Ui.render();
    } catch (err) {
      msg.textContent = `ERR: ${err.message}`;
      msg.className = 'form-label msg err';
    }
  },

  // ── GitHub Repo Override Modal ────────────────────────────────────────────
  openGhOverrideModal(site) {
    if (!Api.isAdmin()) {
      this.openLoginModal();
      return;
    }

    this.activeEditSite = site;
    this.activeEditIsGh = true;

    const modal = document.getElementById('gh-override-modal');
    document.getElementById('gh-modal-repo-name').textContent = site.rawName || site.name;
    document.getElementById('gh-custom-title').value = site.name;
    document.getElementById('gh-custom-url').value = site.url;
    document.getElementById('gh-custom-desc').value = site.description || '';
    document.getElementById('gh-custom-tags').value = site.tags ? site.tags.join(', ') : '';
    document.getElementById('gh-pinned').checked = Boolean(site.pinned);
    document.getElementById('gh-hidden').checked = Boolean(site.hidden);
    document.getElementById('gh-msg').textContent = '';

    modal.classList.add('open');
  },

  closeGhOverrideModal() {
    const modal = document.getElementById('gh-override-modal');
    if (modal) modal.classList.remove('open');
    this.activeEditSite = null;
  },

  async saveGhOverride() {
    const site = this.activeEditSite;
    if (!site) return;

    const displayName = document.getElementById('gh-custom-title').value.trim();
    let customUrl = document.getElementById('gh-custom-url').value.trim();
    const desc = document.getElementById('gh-custom-desc').value.trim();
    const tags = document.getElementById('gh-custom-tags').value.trim();
    const pinned = document.getElementById('gh-pinned').checked;
    const hidden = document.getElementById('gh-hidden').checked;
    const msg = document.getElementById('gh-msg');

    if (customUrl && !/^https?:\/\//i.test(customUrl)) {
      customUrl = 'https://' + customUrl;
    }

    const payload = {
      repoId: site.repoId || site.name,
      repoName: site.rawName || site.name,
      displayName,
      customUrl,
      description: desc,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      pinned,
      hidden
    };

    msg.textContent = 'Saving override to database...';

    try {
      const saved = await Api.saveRepoOverride(payload);
      const idx = State.overrides.findIndex(o => String(o.repoId) === String(payload.repoId));
      if (idx !== -1) {
        State.overrides[idx] = saved;
      } else {
        State.overrides.push(saved);
      }
      this.closeGhOverrideModal();
      Ui.render();
      Ui.showToast('GitHub repo customizations saved permanently', 'ok');
    } catch (err) {
      msg.textContent = `ERR: ${err.message}`;
      msg.className = 'form-label msg err';
    }
  },

  // ── Quick Pin Toggle ──────────────────────────────────────────────────────
  async togglePin(site) {
    if (!Api.isAdmin()) {
      this.openLoginModal();
      return;
    }

    const newPinned = !site.pinned;

    try {
      if (site.isGh) {
        const payload = {
          repoId: site.repoId || site.name,
          repoName: site.rawName || site.name,
          displayName: site.name,
          customUrl: site.url,
          pinned: newPinned
        };
        const saved = await Api.saveRepoOverride(payload);
        const idx = State.overrides.findIndex(o => String(o.repoId) === String(payload.repoId));
        if (idx !== -1) State.overrides[idx] = saved;
        else State.overrides.push(saved);
      } else {
        const updated = await Api.updateSite(site._id, { pinned: newPinned });
        const idx = State.customSites.findIndex(s => String(s._id) === String(site._id));
        if (idx !== -1) State.customSites[idx] = updated;
      }
      Ui.render();
      Ui.showToast(newPinned ? '★ Pinned to top' : 'Unpinned', 'ok');
    } catch (err) {
      Ui.showToast(`ERR: ${err.message}`, 'err');
    }
  },

  // ── Delete Site / Reset Override ──────────────────────────────────────────
  async confirmDelete(site) {
    if (!Api.isAdmin()) {
      this.openLoginModal();
      return;
    }

    const confirmMsg = site.isGh
      ? `Reset all customizations for "${site.name}" back to default GitHub repo?`
      : `Delete custom project "${site.name}" permanently?`;

    if (!confirm(confirmMsg)) return;

    try {
      if (site.isGh) {
        await Api.deleteRepoOverride(site.repoId || site.name);
        State.overrides = State.overrides.filter(o => String(o.repoId) !== String(site.repoId || site.name));
        Ui.showToast('GitHub customizations reset', 'ok');
      } else {
        await Api.deleteSite(site._id);
        State.customSites = State.customSites.filter(s => String(s._id) !== String(site._id));
        Ui.showToast('Project deleted', 'ok');
      }
      Ui.render();
    } catch (err) {
      Ui.showToast(`ERR: ${err.message}`, 'err');
    }
  },

  // ── Image Upload & Canvas Compressor ──────────────────────────────────────
  openImageModal(site) {
    if (!Api.isAdmin()) {
      this.openLoginModal();
      return;
    }

    this.pendingImgSite = site;
    this.pendingImgData = null;

    const modal = document.getElementById('image-modal');
    document.getElementById('img-site-name').textContent = site.name;
    document.getElementById('img-file-input').value = '';
    document.getElementById('img-preview-box').style.display = 'none';
    document.getElementById('img-preview-tag').src = '';
    document.getElementById('img-msg').textContent = '';

    const btnRemove = document.getElementById('btn-remove-img');
    btnRemove.style.display = site.image ? 'inline-block' : 'none';

    modal.classList.add('open');
  },

  closeImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) modal.classList.remove('open');
    this.pendingImgSite = null;
  },

  handleImageDrop(e) {
    e.preventDefault();
    document.getElementById('drop-zone').classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) this.processAndCompressImage(file);
  },

  handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) this.processAndCompressImage(file);
  },

  processAndCompressImage(file) {
    const msg = document.getElementById('img-msg');
    if (!file.type.startsWith('image/')) {
      msg.textContent = 'ERR: File must be an image';
      msg.className = 'form-label msg err';
      return;
    }

    msg.textContent = 'Compressing image with Canvas...';
    msg.className = 'form-label msg';

    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        // Max 960x540 for web screenshots
        const maxWidth = 960;
        const maxHeight = 540;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to WebP or JPEG at 0.8 quality
        const compressedBase64 = canvas.toDataURL('image/webp', 0.8);
        this.pendingImgData = compressedBase64;

        const prevBox = document.getElementById('img-preview-box');
        const prevImg = document.getElementById('img-preview-tag');
        prevImg.src = compressedBase64;
        prevBox.style.display = 'block';

        const sizeKb = Math.round(compressedBase64.length * 0.75 / 1024);
        msg.textContent = `Optimized preview: ${width}x${height} (${sizeKb} KB) ready to save`;
        msg.className = 'form-label msg ok';
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  },

  async saveImage() {
    const site = this.pendingImgSite;
    if (!site || !this.pendingImgData) {
      Ui.showToast('Please select an image first', 'err');
      return;
    }

    const msg = document.getElementById('img-msg');
    msg.textContent = 'Saving screenshot to database...';

    try {
      if (site.isGh) {
        const payload = {
          repoId: site.repoId || site.name,
          repoName: site.rawName || site.name,
          image: this.pendingImgData
        };
        const saved = await Api.saveRepoOverride(payload);
        const idx = State.overrides.findIndex(o => String(o.repoId) === String(payload.repoId));
        if (idx !== -1) State.overrides[idx] = saved;
        else State.overrides.push(saved);
      } else {
        const updated = await Api.updateSite(site._id, { image: this.pendingImgData });
        const idx = State.customSites.findIndex(s => String(s._id) === String(site._id));
        if (idx !== -1) State.customSites[idx] = updated;
      }

      this.closeImageModal();
      Ui.render();
      Ui.showToast('Screenshot preview saved', 'ok');
    } catch (err) {
      msg.textContent = `ERR: ${err.message}`;
      msg.className = 'form-label msg err';
    }
  },

  async removeImage() {
    const site = this.pendingImgSite;
    if (!site) return;

    try {
      if (site.isGh) {
        await Api.saveRepoOverride({
          repoId: site.repoId || site.name,
          repoName: site.rawName || site.name,
          image: ''
        });
      } else {
        await Api.updateSite(site._id, { image: '' });
      }
      this.closeImageModal();
      Ui.render();
      Ui.showToast('Custom screenshot removed', 'ok');
    } catch (err) {
      Ui.showToast(`ERR: ${err.message}`, 'err');
    }
  },

  // ── Backup Export / Import ────────────────────────────────────────────────
  async openBackupModal() {
    if (!Api.isAdmin()) return;
    const modal = document.getElementById('backup-modal');
    modal.classList.add('open');
  },

  closeBackupModal() {
    const modal = document.getElementById('backup-modal');
    if (modal) modal.classList.remove('open');
  },

  async downloadBackupJson() {
    try {
      const data = await Api.exportBackup();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `build-lab-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      Ui.showToast('Backup JSON downloaded', 'ok');
    } catch (err) {
      Ui.showToast(`ERR: ${err.message}`, 'err');
    }
  },

  async importBackupFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await Api.importBackup(parsed, 'merge');
      Ui.showToast(res.message, 'ok');
      this.closeBackupModal();
      // Reload fresh data
      window.location.reload();
    } catch (err) {
      Ui.showToast(`Import error: ${err.message}`, 'err');
    }
  }
};
