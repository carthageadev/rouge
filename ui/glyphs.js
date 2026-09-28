(function () {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const domain = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
  const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

  const doc = `<svg viewBox="0 0 24 24" class="g-svg"><path d="M6.5 2.5h7.5l4.5 4.5v13a1.5 1.5 0 0 1-1.5 1.5h-10.5A1.5 1.5 0 0 1 5 20V4a1.5 1.5 0 0 1 1.5-1.5z" fill="#fff" stroke="#cfd2d8"/><path d="M14 2.5V7h4.5" fill="#eef0f3" stroke="#cfd2d8" stroke-linejoin="round"/><text x="11.8" y="16.6" text-anchor="middle" font-size="4.8" font-weight="700" fill="#9ea3ad" font-family="Segoe UI,system-ui">TXT</text></svg>`;
  const env = `<svg viewBox="0 0 24 24" class="g-svg"><rect x="3" y="6" width="18" height="12.5" rx="2" fill="#fff" stroke="#cfd2d8"/><path d="M3.8 7l8.2 6.2L20.2 7" fill="none" stroke="#cfd2d8" stroke-linejoin="round"/></svg>`;

  function tile(item) {
    switch (item.kind) {
      case 'image': return `<img src="${item.thumb}" draggable="false" alt="">`;
      case 'color': return `<div class="g-color" style="background:${esc(item.text.trim())}"></div>`;
      case 'link': {
        const d = domain(item.text.trim()), h = hue(d);
        return `<div class="g-link" style="--h:${h}">${esc(d.charAt(0).toUpperCase())}</div>`;
      }
      case 'email': return env;
      case 'code': return `<div class="g-code">&lt;/&gt;</div>`;
      default: return doc;
    }
  }

  function srcIcon(item, cls = 'src-ic') {
    const s = item.src;
    if (!s) return '';
    const app = item.icon || '';
    if (s.site) {
      const fb = app ? `this.onerror=null;this.src='${app}'` : `this.style.display='none'`;
      return `<img class="${cls}" src="https://${esc(s.site)}/favicon.ico" onerror="${fb}" alt="">`;
    }
    return app ? `<img class="${cls}" src="${app}" alt="">` : '';
  }
  const srcName = item => item.src ? (item.src.site || item.src.app || '') : '';

  function preview(item, n = 60) {
    const t = (item.text || '').replace(/\s+/g, ' ').trim();
    if (item.kind === 'image') return `Image · ${item.w}×${item.h}`;
    return t.length > n ? t.slice(0, n - 1) + '…' : t;
  }

  window.Rouge = { tile, esc, domain, hue, srcIcon, srcName, preview };
})();
