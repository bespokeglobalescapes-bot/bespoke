/* Bespoke Global Escapes – site interactions (no dependencies) */
(function () {
  'use strict';
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // ---------- sticky header ----------
  var header = $('[data-header]');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-stuck', window.scrollY > 120); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---------- mobile nav ----------
  var toggle = $('[data-nav-toggle]');
  var nav = $('#main-nav');
  function setNav(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  if (toggle) {
    toggle.addEventListener('click', function () { setNav(!nav.classList.contains('is-open')); });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open') && !nav.contains(e.target) && !toggle.contains(e.target)) setNav(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });
  }

  // ---------- dropdown menus ----------
  var menus = $$('[data-menu]');
  function closeMenus(except) {
    menus.forEach(function (li) {
      if (li === except) return;
      li.classList.remove('is-open');
      var t = $('[data-menu-toggle]', li); if (t) t.setAttribute('aria-expanded', 'false');
    });
  }
  menus.forEach(function (li) {
    var t = $('[data-menu-toggle]', li);
    t.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !li.classList.contains('is-open');
      closeMenus(li);
      li.classList.toggle('is-open', open);
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('[data-menu]')) closeMenus(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var openLi = menus.filter(function (li) { return li.classList.contains('is-open'); })[0];
    closeMenus();
    if (openLi) $('[data-menu-toggle]', openLi).focus();
  });

  // ---------- flash ----------
  $$('[data-dismiss]').forEach(function (b) { b.addEventListener('click', function () { b.closest('.flash').remove(); }); });
  var flash = $('.flash');
  if (flash) setTimeout(function () { if (flash.isConnected) flash.remove(); }, 7000);

  // ---------- steppers ----------
  function syncStepper(st) {
    var input = $('[data-step-input]', st);
    var v = parseInt(input.value, 10) || 0;
    var min = parseInt(input.min, 10) || 0, max = parseInt(input.max, 10) || 99;
    v = Math.min(max, Math.max(min, v));
    input.value = v;
    $$('[data-step]', st).forEach(function (b) {
      var d = parseInt(b.getAttribute('data-step'), 10);
      b.disabled = d < 0 ? v <= min : v >= max;
    });
  }
  $$('[data-stepper]').forEach(function (st) {
    var input = $('[data-step-input]', st);
    $$('[data-step]', st).forEach(function (b) {
      b.addEventListener('click', function () {
        input.value = (parseInt(input.value, 10) || 0) + parseInt(b.getAttribute('data-step'), 10);
        syncStepper(st);
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    input.addEventListener('change', function () { syncStepper(st); });
    syncStepper(st);
  });

  // ---------- travellers popover ----------
  $$('[data-travellers]').forEach(function (box) {
    var btn = $('[data-trav-toggle]', box), pop = $('.trav-pop', box), sum = $('[data-trav-summary]', box);
    function update() {
      var a = parseInt($('input[name=adults]', box).value, 10) || 1;
      var c = parseInt($('input[name=children]', box).value, 10) || 0;
      sum.textContent = a + (a === 1 ? ' Adult' : ' Adults') + (c ? ', ' + c + (c === 1 ? ' Child' : ' Children') : '');
    }
    function open(v) { pop.hidden = !v; btn.setAttribute('aria-expanded', v ? 'true' : 'false'); }
    btn.addEventListener('click', function () { open(pop.hidden); });
    $('[data-trav-done]', box).addEventListener('click', function () { open(false); btn.focus(); });
    box.addEventListener('change', update);
    document.addEventListener('click', function (e) { if (!box.contains(e.target)) open(false); });
    box.addEventListener('keydown', function (e) { if (e.key === 'Escape') { open(false); btn.focus(); } });
  });

  // ---------- date pairing ----------
  var today = new Date(); today.setDate(today.getDate() + 1);
  var minDate = today.toISOString().slice(0, 10);
  $$('[data-date-from]').forEach(function (from) {
    var form = from.form, to = $('[data-date-to]', form);
    from.min = minDate;
    if (to) {
      to.min = from.value || minDate;
      from.addEventListener('change', function () {
        to.min = from.value || minDate;
        if (to.value && to.value < from.value) to.value = '';
      });
    }
  });

  // ---------- saved trips (this device) ----------
  var KEY = 'bge_saved';
  function getSaved() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function setSaved(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }
  function paintSaved() {
    var list = getSaved();
    $$('[data-save]').forEach(function (b) {
      var on = list.indexOf(b.getAttribute('data-save')) > -1;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      var lbl = $('[data-save-label]', b);
      if (lbl) lbl.textContent = on ? 'Saved' : 'Save';
    });
    $$('[data-saved-count]').forEach(function (el) { el.textContent = list.length; el.hidden = !list.length; });
    $$('[data-saved-dot]').forEach(function (el) { el.hidden = !list.length; });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-save]');
    if (!b) return;
    e.preventDefault();
    var key = b.getAttribute('data-save'), list = getSaved(), i = list.indexOf(key);
    if (i > -1) list.splice(i, 1); else list.push(key);
    setSaved(list);
    paintSaved();
    var holder = $('[data-saved-list]');
    if (holder && i > -1) loadSaved(holder);
  });
  paintSaved();

  function loadSaved(holder) {
    var list = getSaved();
    if (!list.length) { holder.innerHTML = $('#saved-empty').innerHTML; return; }
    fetch('/saved/cards?items=' + encodeURIComponent(list.join(',')), { headers: { Accept: 'text/html' } })
      .then(function (r) { return r.text(); })
      .then(function (h) { holder.innerHTML = h.trim() ? h : $('#saved-empty').innerHTML; paintSaved(); })
      .catch(function () { holder.innerHTML = '<p class="loading">We could not load your saved trips. Refresh to try again.</p>'; });
  }
  var savedHolder = $('[data-saved-list]');
  if (savedHolder) loadSaved(savedHolder);

  // ---------- modals ----------
  var lastFocus = null;
  function openModal(m) { lastFocus = document.activeElement; m.hidden = false; document.body.classList.add('modal-open'); var c = $('[data-close].modal-close', m) || $('.modal-close', m); if (c) c.focus(); }
  function closeModal(m) {
    m.hidden = true; document.body.classList.remove('modal-open');
    var frame = $('[data-video-frame]', m); if (frame) frame.innerHTML = '';
    if (lastFocus) lastFocus.focus();
  }
  $$('[data-modal]').forEach(function (m) {
    $$('[data-close]', m).forEach(function (c) { c.addEventListener('click', function () { closeModal(m); }); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    $$('[data-modal]').forEach(function (m) { if (!m.hidden) closeModal(m); });
  });

  // video
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-video]');
    if (!b) return;
    var m = $('#video-modal'), frame = $('[data-video-frame]', m);
    var ifr = document.createElement('iframe');
    ifr.src = b.getAttribute('data-video');
    ifr.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    ifr.allowFullscreen = true;
    ifr.title = 'Video';
    frame.innerHTML = '';
    frame.appendChild(ifr);
    openModal(m);
  });

  // gallery lightbox (package page photos and "photos" buttons on offer cards)
  var lb = $('#lightbox');
  if (lb) {
    var lbImg = $('[data-lb-img]', lb), lbCount = $('[data-lb-count]', lb), imgs = [], idx = 0;
    var show = function (i) {
      if (!imgs.length) return;
      idx = (i + imgs.length) % imgs.length;
      lbImg.src = imgs[idx].replace(/([?&])w=\d+/, '$1w=1800');
      lbCount.textContent = (idx + 1) + ' / ' + imgs.length;
      var multi = imgs.length > 1;
      $('[data-lb-prev]', lb).hidden = !multi; $('[data-lb-next]', lb).hidden = !multi;
    };
    var openGallery = function (list, start, title) {
      imgs = (list || []).filter(Boolean);
      if (!imgs.length) return;
      lbImg.alt = title || '';
      show(start || 0);
      openModal(lb);
    };
    var gdata = $('#gallery-data');
    var pageImgs = []; if (gdata) { try { pageImgs = JSON.parse(gdata.textContent); } catch (e) {} }
    $$('[data-gallery-open]').forEach(function (b) {
      b.addEventListener('click', function () { openGallery(pageImgs, parseInt(b.getAttribute('data-gallery-open'), 10)); });
    });
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-gallery-images]');
      if (!b) return;
      e.preventDefault();
      var list = []; try { list = JSON.parse(b.getAttribute('data-gallery-images')); } catch (err) {}
      openGallery(list, parseInt(b.getAttribute('data-gallery-start'), 10) || 0, b.getAttribute('data-gallery-title'));
    });
    $('[data-lb-prev]', lb).addEventListener('click', function () { show(idx - 1); });
    $('[data-lb-next]', lb).addEventListener('click', function () { show(idx + 1); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  // ---------- carousel ----------
  $$('[data-carousel]').forEach(function (track) {
    var wrap = track.parentElement, prev = $('[data-carousel-prev]', wrap), next = $('[data-carousel-next]', wrap);
    var step = function () { var c = track.firstElementChild; return c ? c.getBoundingClientRect().width + 16 : 300; };
    var update = function () {
      if (prev) prev.disabled = track.scrollLeft < 8;
      if (next) next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
    };
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  // ---------- hero "popular choices" slider ----------
  $$('[data-pop-slider]').forEach(function (box) {
    var vp = $('[data-pop-viewport]', box), slides = $$('[data-pop-slide]', box), dots = $$('[data-pop-dot]', box);
    var idxEl = $('[data-pop-index]', box), toggle = $('[data-pop-toggle]', box);
    var n = slides.length;
    if (!vp || n < 2) return;
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var secs = parseInt(box.getAttribute('data-interval'), 10) || 0;
    var cur = 0, timer = null, hover = false, focused = false, touching = false, paused = reduce || !secs;
    var mark = function (i) {
      cur = i;
      if (idxEl) idxEl.textContent = String(i + 1);
      dots.forEach(function (d, k) { if (k === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
    };
    var go = function (i, instant) {
      i = (i + n) % n;
      vp.scrollTo({ left: i * vp.clientWidth, behavior: instant || reduce ? 'auto' : 'smooth' });
      mark(i);
    };
    var schedule = function () {
      clearTimeout(timer); timer = null;
      var run = !paused && !hover && !focused && !touching && !document.hidden;
      vp.setAttribute('aria-live', run ? 'off' : 'polite');
      if (!run) return;
      timer = setTimeout(function () {
        if (!box.isConnected) return;
        go(cur + 1); schedule();
      }, secs * 1000);
    };
    var settle;
    vp.addEventListener('scroll', function () {
      clearTimeout(settle);
      settle = setTimeout(function () { var i = Math.round(vp.scrollLeft / Math.max(1, vp.clientWidth)); if (i !== cur && i >= 0 && i < n) mark(i); }, 90);
    }, { passive: true });
    var prev = $('[data-pop-prev]', box), next = $('[data-pop-next]', box);
    if (prev) prev.addEventListener('click', function () { go(cur - 1); schedule(); });
    if (next) next.addEventListener('click', function () { go(cur + 1); schedule(); });
    dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k); schedule(); }); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
    });
    var setPaused = function (v) {
      paused = v;
      if (toggle) {
        if (v) toggle.setAttribute('data-paused', ''); else toggle.removeAttribute('data-paused');
        toggle.setAttribute('aria-label', v ? 'Play slides' : 'Pause slides');
      }
      schedule();
    };
    if (toggle) toggle.addEventListener('click', function () { setPaused(!paused); });
    box.addEventListener('mouseenter', function () { hover = true; schedule(); });
    box.addEventListener('mouseleave', function () { hover = false; schedule(); });
    // Pause while a keyboard user is inside the slider (not after a mouse click on the arrows).
    box.addEventListener('focusin', function (e) {
      var kb = true;
      try { kb = e.target.matches(':focus-visible'); } catch (err) {}
      if (kb) { focused = true; schedule(); }
    });
    box.addEventListener('focusout', function (e) { if (!box.contains(e.relatedTarget)) { focused = false; schedule(); } });
    vp.addEventListener('touchstart', function () { touching = true; schedule(); }, { passive: true });
    vp.addEventListener('touchend', function () { touching = false; schedule(); }, { passive: true });
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('resize', function () { if (box.isConnected) vp.scrollTo({ left: cur * vp.clientWidth, behavior: 'auto' }); });
    mark(0);
    setPaused(paused);
  });

  // ---------- filters: submit on change ----------
  $$('form[data-autosubmit]').forEach(function (f) {
    f.addEventListener('change', function (e) {
      if (e.target.matches('select, input[type=radio], input[type=checkbox]')) f.submit();
    });
  });
  var filters = $('[data-filters]');
  if (filters && window.matchMedia('(min-width: 1021px)').matches) {
    filters.open = true;
    $('summary', filters).addEventListener('click', function (e) { e.preventDefault(); });
  }

  // ---------- booking price calculator (prices follow the travel month) ----------
  var bf = $('[data-booking]');
  if (bf) {
    var cur = bf.getAttribute('data-currency') || '£';
    var fromAdult = parseFloat(bf.getAttribute('data-adult')) || 0;
    var depPct = parseFloat(bf.getAttribute('data-deposit')) || 0;
    var days = parseInt(bf.getAttribute('data-days'), 10) || 1;
    var max = parseInt(bf.getAttribute('data-max'), 10) || 16;
    var monthPrices = []; try { monthPrices = JSON.parse(bf.getAttribute('data-months') || '[]'); } catch (e) {}
    var childFixed = bf.getAttribute('data-child-fixed');
    var childPct = parseFloat(bf.getAttribute('data-child-pct')) || 0;
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var fmt = function (n) {
      var hasP = Math.round(n * 100) % 100 !== 0;
      return cur + n.toLocaleString('en-GB', { minimumFractionDigits: hasP ? 2 : 0, maximumFractionDigits: 2 });
    };
    var utc = function (iso) { return new Date(iso + 'T00:00:00Z'); };
    var fmtDate = function (dt) { return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
    var childFor = function (adult) { return childFixed !== '' && childFixed !== null ? parseFloat(childFixed) : Math.round(adult * childPct) / 100; };
    var dateIn = $('[data-book-date]', bf), monthLine = $('[data-price-month]', bf), submit = $('button[type=submit]', bf);
    var tiles = $$('[data-month]');
    var calc = function () {
      var a = parseInt($('input[name=adults]', bf).value, 10) || 0;
      var c = parseInt($('input[name=children]', bf).value, 10) || 0;
      var adultP = fromAdult, closed = false, label = '';
      if (dateIn.value) {
        var dt = utc(dateIn.value), m = dt.getUTCMonth();
        var mp = monthPrices[m];
        label = MONTHS[m] + ' ' + dt.getUTCFullYear();
        if (mp === null || mp === undefined) { closed = mp === null; } else adultP = mp;
      }
      var childP = childFor(adultP);
      var total = a * adultP + c * childP;
      $('[data-line-adults]', bf).textContent = a + (a === 1 ? ' adult' : ' adults') + ' × ' + fmt(adultP);
      $('[data-amt-adults]', bf).textContent = fmt(a * adultP);
      $('[data-row-children]', bf).hidden = !c;
      $('[data-line-children]', bf).textContent = c + (c === 1 ? ' child' : ' children') + ' × ' + fmt(childP);
      $('[data-amt-children]', bf).textContent = fmt(c * childP);
      $('[data-amt-total]', bf).textContent = fmt(total);
      var dep = $('[data-amt-deposit]', bf);
      if (dep) dep.textContent = fmt(Math.round(total * depPct) / 100);
      monthLine.classList.toggle('is-closed', closed);
      monthLine.textContent = !dateIn.value ? 'Choose a departure date to see the price for your month.'
        : closed ? 'This trip isn’t available in ' + label + '. Please choose another month.'
          : 'Price for ' + label + ': ' + fmt(adultP) + ' per adult';
      var tooMany = a + c > max;
      submit.disabled = tooMany || closed;
      var rd = $('[data-return-date]', bf);
      if (dateIn.value) { var ret = utc(dateIn.value); ret.setUTCDate(ret.getUTCDate() + days - 1); rd.textContent = 'Returning ' + fmtDate(ret); } else rd.textContent = '';
      if (tooMany) rd.textContent = 'This trip takes up to ' + max + ' travellers per booking.';
      var ym = dateIn.value ? dateIn.value.slice(0, 7) : '';
      tiles.forEach(function (t) { t.classList.toggle('is-selected', t.getAttribute('data-month') === ym); t.setAttribute('aria-pressed', t.getAttribute('data-month') === ym ? 'true' : 'false'); });
    };
    // Clicking a month in "Dates & prices" picks the first available day of that month.
    tiles.forEach(function (t) {
      t.addEventListener('click', function () {
        var ym = t.getAttribute('data-month');
        var first = ym + '-01';
        var minD = dateIn.min || first;
        var last = utc(first); last.setUTCMonth(last.getUTCMonth() + 1); last.setUTCDate(0);
        dateIn.value = first < minD ? minD : first;
        calc();
        var card = $('#book');
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(function () { try { dateIn.focus({ preventScroll: true }); } catch (e) { dateIn.focus(); } }, 350);
        void last;
      });
    });
    bf.addEventListener('change', calc);
    bf.addEventListener('input', calc);
    calc();
    bf.addEventListener('submit', function () { setTimeout(function () { submit.disabled = true; submit.textContent = 'Sending request…'; }, 0); });
  }

  // ---------- section tabs highlight ----------
  var tabs = $$('.tabs a');
  if (tabs.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) tabs.forEach(function (t) { t.classList.toggle('is-active', t.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    tabs.forEach(function (t) { var s = $(t.getAttribute('href')); if (s) io.observe(s); });
  }

  // ---------- share / print / confirm ----------
  $$('[data-share]').forEach(function (b) {
    b.addEventListener('click', function () {
      var data = { title: b.getAttribute('data-title'), url: location.href.split('#')[0] };
      if (navigator.share) { navigator.share(data).catch(function () {}); return; }
      if (navigator.clipboard) navigator.clipboard.writeText(data.url).then(function () { b.lastChild.textContent = ' Link copied'; });
    });
  });
  $$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });
  $$('form[data-confirm]').forEach(function (f) {
    f.addEventListener('submit', function (e) { if (!window.confirm(f.getAttribute('data-confirm'))) e.preventDefault(); });
  });

  // ---------- newsletter (no page reload) ----------
  $$('form[data-subscribe]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      if (!window.fetch) return;
      e.preventDefault();
      var msg = $('.nl-msg', f), btn = $('button[type=submit]', f);
      btn.disabled = true;
      fetch(f.action, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(f)).toString() })
        .then(function (r) { return r.json(); })
        .then(function (d) { msg.textContent = d.message; if (d.ok) f.reset(); })
        .catch(function () { msg.textContent = 'Something went wrong. Please try again.'; })
        .then(function () { btn.disabled = false; });
    });
  });
})();
