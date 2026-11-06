/* Website ads (Google AdSense). Ads sit around the game on the page, never inside it:
   the games served here are the ad-free builds. Does nothing until data/adsense.js has a publisher id. */
(() => {
  'use strict';
  const C = window.GL_ADSENSE || {}, client = C.client || '', slots = C.slots || {};
  if (!/^ca-pub-\d{10,20}$/.test(client)) return;
  document.documentElement.classList.add('ads-on');
  const s = document.createElement('script');
  s.async = true; s.crossOrigin = 'anonymous';
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + client;
  document.head.appendChild(s);
  for (const box of document.querySelectorAll('[data-ad]')) {
    const id = slots[box.dataset.ad];
    if (!id) continue;
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.dataset.adClient = client;
    ins.dataset.adSlot = id;
    ins.dataset.adFormat = box.dataset.fmt || 'auto';
    if (box.dataset.fmt !== 'vertical') ins.dataset.fullWidthResponsive = 'true';
    box.appendChild(ins);
    box.classList.add('ad-live');
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  }
})();
