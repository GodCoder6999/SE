/* SE Diagram Portfolio — theme toggle, lightbox, scroll-spy */
(function () {
  'use strict';

  /* ---------- theme ---------------------------------------------------- */
  var root = document.documentElement;
  var KEY = 'se-theme';

  try {
    var saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);
  } catch (e) { /* storage blocked — fall back to the OS preference */ }

  var btn = document.getElementById('theme');
  if (btn) {
    btn.addEventListener('click', function () {
      var prefersDark = window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      var current = root.getAttribute('data-theme') || (prefersDark ? 'dark' : 'light');
      var next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* ignore */ }
    });
  }

  /* ---------- lightbox -------------------------------------------------- */
  var box = document.getElementById('lightbox');
  var boxImg = document.getElementById('lbImg');
  var boxCap = document.getElementById('lbCap');
  var boxClose = document.getElementById('lbClose');
  var lastFocus = null;

  function open(src, caption, trigger) {
    if (!box) return;
    lastFocus = trigger || null;
    boxImg.setAttribute('src', src);
    boxImg.setAttribute('alt', caption || '');
    boxCap.textContent = caption || '';
    box.hidden = false;
    document.body.classList.add('lb-open');
    boxClose.focus();
  }

  function close() {
    if (!box || box.hidden) return;
    box.hidden = true;
    boxImg.setAttribute('src', '');
    document.body.classList.remove('lb-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.querySelectorAll('.viewer img').forEach(function (img) {
    img.addEventListener('click', function () {
      open(img.getAttribute('data-full') || img.getAttribute('src'),
           img.getAttribute('data-caption') || img.getAttribute('alt'), img);
    });
  });

  if (boxClose) boxClose.addEventListener('click', close);
  if (box) {
    box.addEventListener('click', function (ev) {
      if (ev.target === box || ev.target === boxImg.parentNode) close();
    });
  }
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') close();
  });

  /* ---------- scroll-spy on the main nav -------------------------------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.mainnav a'));
  var targets = links
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && targets.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + entry.target.id;
          a.style.background = on ? 'var(--brand-050)' : '';
          a.style.color = on ? 'var(--brand-700)' : '';
        });
      });
    }, { rootMargin: '-72px 0px -62% 0px', threshold: 0 });
    targets.forEach(function (t) { spy.observe(t); });
  }
})();
