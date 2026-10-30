/* Dezenter Hinweis auf den Nervensystem-Check.
   Erscheint, wenn die Hälfte der Seite gelesen ist. Nach dem Schließen 30 Tage nicht mehr. */
(function () {
  var KEY = 'bv-check-hinweis-zu';
  var TAGE = 30;
  var ZIEL = '/nervensystem-check';

  try {
    var zu = parseInt(localStorage.getItem(KEY) || '0', 10);
    if (zu && Date.now() - zu < TAGE * 864e5) return;
  } catch (e) {}

  var css =
    '#bv-hinweis{position:fixed;right:20px;bottom:20px;z-index:900;width:300px;max-width:calc(100vw - 32px);' +
    'background:#FAF6F1;border:1px solid #e2d5c8;border-left:4px solid #993A74;border-radius:14px;' +
    'box-shadow:0 10px 30px rgba(140,73,46,.18);padding:16px 40px 16px 18px;font-family:"DM Sans",Arial,sans-serif;' +
    'color:#3B2A22;opacity:0;transform:translateY(16px);transition:opacity .4s ease,transform .4s ease;pointer-events:none}' +
    '#bv-hinweis.zeigen{opacity:1;transform:none;pointer-events:auto}' +
    '#bv-hinweis .bvh-titel{font-family:"Cormorant Garamond",Georgia,serif;font-size:1.25rem;line-height:1.2;color:#8C492E;margin:0 0 4px;font-weight:600}' +
    '#bv-hinweis .bvh-text{font-size:.9rem;line-height:1.4;margin:0 0 12px}' +
    '#bv-hinweis .bvh-btn{display:inline-block;background:#993A74;color:#fff;text-decoration:none;font-weight:600;font-size:.85rem;' +
    'padding:9px 18px;border-radius:999px}' +
    '#bv-hinweis .bvh-btn:hover{background:#7a2d5c}' +
    '#bv-hinweis .bvh-zu{position:absolute;top:8px;right:8px;width:30px;height:30px;border:0;background:none;color:#7A6A60;' +
    'font-size:22px;line-height:1;cursor:pointer;border-radius:50%}' +
    '#bv-hinweis .bvh-zu:hover{background:#F0E8DE}' +
    '@media(max-width:600px){#bv-hinweis{left:0;right:0;bottom:0;width:auto;max-width:none;border-radius:14px 14px 0 0;' +
    'border-left:0;border-top:3px solid #993A74;display:flex;align-items:center;gap:12px;padding:12px 44px 12px 16px}' +
    '#bv-hinweis .bvh-titel{display:none}#bv-hinweis .bvh-text{margin:0;flex:1;font-size:.85rem}' +
    '#bv-hinweis .bvh-btn{white-space:nowrap;padding:8px 14px}}' +
    '@media(prefers-reduced-motion:reduce){#bv-hinweis{transition:none}}' +
    '@media print{#bv-hinweis{display:none}}';

  var box;
  function bauen() {
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    box = document.createElement('aside');
    box.id = 'bv-hinweis';
    box.setAttribute('aria-label', 'Hinweis auf den Nervensystem-Check');
    box.innerHTML =
      '<p class="bvh-titel">Wie angespannt ist dein Nervensystem?</p>' +
      '<p class="bvh-text"><span class="bvh-mobil">Wie angespannt ist dein Nervensystem? </span>Mach den 3-Minuten-Check.</p>' +
      '<a class="bvh-btn" href="' + ZIEL + '">Check starten</a>' +
      '<button class="bvh-zu" type="button" aria-label="Hinweis schließen">&times;</button>';
    document.body.appendChild(box);
    var mob = document.createElement('style');
    mob.textContent = '#bv-hinweis .bvh-mobil{display:none}@media(max-width:600px){#bv-hinweis .bvh-mobil{display:inline}}';
    document.head.appendChild(mob);
    box.querySelector('.bvh-zu').addEventListener('click', function () {
      box.classList.remove('zeigen');
      try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
      setTimeout(function () { box.remove(); }, 400);
    });
  }

  function pruefen() {
    var ck = document.getElementById('cookie');
    if (ck && ck.offsetParent !== null && getComputedStyle(ck).display !== 'none') return;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (h > 0 && window.scrollY / h >= 0.5) {
      window.removeEventListener('scroll', pruefen);
      if (!box) bauen();
      requestAnimationFrame(function () { box.classList.add('zeigen'); });
    }
  }

  window.addEventListener('scroll', pruefen, { passive: true });
})();
