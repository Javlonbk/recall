/* recall-fixes.js — post-design behavior patches, loaded AFTER recall.js.
   Kept separate so recall.css/recall.js stay close to the original design files.
   (recall.js also carries two small in-place-render patches: a guarded
   hashchange listener and remountQA/commitTech — re-apply them on re-import.)

   Replaces the design's native HTML5 drag-sort (janky: nested sortables, a
   <button> topic row, no text-select guard) with a delegated pointer-based
   drag. It is bound on `document`, so it keeps working after an in-place
   re-render. Commits a reorder by writing localStorage['recall-content:<id>']
   (same as recall.js) and calling window.recallRemount() — no full reload. */
(function () {
  'use strict';
  if (!window.RECALL_CONTENT) return;

  function editing() { return document.body.classList.contains('is-editing'); }
  function techId() {
    var p = new URLSearchParams(location.search).get('tech');
    if (p && window.RECALL_CONTENT[p]) return p;
    return (window.RECALL_ORDER || Object.keys(window.RECALL_CONTENT))[0];
  }
  function techData(id) {
    var ov = localStorage.getItem('recall-content:' + id);
    if (ov) { try { return JSON.parse(ov); } catch (_) {} }
    return window.RECALL_CONTENT[id];
  }
  function applyOrder(mutate, hash) {
    var id = techId(), d = techData(id);
    if (!d) return;
    mutate(d);
    localStorage.setItem('recall-content:' + id, JSON.stringify(d));
    if (hash) location.hash = hash;
    if (window.recallRemount) window.recallRemount(); else location.reload();
  }

  /* Kill the design's native drag while editing (delegated → survives re-render). */
  document.addEventListener('dragstart', function (e) { if (editing()) e.preventDefault(); }, true);

  /* ---- auto-scroll during drag ---- */
  var EDGE = 72, MAX = 18, rafId = null, vy = 0, scrollBox = null;
  function aspeed(d) { return Math.max(1, Math.ceil(MAX * (1 - Math.max(0, d) / EDGE))); }
  function astep() { if (!vy) { rafId = null; return; } if (scrollBox) scrollBox.scrollTop += vy; else window.scrollBy(0, vy); rafId = requestAnimationFrame(astep); }
  function astart() { if (!rafId) rafId = requestAnimationFrame(astep); }
  function scrollableAncestor(el) {
    for (var n = el; n && n !== document.body; n = n.parentElement) {
      var s = getComputedStyle(n);
      if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 2) return n;
    }
    return null;
  }
  function autoScroll(y, container) {
    var sc = scrollableAncestor(container);
    if (sc) { var r = sc.getBoundingClientRect(); scrollBox = sc;
      if (y < r.top + EDGE) { vy = -aspeed(y - r.top); astart(); return; }
      if (y > r.bottom - EDGE) { vy = aspeed(r.bottom - y); astart(); return; }
    } else { scrollBox = null;
      if (y < EDGE) { vy = -aspeed(y); astart(); return; }
      if (y > window.innerHeight - EDGE) { vy = aspeed(window.innerHeight - y); astart(); return; }
    }
    vy = 0;
  }

  /* ---- pointer drag-sort ---- */
  function afterEl(container, sel, y) {
    var els = [].slice.call(container.querySelectorAll(sel)).filter(function (e) { return !e.classList.contains('rcefx-drag'); });
    var closest = null, co = -Infinity;
    els.forEach(function (el) { var b = el.getBoundingClientRect(); var off = y - b.top - b.height / 2; if (off < 0 && off > co) { co = off; closest = el; } });
    return closest;
  }
  function suppressClick() {
    var kill = function (e) { e.stopPropagation(); e.preventDefault(); document.removeEventListener('click', kill, true); };
    document.addEventListener('click', kill, true);
    setTimeout(function () { document.removeEventListener('click', kill, true); }, 350);
  }
  function startDrag(e, item, container, sel, onDrop) {
    if (!container) return;
    var startY = e.clientY, dragging = false;
    function move(ev) {
      if (!dragging) {
        if (Math.abs(ev.clientY - startY) < 6) return;
        dragging = true;
        item.classList.add('rcefx-drag', 'dragging');
        document.body.classList.add('rcefx-dragging');
      }
      ev.preventDefault();
      var ref = afterEl(container, sel, ev.clientY);
      if (!ref) container.appendChild(item); else container.insertBefore(item, ref);
      autoScroll(ev.clientY, container);
    }
    function up() {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      vy = 0;
      if (!dragging) return;
      item.classList.remove('rcefx-drag', 'dragging');
      document.body.classList.remove('rcefx-dragging');
      suppressClick();
      var order = [].slice.call(container.querySelectorAll(sel)).map(function (el) { return +el.dataset.idx; });
      if (order.some(function (v, i) { return v !== i; })) onDrop(order, item);
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }

  document.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || !editing()) return;
    // NB: don't exclude <a> — subtopics (.toc-sub) ARE anchors and must be
    // draggable; a plain click still navigates (drag needs the 6px threshold).
    if (e.target.closest('.toc-edit, button[data-act], input, textarea')) return;

    var card = e.target.closest('.card');
    if (card && card.closest('#qaApp')) {
      startDrag(e, card, card.closest('.section'), '.card', function (order, it) {
        var sec = it.closest('.section'), ti = +sec.dataset.ti, si = +sec.dataset.si;
        applyOrder(function (d) { var a = d.topics[ti].subtopics[si].cards; d.topics[ti].subtopics[si].cards = order.map(function (i) { return a[i]; }); }, sec.id);
      });
      return;
    }
    var sub = e.target.closest('.toc-sub');
    if (sub && sub.parentNode) {
      startDrag(e, sub, sub.parentNode, '.toc-sub', function (order, it) {
        var ti = +it.closest('.toc-group').dataset.ti;
        applyOrder(function (d) { var a = d.topics[ti].subtopics; d.topics[ti].subtopics = order.map(function (i) { return a[i]; }); });
      });
      return;
    }
    var group = e.target.closest('.toc-group');
    if (group && group.parentNode && e.target.closest('.toc-toprow')) {
      startDrag(e, group, group.parentNode, '.toc-group', function (order) {
        applyOrder(function (d) { var a = d.topics; d.topics = order.map(function (i) { return a[i]; }); });
      });
    }
  });

  /* ---- styled prompt / confirm (replaces native prompt()/confirm()) ----
     Reuses the design's .ed-* modal classes so it matches the card editor.
     Exposed as window.uiPrompt / window.uiConfirm; recall.js's edit actions
     call them. Promise-based: prompt resolves the string or null; confirm
     resolves true or null. */
  function uiDialog(opts) {
    return new Promise(function (resolve) {
      var ov = document.createElement('div'); ov.className = 'ed-ov';
      ov.innerHTML =
        '<div class="ed-back"></div><div class="ed-panel ed-panel--sm" role="dialog" aria-modal="true">' +
        '<div class="ed-head"><h3></h3><button class="ed-x" type="button" title="Close">✕</button></div>' +
        '<div class="ed-body">' + (opts.field ? '<input class="ed-q" type="text" spellcheck="false">' : '<p class="ed-msg"></p>') + '</div>' +
        '<div class="ed-foot"><span class="ed-spacer"></span>' + (opts.noCancel ? '' : '<button class="ed-cancel" type="button">' + (opts.cancel || 'Cancel') + '</button>') +
        '<button class="ed-save' + (opts.danger ? ' ed-danger' : '') + '" type="button">' + (opts.ok || 'Save') + '</button></div></div>';
      ov.querySelector('h3').textContent = opts.title || '';
      var msg = ov.querySelector('.ed-msg'); if (msg) msg.textContent = opts.message || '';
      var input = ov.querySelector('.ed-q'); if (input) input.value = opts.value || '';
      document.body.appendChild(ov); document.body.classList.add('ed-open');
      function done(v) { ov.remove(); document.body.classList.remove('ed-open'); resolve(v); }
      ov.querySelector('.ed-x').onclick = function () { done(null); };
      var cancelBtn = ov.querySelector('.ed-cancel'); if (cancelBtn) cancelBtn.onclick = function () { done(null); };
      ov.querySelector('.ed-back').onclick = function () { done(null); };
      ov.querySelector('.ed-save').onclick = function () { done(input ? input.value : true); };
      ov.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); done(null); }
        else if (e.key === 'Enter') { e.preventDefault(); done(input ? input.value : true); }
      });
      if (input) setTimeout(function () { input.focus(); input.select(); }, 30);
    });
  }
  window.uiPrompt = function (title, value) { return uiDialog({ title: title, field: true, value: value, ok: 'Save' }); };
  window.uiConfirm = function (title, message) { return uiDialog({ title: title, message: message, ok: 'Delete', danger: true }); };
  window.uiAlert = function (title, message) { return uiDialog({ title: title, message: message, ok: 'OK', noCancel: true }); };

  /* ---- Export / Save content as JSON (matches src/content/tech/<id>.json) ----
     recall.js works with content in render shape (q/a, no order); the source
     files are storage shape (question/answer + order). Convert before writing
     so the output is a drop-in replacement for src/content/tech/<id>.json. */
  function toStorage(id) {
    var d = techData(id) || {};
    var order = (window.RECALL_ORDER || []).indexOf(id); if (order < 0) order = 0;
    return {
      name: d.name, blurb: d.blurb || '', order: order,
      topics: (d.topics || []).map(function (t) {
        return { id: t.id, name: t.name, subtopics: (t.subtopics || []).map(function (s) {
          return { id: s.id, name: s.name, cards: (s.cards || []).map(function (c) {
            return { question: c.q, answer: c.a, long: !!c.long, tag: c.tag || '' };
          }) };
        }) };
      }),
      book: (d.book || []).map(function (b) { return { id: b.id, title: b.title, html: b.html }; }),
    };
  }
  function exportJSON(id) {
    var blob = new Blob([JSON.stringify(toStorage(id), null, 2) + '\n'], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = id + '.json';
    document.body.appendChild(a); a.click(); a.remove();
  }
  function saveToFile(id) {
    return fetch('/__recall/save', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: id, data: toStorage(id) }),
    }).then(function (r) { return r.json(); });
  }

  var isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  function buildBar() {
    if (!editing() || document.getElementById('rcefx-export')) return;
    var bar = document.createElement('div'); bar.id = 'rcefx-export'; bar.className = 'rcefx-export';
    var exp = document.createElement('button'); exp.className = 'rcefx-xbtn'; exp.textContent = 'Export JSON';
    exp.title = 'Download <subject>.json — drop into src/content/tech/, commit, redeploy';
    exp.onclick = function () { exportJSON(techId()); };
    bar.appendChild(exp);
    if (isLocal) {
      var save = document.createElement('button'); save.className = 'rcefx-xbtn rcefx-xprimary'; save.textContent = 'Save to file';
      save.title = 'Write src/content/tech/<subject>.json directly (dev only)';
      save.onclick = function () {
        var id = techId(); save.disabled = true; save.textContent = 'Saving…';
        saveToFile(id).then(function (j) {
          save.disabled = false; save.textContent = 'Save to file';
          if (j && j.ok) window.uiAlert('Saved', 'Wrote src/content/tech/' + id + '.json. Commit & redeploy to publish.');
          else window.uiAlert('Save failed', (j && j.error) || 'Unknown error');
        }).catch(function (e) {
          save.disabled = false; save.textContent = 'Save to file';
          window.uiAlert('Save failed', String(e));
        });
      };
      bar.appendChild(save);
    }
    document.body.appendChild(bar);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(buildBar, 0); });
  else setTimeout(buildBar, 0);
})();
