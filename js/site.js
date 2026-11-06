/* Greenlight Studios site: the pixel night sky behind the hero, the start-light on the logo,
   scroll reveals, and the download buttons filled in from data/builds.js (written by site/sync.py). */
(() => {
  'use strict';
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- hero sky ---------------- */
  const cv = document.getElementById('sky');
  if (cv) {
    const ctx = cv.getContext('2d');
    // top of the sky down to the horizon, the same dusk ramp as Pixel Smash's title screen
    const SKY = ['#090c20', '#0e1230', '#15163c', '#1f1946', '#2c1d4e', '#3e2154', '#562657', '#742c58', '#9a3656', '#c24a52', '#e0684c', '#f08a4e'];
    let W = 0, H = 0, HOR = 0, bg = null, far = null, near = null, stars = [], shoot = null, t0 = performance.now(), run = true, raf = 0;

    // a tiny seeded random so the scene looks the same on every load
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

    function ridge(w, base, amp, ks, col, top) {
      // a seamless mountain strip: sums of sines whose periods divide the width, so it tiles while scrolling
      const c = document.createElement('canvas'); c.width = w; c.height = H; const x2 = c.getContext('2d');
      const ph = ks.map(() => rnd() * Math.PI * 2);
      for (let x = 0; x < w; x++) {
        let h = 0; ks.forEach((k, i) => { h += Math.sin((x / w) * Math.PI * 2 * k + ph[i]) / (i + 1); });
        const y = Math.round(base - amp * (0.55 + h * 0.45));
        x2.fillStyle = col; x2.fillRect(x, y, 1, HOR - y + 1);
        if (top) { x2.fillStyle = top; x2.fillRect(x, y, 1, 1); }
      }
      return c;
    }

    function build() {
      const r = cv.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;                 // not laid out yet (hidden tab, print); the resize handler retries
      const p =Math.max(3, Math.round(r.width / 300));        // size of one sky pixel on screen
      W = Math.ceil(r.width / p); H = Math.ceil(r.height / p); HOR = Math.round(H * 0.8);
      cv.width = W; cv.height = H; seed = 7;

      bg = document.createElement('canvas'); bg.width = W; bg.height = H;
      const b = bg.getContext('2d'), band = HOR / SKY.length;
      for (let y = 0; y < HOR; y++) {
        const i = Math.min(SKY.length - 1, Math.floor(y / band)), f = (y - i * band) / band;
        for (let x = 0; x < W; x++) {
          // ordered dither in the last third of each band blends it into the next colour
          const next = i < SKY.length - 1 && f > 0.66 && ((x + y) % 2 === 0 || (f > 0.83 && x % 2 === 0));
          b.fillStyle = SKY[next ? i + 1 : i]; b.fillRect(x, y, 1, 1);
        }
      }
      // the moon
      const mx = Math.round(W * 0.82), my = Math.round(HOR * 0.22), mr = Math.max(5, Math.round(H * 0.045));
      for (let y = -mr - 3; y <= mr + 3; y++) for (let x = -mr - 3; x <= mr + 3; x++) {
        const d = Math.hypot(x, y);
        if (d <= mr) { b.fillStyle = (x + y > mr * 0.6) ? '#d9cfae' : '#f6efd6'; b.fillRect(mx + x, my + y, 1, 1); }
        else if (d <= mr + 3 && (x + y) % 2 === 0) { b.fillStyle = 'rgba(246,239,214,.12)'; b.fillRect(mx + x, my + y, 1, 1); }
      }
      b.fillStyle = '#cfc4a2'; [[-2, -1, 2], [2, 2, 1], [-1, 3, 1]].forEach(([x, y, s]) => b.fillRect(mx + x, my + y, s, s));
      // the ground and the road
      b.fillStyle = '#100c1e'; b.fillRect(0, HOR, W, H - HOR);
      b.fillStyle = '#2a1d42'; b.fillRect(0, HOR, W, 1);
      const r0 = HOR + Math.max(4, Math.round((H - HOR) * 0.3)), r1 = H - Math.max(2, Math.round((H - HOR) * 0.14));
      b.fillStyle = '#23253c'; b.fillRect(0, r0, W, r1 - r0);
      b.fillStyle = '#2e3150'; b.fillRect(0, r0 + 2, W, 1);
      for (let x = 0; x < W; x += 4) { b.fillStyle = (x / 4) % 2 ? '#f1f2e4' : '#e2283a'; b.fillRect(x, r0 - 2, 4, 2); b.fillRect(x, r1, 4, 2); }
      build.road = [r0, r1];

      far = ridge(W, HOR - 1, HOR * 0.26, [2, 5, 11], '#3a2150', '#5a2e5c');
      near = ridge(W, HOR, HOR * 0.15, [3, 7, 13], '#1d1533', '#2f2148');

      stars = [];
      const n = Math.round((W * HOR) / 140);
      for (let i = 0; i < n; i++) {
        const y = Math.floor(Math.pow(rnd(), 1.6) * HOR * 0.72);
        stars.push({ x: Math.floor(rnd() * W), y, ph: rnd() * 6.28, sp: 0.6 + rnd() * 2.2, big: rnd() < 0.07, c: ['#ffffff', '#d4dcff', '#ffe9b8'][Math.floor(rnd() * 3)] });
      }
      draw(performance.now());
    }

    function draw(now) {
      if (!bg) return;
      const t = (now - t0) / 1000;
      ctx.drawImage(bg, 0, 0);
      for (const s of stars) {
        const v = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
        if (v < 0.18) continue;
        ctx.globalAlpha = 0.35 + v * 0.65; ctx.fillStyle = s.c; ctx.fillRect(s.x, s.y, 1, 1);
        if (s.big && v > 0.7) { ctx.globalAlpha = (v - 0.7) * 2.5; ctx.fillRect(s.x - 1, s.y, 3, 1); ctx.fillRect(s.x, s.y - 1, 1, 3); }
      }
      ctx.globalAlpha = 1;
      // a shooting star now and then
      if (!still) {
        if (!shoot && Math.random() < 0.004) shoot = { x: Math.random() * W * 0.7, y: Math.random() * HOR * 0.3, l: 0 };
        if (shoot) {
          shoot.l += 1;
          for (let i = 0; i < 9; i++) { ctx.globalAlpha = 1 - i / 9; ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(shoot.x + shoot.l * 2.4 - i * 2), Math.round(shoot.y + shoot.l * 1.1 - i), 1, 1); }
          ctx.globalAlpha = 1; if (shoot.l > 40) shoot = null;
        }
      }
      const fo = still ? 0 : Math.floor((t * 3) % W), no = still ? 0 : Math.floor((t * 9) % W);
      ctx.drawImage(far, -fo, 0); ctx.drawImage(far, W - fo, 0);
      ctx.drawImage(near, -no, 0); ctx.drawImage(near, W - no, 0);
      // centre line rushes past, the Kart nod
      const [r0, r1] = build.road, my = Math.round((r0 + r1) / 2), off = still ? 0 : Math.floor((t * 90) % 16);
      ctx.fillStyle = '#ecc45a';
      for (let x = -off; x < W; x += 16) ctx.fillRect(x, my, 8, 1);
    }

    let last = 0;
    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return;                       // ~30 fps is plenty for pixel art
      last = now; draw(now);
    }
    function start() { if (!still && run && !raf && !document.hidden) raf = requestAnimationFrame(loop); }
    function stop() { cancelAnimationFrame(raf); raf = 0; }

    build();
    let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(build, 120); });
    new IntersectionObserver(([e]) => { run = e.isIntersecting; run ? start() : stop(); }).observe(cv);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    start();
  }

  /* ---------------- start light on the logo: red, amber, green ---------------- */
  const mark = document.getElementById('mark');
  if (mark && !still) {
    mark.classList.add('s-off');
    const seq = [['s-red', 350], ['s-amber', 900], [null, 1450]];
    seq.forEach(([c, ms]) => setTimeout(() => { mark.classList.remove('s-off', 's-red', 's-amber'); if (c) mark.classList.add(c); }, ms));
  }

  /* ---------------- scroll reveals ---------------- */
  const io = 'IntersectionObserver' in window && new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rise').forEach((el) => io ? io.observe(el) : el.classList.add('in'));

  /* ---------------- downloads from data/builds.js ---------------- */
  const B = window.GL_BUILDS;
  const mb = (n) => (n / 1048576).toFixed(1) + ' MB';
  if (B) {
    document.querySelectorAll('.dl-card').forEach((card) => {
      const g = B.games[card.dataset.game];
      if (!g) return;
      const ver = card.querySelector('[data-ver]');
      if (ver) ver.textContent = 'Version ' + B.version + ' · updated ' + (g.html.date || B.synced);
      const h = card.querySelector('[data-kind=html]');
      h.querySelector('[data-size]').textContent = '.html · ' + mb(g.html.size);
      const ha = h.querySelector('a.btn'); ha.href = g.html.file; ha.setAttribute('download', g.html.saveAs);
      const a = card.querySelector('[data-kind=apk]');
      if (g.apk) {
        const badge = a.querySelector('[data-badge]'); badge.textContent = 'BETA'; badge.className = 'badge beta';
        a.querySelector('[data-size]').textContent = '.apk · ' + mb(g.apk.size) + ' · early build';
        const btn = a.querySelector('.btn');
        btn.removeAttribute('aria-disabled'); btn.removeAttribute('role');
        btn.href = g.apk.file; btn.setAttribute('download', g.apk.file.split('/').pop());
      }
    });
    const bl = document.querySelector('[data-bundle]');
    if (B.bundle && bl) {
      bl.href = B.bundle.file; bl.setAttribute('download', B.bundle.file.split('/').pop());
      document.querySelector('[data-bsize]').textContent = 'Both browser builds in one .zip (' + mb(B.bundle.size) + '), with a quick-start readme.';
    } else if (bl) document.getElementById('bundle').hidden = true;
  } else {
    const bundle = document.getElementById('bundle'); if (bundle) bundle.hidden = true;
  }

  const yr = document.getElementById('yr'); if (yr) yr.textContent = new Date().getFullYear();
})();
