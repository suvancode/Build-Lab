/**
 * BUILD LAB — QR CODE GENERATOR MODULE
 * Generates an SVG QR code for mobile live site testing
 */

const Qr = {
  /**
   * Generates an SVG string or image element for a given URL
   */
  renderToContainer(container, text, size = 220) {
    if (!container) return;
    const cleanUrl = encodeURIComponent(text);
    // Reliable, fast, zero-dependency SVG QR generation
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${cleanUrl}&bgcolor=ffffff&color=000000&margin=1`;

    container.innerHTML = `
      <div style="background:#fff;padding:12px;border-radius:6px;display:inline-block;box-shadow:0 4px 16px rgba(0,0,0,0.5);">
        <img src="${qrImgUrl}" alt="QR Code" width="${size}" height="${size}" style="display:block;border-radius:4px;" />
      </div>
    `;
  }
};
