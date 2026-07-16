/* ============================================================================
   app.js — UI layer only.
   ----------------------------------------------------------------------------
   Every actual Unicode <-> Bijoy conversion happens inside fontconverter.js,
   which is untouched and loaded before this file. This file only:
     - wires up theme switching, counters, auto-grow, ripple, toast
     - adds Swap / Paste, which fontconverter.js doesn't define
     - adds keyboard shortcuts
   It reuses fontconverter.js's own globals (displayCopyBtn, setBijoyFont,
   clearAllText, convertToBijoy, convertToUnicode, Insert) wherever possible
   instead of re-implementing that behaviour.
   ============================================================================ */

(function () {
  'use strict';

  var uniText   = document.getElementById('uniText');
  var bijoyText = document.getElementById('bijoyText');
  var toastEl   = document.getElementById('toast');
  var flowDot   = document.getElementById('flowDot');

  var lastOutput = null; // 'uniText' | 'bijoyText' — tracks the box most recently produced by a conversion or swap, for the copy-output shortcut

  var AUTO_KEY = 'ub_converter_auto';
  var autoToggle = document.getElementById('autoConvertToggle');

  /* --------------------------------------------------------------------
     THEME TOGGLE
  -------------------------------------------------------------------- */
  var THEME_KEY = 'ub_converter_theme';
  var themeToggle = document.getElementById('themeToggle');

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* storage unavailable — theme just won't persist */ }
  }

  themeToggle.setAttribute('aria-pressed', currentTheme() === 'light' ? 'true' : 'false');
  themeToggle.addEventListener('click', function () {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });


  /* --------------------------------------------------------------------
     AUTO-CONVERT TOGGLE
     When ON (default), typing in either box converts live into the other.
  -------------------------------------------------------------------- */
  function autoConvertEnabled() {
    var saved;
    try { saved = localStorage.getItem(AUTO_KEY); } catch (e) { saved = null; }
    return saved === null ? true : saved === 'on';
  }

  function applyAutoToggle(on) {
    autoToggle.classList.toggle('is-on', on);
    autoToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    try { localStorage.setItem(AUTO_KEY, on ? 'on' : 'off'); } catch (e) { /* storage unavailable */ }
  }

  applyAutoToggle(autoConvertEnabled());
  autoToggle.addEventListener('click', function () {
    applyAutoToggle(!autoToggle.classList.contains('is-on'));
    showToast(autoToggle.classList.contains('is-on') ? 'অটো কনভার্ট চালু' : 'অটো কনভার্ট বন্ধ');
  });

  var autoTimer = null;
  function autoConvertFrom(source) {
    if (!autoToggle.classList.contains('is-on')) return;
    if (source === 'uniText') {
      convertToBijoy();
      refreshBijoyCounters();
      autoGrow(bijoyText);
      lastOutput = 'bijoyText';
    } else {
      convertToUnicode();
      refreshUniCounters();
      autoGrow(uniText);
      lastOutput = 'uniText';
    }
  }


  /* --------------------------------------------------------------------
     TOAST
  -------------------------------------------------------------------- */
  var toastTimer = null;
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2000);
  }


  /* --------------------------------------------------------------------
     COUNTERS (characters / words / lines)
  -------------------------------------------------------------------- */
  function countWords(value) {
    var trimmed = value.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }

  function updateCounters(el, charsId, wordsId, linesId) {
    var value = el.value;
    document.getElementById(charsId).textContent = value.length;
    document.getElementById(wordsId).textContent = countWords(value);
    document.getElementById(linesId).textContent = value ? value.split('\n').length : 0;
  }

  function refreshUniCounters()   { updateCounters(uniText, 'uniChars', 'uniWords', 'uniLines'); }
  function refreshBijoyCounters() { updateCounters(bijoyText, 'bijoyChars', 'bijoyWords', 'bijoyLines'); }


  /* --------------------------------------------------------------------
     AUTO-GROW TEXTAREAS
     Grows with content up to a sensible cap, then scrolls. Users can still
     drag the native resize handle (CSS `resize: vertical` stays enabled).
  -------------------------------------------------------------------- */
  function autoGrow(el) {
    var cap = window.innerWidth < 640 ? 320 : 460;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, cap) + 'px';
  }


  /* --------------------------------------------------------------------
     RIPPLE (applied to every .btn / .icon-btn on click)
  -------------------------------------------------------------------- */
  function attachRipple(el) {
    el.addEventListener('click', function (e) {
      var existing = el.querySelector('.ripple');
      if (existing) existing.remove();

      var rect = el.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      var circle = document.createElement('span');
      circle.className = 'ripple';
      circle.style.width = circle.style.height = size + 'px';
      circle.style.left = ((e.clientX || rect.left + rect.width / 2) - rect.left - size / 2) + 'px';
      circle.style.top = ((e.clientY || rect.top + rect.height / 2) - rect.top - size / 2) + 'px';
      el.appendChild(circle);
      setTimeout(function () { circle.remove(); }, 600);
    });
  }
  document.querySelectorAll('.btn, .icon-btn').forEach(attachRipple);


  /* --------------------------------------------------------------------
     FLOW-LINE PULSE
     Small visual confirmation of which direction just fired.
  -------------------------------------------------------------------- */
  function pulseFlow(direction) {
    flowDot.classList.remove('run-down', 'run-up');
    // reflow so the animation can restart even if fired twice in a row
    void flowDot.offsetWidth;
    flowDot.classList.add(direction === 'toBijoy' ? 'run-down' : 'run-up');
  }


  /* --------------------------------------------------------------------
     CLIPBOARD HELPERS (with graceful fallback for older browsers)
  -------------------------------------------------------------------- */
  function copyFromTextarea(el, label) {
    var text = el.value;
    if (!text) { showToast('কপি করার মতো কিছু নেই'); return; }

    function done() { showToast(label + ' কপি হয়েছে ✓'); }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { legacyCopy(el, done); });
    } else {
      legacyCopy(el, done);
    }
  }

  function legacyCopy(el, done) {
    try {
      el.focus();
      el.select();
      document.execCommand('copy');
      done();
    } catch (e) {
      showToast('কপি ব্যর্থ হয়েছে — ম্যানুয়ালি Ctrl+C চাপুন');
    }
  }

  function pasteIntoTextarea(el) {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (text) {
        if (!text) return;
        el.focus();
        Insert(el, text); // reuses fontconverter.js's own cursor-aware insert helper
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, function () {
        el.focus();
        showToast('ব্রাউজার ক্লিপবোর্ড ব্লক করেছে — Ctrl+V চাপুন');
      });
    } else {
      el.focus();
      showToast('ম্যানুয়ালি পেস্ট করতে Ctrl+V চাপুন');
    }
  }


  /* --------------------------------------------------------------------
     SWAP — exchanges the raw contents of the two boxes (no conversion).
     Reuses fontconverter.js's own setBijoyFont/displayCopyBtn so the
     Bijoy font class and copy-button visibility stay in sync.
  -------------------------------------------------------------------- */
  function swapBoxes() {
    var u = uniText.value;
    var b = bijoyText.value;
    uniText.value = b;
    bijoyText.value = u;

    setBijoyFont();
    displayCopyBtn('unicode');
    displayCopyBtn('bijoy');
    refreshUniCounters();
    refreshBijoyCounters();
    autoGrow(uniText);
    autoGrow(bijoyText);
    showToast('বক্স সোয়াপ হয়েছে');
  }


  /* --------------------------------------------------------------------
     WIRE UP EVENTS
  -------------------------------------------------------------------- */

  // Live counters + auto-grow while typing (native input events; these run
  // alongside fontconverter.js's own jQuery .bind("input propertychange"))
  uniText.addEventListener('input', function () {
    refreshUniCounters();
    autoGrow(uniText);
    clearTimeout(autoTimer);
    autoTimer = setTimeout(function () { autoConvertFrom('uniText'); }, 120);
  });
  bijoyText.addEventListener('input', function () {
    refreshBijoyCounters();
    autoGrow(bijoyText);
    clearTimeout(autoTimer);
    autoTimer = setTimeout(function () { autoConvertFrom('bijoyText'); }, 120);
  });

  // Convert buttons: fontconverter.js already wires click -> convertToBijoy()/
  // convertToUnicode() via its own DOMContentLoaded listener. We add a second
  // listener purely for counters/auto-grow/pulse/output-tracking.
  document.getElementById('btnToBijoy').addEventListener('click', function () {
    refreshBijoyCounters();
    autoGrow(bijoyText);
    pulseFlow('toBijoy');
    lastOutput = 'bijoyText';
  });
  document.getElementById('btnToUnicode').addEventListener('click', function () {
    refreshUniCounters();
    autoGrow(uniText);
    pulseFlow('toUnicode');
    lastOutput = 'uniText';
  });

  // Swap
  document.getElementById('btnSwap').addEventListener('click', function () {
    swapBoxes();
    lastOutput = null;
  });

  // Clear: fontconverter.js's own handler already empties both boxes and
  // updates the copy-button visibility. We just reset counters/heights too.
  document.getElementById('btnClearAll').addEventListener('click', function () {
    refreshUniCounters();
    refreshBijoyCounters();
    autoGrow(uniText);
    autoGrow(bijoyText);
    lastOutput = null;
    showToast('মুছে ফেলা হয়েছে');
  });

  // Copy
  document.getElementById('copyUnicode').addEventListener('click', function () { copyFromTextarea(uniText, 'Unicode'); });
  document.getElementById('copyBijoy').addEventListener('click', function () { copyFromTextarea(bijoyText, 'Bijoy'); });

  // Paste
  document.getElementById('pasteUnicode').addEventListener('click', function () { pasteIntoTextarea(uniText); });
  document.getElementById('pasteBijoy').addEventListener('click', function () { pasteIntoTextarea(bijoyText); });


  /* --------------------------------------------------------------------
     KEYBOARD SHORTCUTS
       Ctrl/Cmd + Enter        -> convert (direction follows focused box)
       Ctrl/Cmd + Shift + C    -> copy the most recent output
       Esc                     -> clear all
  -------------------------------------------------------------------- */
  document.addEventListener('keydown', function (e) {
    var mod = e.ctrlKey || e.metaKey;

    if (mod && e.key === 'Enter') {
      e.preventDefault();
      if (document.activeElement === bijoyText) {
        document.getElementById('btnToUnicode').click();
      } else {
        document.getElementById('btnToBijoy').click();
      }
      return;
    }

    if (mod && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      var target = lastOutput
        ? document.getElementById(lastOutput)
        : (document.activeElement === bijoyText ? bijoyText : uniText);
      copyFromTextarea(target, target === bijoyText ? 'Bijoy' : 'Unicode');
      return;
    }

    if (e.key === 'Escape') {
      document.getElementById('btnClearAll').click();
    }
  });


  /* --------------------------------------------------------------------
     INITIAL STATE
  -------------------------------------------------------------------- */
  refreshUniCounters();
  refreshBijoyCounters();
  autoGrow(uniText);
  autoGrow(bijoyText);

  window.addEventListener('resize', function () {
    autoGrow(uniText);
    autoGrow(bijoyText);
  });

})();
