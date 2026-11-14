/* Kassen-Check: kurze Antwort je Kasse, Beträge stehen im Krankenkassen-Kompass.
   Einbinden mit <div id="kassen-check"></div> und <script src="/kassen-check.js" defer></script>.
   Kassenliste passend zum Kompass, Stand Oktober 2026. */
(function () {
  var ziel = document.getElementById('kassen-check');
  if (!ziel) return;

  var ZWEI = 'bezuschusst bis zu zwei Präventionskurse im Jahr.';
  var KASSEN = [
    ['AOK Niedersachsen', 'Die AOK Niedersachsen ' + ZWEI],
    ['Techniker Krankenkasse (TK)', 'Die TK ' + ZWEI + ' Deine Bescheinigung reichst du über die TK-App ein.'],
    ['BARMER', 'Die BARMER ' + ZWEI + ' Für Live-Online-Kurse gilt bei ihr ein eigener Betrag.'],
    ['DAK-Gesundheit', 'Die DAK-Gesundheit ' + ZWEI],
    ['KKH', 'Die KKH ' + ZWEI],
    ['hkk', 'Die hkk ' + ZWEI],
    ['IKK classic', 'Die IKK classic ' + ZWEI],
    ['BKK firmus', 'Die BKK firmus ' + ZWEI],
    ['Andere gesetzliche Kasse', 'Auch deine Kasse fördert zertifizierte Präventionskurse nach §20 SGB V. Wie viel sie zahlt, legt sie selbst fest. Frag mit der Kurs-ID kurz bei ihr nach.'],
    ['Privat versichert oder Beihilfe', 'Hier entscheidet dein Tarif. Frag vor Kursbeginn mit der Kurs-ID bei deiner Versicherung nach, ob sie den Kurs übernimmt.']
  ];

  var css =
    '.kc{max-width:720px;margin:64px auto 70px;padding:0 22px;font-family:"DM Sans",Arial,sans-serif;color:#3D2B22}' +
    '.kc-box{background:#F0E8DE;border-radius:20px;padding:34px 30px}' +
    '.kc-eyebrow{font-size:.72rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#7A9E7E;margin:0 0 10px}' +
    '.kc h2{font-family:"Cormorant Garamond",Georgia,serif;font-weight:500;font-size:clamp(1.9rem,4vw,2.4rem);line-height:1.1;margin:0 0 18px}' +
    '.kc label{display:block;font-size:.88rem;font-weight:500;margin-bottom:6px}' +
    '.kc select{width:100%;font:inherit;font-size:1rem;color:#3D2B22;background:#fff;border:1px solid #e2d5c8;border-radius:10px;padding:13px 14px}' +
    '.kc select:focus{outline:2px solid #7A9E7E;outline-offset:1px}' +
    '.kc-antwort{margin-top:20px;background:#fff;border-radius:14px;padding:20px 22px;line-height:1.65}' +
    '.kc-ja{font-family:"Cormorant Garamond",Georgia,serif;font-size:1.5rem;font-weight:500;color:#993A74;margin:0 0 4px}' +
    '.kc-schritte{margin:14px 0 0;padding:0;list-style:none;counter-reset:s}' +
    '.kc-schritte li{counter-increment:s;position:relative;padding:0 0 8px 34px;font-size:.95rem}' +
    '.kc-schritte li:before{content:counter(s);position:absolute;left:0;top:1px;width:24px;height:24px;border-radius:50%;background:#7A9E7E;color:#fff;font-size:.78rem;font-weight:600;display:flex;align-items:center;justify-content:center}' +
    '.kc-cta{margin-top:16px;padding-top:16px;border-top:1px solid #F0E8DE}' +
    '.kc-cta p{margin:0 0 14px;font-size:.95rem}' +
    '.kc-btn{display:inline-block;background:#993A74;color:#fff;font-size:.78rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:999px}' +
    '.kc-btn:hover,.kc-btn:focus-visible{background:#7a2d5c;color:#fff}' +
    '@media(max-width:600px){.kc-box{padding:26px 20px}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  ziel.className = 'kc';
  ziel.innerHTML =
    '<div class="kc-box"><p class="kc-eyebrow">Kassen-Check</p><h2>Zahlt deine Krankenkasse mit?</h2>' +
    '<label for="kc-wahl">Deine Krankenkasse</label><select id="kc-wahl"><option value="">Bitte wählen</option>' +
    KASSEN.map(function (k, i) { return '<option value="' + i + '">' + k[0] + '</option>'; }).join('') +
    '</select><div class="kc-antwort" id="kc-antwort" hidden aria-live="polite"></div></div>';

  var wahl = document.getElementById('kc-wahl'), antwort = document.getElementById('kc-antwort');
  wahl.addEventListener('change', function () {
    if (wahl.value === '') { antwort.hidden = true; return; }
    var i = +wahl.value, k = KASSEN[i], privat = i === KASSEN.length - 1;
    antwort.innerHTML =
      '<p class="kc-ja">' + (privat ? 'Kommt auf deinen Tarif an.' : 'Ja, deine Kasse zahlt mit.') + '</p><p>' + k[1] + '</p>' +
      (privat ? '' :
        '<ol class="kc-schritte"><li>Du buchst den Kurs und zahlst die Kursgebühr.</li>' +
        '<li>Nach dem letzten Termin bekommst du von mir deine Teilnahmebescheinigung.</li>' +
        '<li>Du reichst sie bei deiner Kasse ein und bekommst den Zuschuss aufs Konto.</li></ol>' +
        '<div class="kc-cta"><p>Wie viel du zurückbekommst und was dein Eigenanteil ist, steht im Krankenkassen-Kompass. Mit den Beträgen der großen Kassen und einer Checkliste zum Abhaken.</p>' +
        '<a class="kc-btn" href="/krankenkassen-kompass#anmeldung">Kompass kostenlos holen</a></div>');
    antwort.hidden = false;
    var feld = document.querySelector('input[name="Krankenkasse"]');
    if (feld && !feld.value && i < KASSEN.length - 2) feld.value = k[0];
    if (window.plausible) window.plausible('Kassen-Check', { props: { kasse: k[0] } });
  });
})();
