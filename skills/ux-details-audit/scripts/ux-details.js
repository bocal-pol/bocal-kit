async () => {
  // ux-details.js — detectors for small UX defects, measured in the rendered DOM.
  // Pass it as is to browser_evaluate (Playwright MCP) on the loaded page, once per width.
  // It measures CSS boxes, not taste: a finding is a candidate to check on the screenshot,
  // never a verdict. It writes nothing to the page.
  const MAX_PER_KIND = 8;
  const vw = innerWidth;
  const narrow = vw <= 768;
  const out = [];
  const counts = {};

  const label = (el) => {
    if (el.id) return `#${el.id}`;
    const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24);
    return el.tagName.toLowerCase() + (cls ? `.${cls}` : '') + (txt ? ` "${txt}"` : '');
  };
  const add = (kind, el, detail) => {
    counts[kind] = (counts[kind] || 0) + 1;
    if (counts[kind] <= MAX_PER_KIND) out.push({ kind, el: label(el), detail });
  };
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05;
  };
  const alpha = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)|color\(srgb [^/]+\/\s*([\d.]+)\)/);
    if (!m) return c === 'transparent' ? 0 : 1;
    if (m[2] !== undefined) return parseFloat(m[2]);
    const p = m[1].split(/[ ,/]+/).filter(Boolean);
    return p.length > 3 ? parseFloat(p[3]) : 1;
  };
  const isSurface = (el) => {
    const cs = getComputedStyle(el);
    const border = ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none');
    return alpha(cs.backgroundColor) > 0.02 || border || cs.boxShadow !== 'none';
  };
  const textNodes = (root) => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue.trim() && n.parentElement && !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(n.parentElement.tagName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const list = [];
    while (w.nextNode()) list.push(w.currentNode);
    return list;
  };
  const rangeRect = (node) => {
    const r = document.createRange();
    r.selectNodeContents(node);
    return r.getBoundingClientRect();
  };

  // 1. Horizontal scroll of the page
  const de = document.documentElement;
  if (de.scrollWidth > vw + 1) {
    const culprits = [...document.body.querySelectorAll('*')].filter((e) => shown(e) && e.getBoundingClientRect().right > vw + 1 && getComputedStyle(e).position !== 'fixed').slice(0, 3);
    add('horizontal-scroll', de, `the page overflows by ${de.scrollWidth - vw}px at ${vw}px wide; candidates: ${culprits.map(label).join(' | ') || 'unknown'}`);
  }

  // 2. Touch targets that are too small (WCAG 2.5.8: 24px; mobile: 44px)
  const min = narrow ? 44 : 24;
  const interactive = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=link], [role=menuitem], [role=switch], [role=checkbox]';
  for (const el of document.querySelectorAll(interactive)) {
    if (!shown(el)) continue;
    const cs = getComputedStyle(el);
    if (el.tagName === 'A' && cs.display === 'inline' && el.closest('p, li, td, dd, label, span')) continue; // link inside a sentence: exempt
    let box = el.getBoundingClientRect();
    if (/^(checkbox|radio)$/.test(el.type) && el.labels && el.labels[0]) box = el.labels[0].getBoundingClientRect();
    if (box.width < min || box.height < min) add('touch-target', el, `${Math.round(box.width)}×${Math.round(box.height)}px, minimum ${min}px`);
  }

  // 3. Text that is too small
  const seenSmall = new Set();
  for (const n of textNodes(document.body)) {
    const p = n.parentElement;
    if (seenSmall.has(p) || !shown(p)) continue;
    const fs = parseFloat(getComputedStyle(p).fontSize);
    if (fs < 12) { seenSmall.add(p); add('small-text', p, `${fs}px (minimum 12px)`); }
  }

  // 4. Text cut off without an ellipsis, and text that spills out of its surface
  for (const el of document.body.querySelectorAll('*')) {
    if (!shown(el)) continue;
    const own = [...el.childNodes].some((c) => c.nodeType === 3 && c.nodeValue.trim());
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (/hidden|clip/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1 && cs.textOverflow !== 'ellipsis')
      add('clipped-text', el, `cut off on the right by ${el.scrollWidth - el.clientWidth}px, no ellipsis`);
    if (/hidden|clip/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1 && !cs.webkitLineClamp?.match(/^[1-9]/) && cs.display !== '-webkit-box')
      add('clipped-text', el, `cut off at the bottom by ${el.scrollHeight - el.clientHeight}px, no line-clamp`);
  }

  // 5. Text touching the edge of its surface (card, button, chip) or of the viewport
  const edgeSeen = new Set();
  for (const n of textNodes(document.body)) {
    const p = n.parentElement;
    if (!shown(p)) continue;
    let s = p;
    while (s && s !== document.body && s !== de && !isSurface(s)) s = s.parentElement;
    const viewportEdge = !s || s === document.body || s === de;
    const box = viewportEdge ? { left: 0, right: de.clientWidth, top: -Infinity, bottom: Infinity } : s.getBoundingClientRect();
    if (!viewportEdge && edgeSeen.has(s)) continue;
    const r = rangeRect(n);
    const sx = viewportEdge ? scrollX : 0; // page edge: document coordinates, independent of horizontal scroll
    const hMin = viewportEdge ? 8 : 5;
    const left = r.left + sx - box.left, right = box.right - (r.right + sx);
    const top = r.top - box.top, bottom = box.bottom - r.bottom;
    const where = [];
    if (left < hMin) where.push(`left ${Math.round(left)}px`);
    if (right < hMin) where.push(`right ${Math.round(right)}px`);
    if (!viewportEdge && top < 3) where.push(`top ${Math.round(top)}px`);
    if (!viewportEdge && bottom < 3) where.push(`bottom ${Math.round(bottom)}px`);
    if (where.length) {
      if (!viewportEdge) edgeSeen.add(s);
      add('text-touching-edge', viewportEdge ? p : s, `text "${n.nodeValue.trim().slice(0, 18)}" at ${where.join(', ')} from the ${viewportEdge ? 'page edge (gutter)' : 'edge of its surface'}`);
    }
    if (!viewportEdge && (r.right > box.right + 1 || r.left < box.left - 1)) add('text-spill', s, `text "${n.nodeValue.trim().slice(0, 18)}" goes past its surface by ${Math.round(Math.max(r.right - box.right, box.left - r.left))}px`);
  }

  // 6. Uneven inner padding on a control (left ≠ right)
  for (const el of document.querySelectorAll('button, a[href], [role=button], [role=tab], input:not([type=hidden]), select')) {
    if (!shown(el) || !isSurface(el)) continue;
    const cs = getComputedStyle(el);
    const l = parseFloat(cs.paddingLeft), r = parseFloat(cs.paddingRight);
    if (Math.abs(l - r) > 2 && el.tagName !== 'SELECT') add('uneven-padding', el, `left padding ${l}px, right padding ${r}px`);
  }

  // 7. Single word at the end of a paragraph, unit split from its number
  const UNIT = /^(€|%|\$|£|kg|g|km|m|cm|h|min|s|ms|px|mo|go|ko|mb|gb|kb)$/i;
  let wrapChecked = 0;
  for (const el of document.body.querySelectorAll('p, h1, h2, h3, h4, li, label, button, a[href], td, dd, figcaption')) {
    if (wrapChecked > 400 || !shown(el)) continue;
    const words = [];
    for (const n of textNodes(el)) {
      const re = /\S+/g;
      let m;
      while ((m = re.exec(n.nodeValue))) {
        const r = document.createRange();
        r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
        const b = r.getClientRects()[0];
        if (b) words.push({ w: m[0], top: Math.round(b.top) });
      }
    }
    if (words.length < 3 || words.length > 80) continue;
    wrapChecked++;
    const lastTop = Math.max(...words.map((x) => x.top));
    if (words.every((x) => x.top === lastTop)) continue;
    const last = words.filter((x) => x.top === lastTop);
    const idx = words.indexOf(last[0]);
    const prev = idx > 0 ? words[idx - 1].w : '';
    if (last.length === 1 && UNIT.test(last[0].w) && /\d/.test(prev)) add('unit-wrapped', el, `"${prev} ${last[0].w}" split by a line break`);
    else if (last.length === 1 && (last[0].w.length <= 4 || /^H[1-4]$/.test(el.tagName))) add('orphan-word', el, `"${last[0].w}" alone on the last line`);
  }

  // 8. Emoji used in place of an icon (messages and reactions excepted, judge on the screenshot)
  for (const el of document.querySelectorAll('button, a[href], [role=tab], [role=menuitem], label, th, nav *, h1, h2, h3, h4')) {
    if (!shown(el) || el.closest('[data-emoji], .message, .reaction')) continue;
    const t = [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.nodeValue).join('');
    if (/\p{Extended_Pictographic}/u.test(t)) add('emoji-icon', el, `emoji "${t.match(/\p{Extended_Pictographic}/u)[0]}" used as an interface icon`);
  }

  // 9. SVG icon cut by its viewBox
  for (const svg of document.querySelectorAll('svg[viewBox]')) {
    if (!shown(svg) || getComputedStyle(svg).overflow === 'visible') continue;
    try {
      const vb = svg.viewBox.baseVal, bb = svg.getBBox();
      if (!vb.width || !bb.width) continue;
      const stroked = [...svg.querySelectorAll('*')].map((c) => getComputedStyle(c)).find((c) => c.stroke !== 'none' && parseFloat(c.strokeWidth) > 0);
      const sw = stroked ? parseFloat(stroked.strokeWidth) / 2 : 0;
      const over = Math.max(vb.x - (bb.x - sw), vb.y - (bb.y - sw), (bb.x + bb.width + sw) - (vb.x + vb.width), (bb.y + bb.height + sw) - (vb.y + vb.height));
      if (over > 0.3) add('clipped-glyph', svg, `the stroke goes past the viewBox by ${over.toFixed(1)} units`);
    } catch (e) { /* SVG not measurable: ignored */ }
  }

  // 10. Dead links, fields without a label, controls without a name
  for (const a of document.querySelectorAll('a[href="#"], a[href=""], a[href^="javascript:"]')) if (shown(a)) add('dead-link', a, `href="${a.getAttribute('href')}"`);
  for (const f of document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea')) {
    if (!shown(f)) continue;
    if (!(f.labels && f.labels.length) && !f.getAttribute('aria-label') && !f.getAttribute('aria-labelledby')) add('unlabeled-field', f, f.placeholder ? `placeholder "${f.placeholder.slice(0, 20)}" without a label` : 'no label');
  }
  for (const c of document.querySelectorAll('button, a[href], [role=button]')) {
    if (!shown(c)) continue;
    if (!c.textContent.trim() && !c.getAttribute('aria-label') && !c.getAttribute('aria-labelledby') && !c.getAttribute('title') && !c.querySelector('img[alt]:not([alt=""])')) add('unnamed-control', c, 'icon only, no accessible name');
  }

  // 11. Images without dimensions (layout jump risk) and measured cumulative shift
  for (const img of document.querySelectorAll('img')) {
    if (!shown(img) || (img.getAttribute('width') && img.getAttribute('height')) || getComputedStyle(img).aspectRatio !== 'auto') continue;
    add('image-unsized', img, 'no width/height and no aspect-ratio: the page can jump on load');
  }
  const cls = await new Promise((res) => {
    try {
      let v = 0;
      const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) v += e.value; });
      po.observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => { po.disconnect(); res(v); }, 60);
    } catch (e) { res(null); }
  });
  if (cls !== null && cls > 0.1) add('layout-shift', de, `cumulative shift ${cls.toFixed(3)} (threshold 0.1)`);

  return { viewport: { w: vw, h: innerHeight }, layoutShift: cls, counts, findings: out };
}
