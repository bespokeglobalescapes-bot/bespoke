/* Admin dashboard interactions */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // sidebar on small screens
  var side = $('#adm-side'), burger = $('[data-side-toggle]');
  if (burger) {
    burger.addEventListener('click', function () {
      var open = !side.classList.contains('is-open');
      side.classList.toggle('is-open', open);
      document.body.classList.toggle('side-open', open);
    });
    document.addEventListener('click', function (e) {
      if (side.classList.contains('is-open') && !side.contains(e.target) && !burger.contains(e.target)) {
        side.classList.remove('is-open'); document.body.classList.remove('side-open');
      }
    });
  }

  // close user menu when clicking elsewhere
  var um = $('.adm-user');
  if (um) document.addEventListener('click', function (e) { if (um.open && !um.contains(e.target)) um.open = false; });

  // clickable table rows
  $$('tr[data-href]').forEach(function (tr) {
    tr.addEventListener('click', function (e) {
      if (e.target.closest('a, button, form, input, select')) return;
      window.location = tr.getAttribute('data-href');
    });
  });

  // confirm destructive forms
  $$('form[data-confirm]').forEach(function (f) {
    f.addEventListener('submit', function (e) { if (!window.confirm(f.getAttribute('data-confirm'))) e.preventDefault(); });
  });

  // auto-submit filters
  $$('form[data-autosubmit]').forEach(function (f) {
    f.addEventListener('change', function (e) { if (e.target.matches('select')) f.submit(); });
  });

  // slug from title (until the slug is edited by hand)
  var src = $('[data-slug-source]'), tgt = $('[data-slug-target]');
  if (src && tgt) {
    var touched = !!tgt.value;
    var slugify = function (s) {
      return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    };
    tgt.addEventListener('input', function () { touched = !!tgt.value; });
    src.addEventListener('input', function () { if (!touched) tgt.placeholder = slugify(src.value) || 'generated-from-title'; });
  }

  // repeatable rows (itinerary days, images)
  $$('[data-add-row]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-add-row');
      var tpl = $('template[data-template="' + key + '"]');
      var list = $('[data-rows="' + key + '"]');
      var node = tpl.content.firstElementChild.cloneNode(true);
      if (key === 'hotel') {
        var k = 'n' + Math.random().toString(36).slice(2, 9);
        $$('[name], [id], [for]', node).concat([node]).forEach(function (el) {
          ['name', 'id', 'for', 'value'].forEach(function (a) { var v = el.getAttribute(a); if (v && v.indexOf('__KEY__') > -1) el.setAttribute(a, v.replace(/__KEY__/g, k)); });
        });
      }
      if (key === 'itin') {
        var n = list.children.length + 1;
        var lbl = $('input[name=itin_label]', node); if (lbl) lbl.value = 'Day ' + n;
      }
      list.appendChild(node);
      var first = $('input:not([type=hidden]), textarea', node);
      if (first) first.focus();
      markDirty();
    });
  });
  document.addEventListener('click', function (e) {
    var rm = e.target.closest('[data-remove-row]');
    if (rm) { var row = rm.closest('[data-faq-row], [data-itin-row], [data-img-row], [data-hotel]'); if (row) { row.remove(); markDirty(); } return; }
    var rp = e.target.closest('[data-remove-photo]');
    if (rp) {
      var th = rp.closest('.hotel-thumb'), box = rp.closest('[data-hotel]'), ta = $('[data-hotel-images]', box);
      var src = th.getAttribute('data-src');
      ta.value = ta.value.split(/\r?\n/).filter(function (l) { return l.trim() && l.trim() !== src; }).join('\n');
      th.remove(); markDirty(); return;
    }
    var mv = e.target.closest('[data-move]');
    if (mv) {
      var r = mv.closest('[data-faq-row], [data-hotel], [data-itin-row], [data-img-row]');
      if (!r) return;
      if (mv.getAttribute('data-move') === '-1' && r.previousElementSibling) r.parentNode.insertBefore(r, r.previousElementSibling);
      else if (mv.getAttribute('data-move') === '1' && r.nextElementSibling) r.parentNode.insertBefore(r.nextElementSibling, r);
      mv.focus();
      markDirty();
    }
  });
  // live preview for pasted image links in the photos list
  document.addEventListener('change', function (e) {
    if (e.target.matches('.img-row input[name=image_url]')) {
      var img = $('img', e.target.closest('.img-row'));
      if (img) img.src = e.target.value;
    }
  });
  // hotel editor conveniences
  document.addEventListener('input', function (e) {
    if (e.target.matches('[data-hotel-name]')) { var t = $('[data-hotel-title]', e.target.closest('[data-hotel]')); if (t) t.textContent = e.target.value || 'New hotel'; }
    if (e.target.matches('[data-standard-price]')) $$('[data-month-price]').forEach(function (i) { i.placeholder = e.target.value; });
  });
  document.addEventListener('change', function (e) {
    if (e.target.matches('[data-hotel-files]')) {
      var n = e.target.files.length, note = $('[data-hotel-files-note]', e.target.closest('[data-hotel]'));
      if (note) note.textContent = n ? n + (n === 1 ? ' photo' : ' photos') + ' will be added when you save.' : 'The first photo is the main one.';
    }
    if (e.target.matches('[data-month-closed]')) e.target.closest('[data-month-edit]').classList.toggle('is-closed', e.target.checked);
  });

  var multi = $('[data-multi-files]'), note = $('[data-files-note]');
  if (multi && note) multi.addEventListener('change', function () {
    var n = multi.files.length;
    note.textContent = n ? n + (n === 1 ? ' photo' : ' photos') + ' will be added when you save.' : '';
  });

  // single image fields: preview link or chosen file
  $$('[data-img-field]').forEach(function (box) {
    var url = $('[data-img-url]', box), file = $('[data-img-file]', box), prev = $('[data-img-preview]', box), clear = $('[data-img-clear]', box);
    var show = function (src) { prev.innerHTML = ''; if (src) { var i = document.createElement('img'); i.src = src; i.alt = ''; prev.appendChild(i); } };
    url.addEventListener('change', function () { show(url.value); });
    file.addEventListener('change', function () {
      if (file.files[0]) { var r = new FileReader(); r.onload = function () { show(r.result); }; r.readAsDataURL(file.files[0]); }
    });
    if (clear) clear.addEventListener('click', function () { url.value = ''; file.value = ''; show(''); markDirty(); });
  });

  // copy to clipboard
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(b.getAttribute('data-copy')).then(function () {
        var t = b.lastChild; var old = t.textContent; t.textContent = ' Copied'; setTimeout(function () { t.textContent = old; }, 1600);
      });
    });
  });

  // warn before leaving a form with unsaved changes
  var dirty = false;
  function markDirty() { dirty = true; }
  $$('form[data-dirty-guard]').forEach(function (f) {
    f.addEventListener('input', markDirty);
    f.addEventListener('change', markDirty);
    f.addEventListener('submit', function () { dirty = false; });
  });
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  // auto-hide flash
  var fl = $('.adm-flash');
  if (fl) setTimeout(function () { fl.style.transition = 'opacity .4s'; fl.style.opacity = '0'; setTimeout(function () { fl.remove(); }, 400); }, 6000);
})();
