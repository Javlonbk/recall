/* ============================================================
   recall — data-driven renderer + features
   Pages mount via #homeApp / #qaApp / #bookApp.
   Content comes from window.RECALL_CONTENT (+ window.RECALL_ORDER).
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Theme + reading comfort (apply early) ---------- */
  const root = document.documentElement;
  const savedTheme = localStorage.getItem('recall-theme');
  if (savedTheme) root.setAttribute('data-theme', savedTheme);
  else if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.setAttribute('data-theme', 'dark');
  root.setAttribute('data-size', localStorage.getItem('recall-size') || 'm');
  root.setAttribute('data-width', localStorage.getItem('recall-width') || 'normal');
  window.toggleTheme = function () {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('recall-theme', next);
  };

  /* ---------- Icons ---------- */
  const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"></path></svg>';
  const SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4-4"></path></svg>';
  const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  const FILTER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M7 12h10M11 18h2"></path></svg>';
  const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>';
  const REVIEW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z"></path><path d="M3 12l9 4 9-4M3 17l9 4 9-4"></path></svg>';
  const AA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19l5-14 5 14M6 14h6"></path><path d="M15 19l3.5-9 3.5 9M16.4 16h4.2"></path></svg>';

  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const pad2 = n => (n < 10 ? '0' : '') + n;
  function stripTags(html) { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.trim(); }

  /* ---------- Content access ---------- */
  function allTechs() {
    const order = window.RECALL_ORDER || Object.keys(window.RECALL_CONTENT || {});
    return order.map(id => { const t = getTech(id); return t ? Object.assign({ id }, t) : null; }).filter(t => t && t.name);
  }
  function getTech(id) {
    const ov = localStorage.getItem('recall-content:' + id);
    if (ov) { try { return JSON.parse(ov); } catch (e) {} }
    return (window.RECALL_CONTENT || {})[id];
  }
  function saveTech(id, obj) { localStorage.setItem('recall-content:' + id, JSON.stringify(obj)); }
  function resetTech(id) { localStorage.removeItem('recall-content:' + id); }

  /* ---- Admin / edit state ---- */
  function adminUnlocked() { return sessionStorage.getItem('recall-admin') === '1'; }
  function adminPass() { return localStorage.getItem('recall-admin-pass') || 'recall'; }
  function unlockAdmin() { window.uiPrompt('Admin sign-in', '').then(p => { if (p == null) return; if (p === adminPass()) { sessionStorage.setItem('recall-admin', '1'); location.reload(); } else window.uiAlert('Incorrect passcode', 'That passcode didn’t match. Try again.'); }); }
  function lockAdmin() { sessionStorage.removeItem('recall-admin'); sessionStorage.removeItem('recall-edit'); location.reload(); }
  function editMode() { return adminUnlocked() && sessionStorage.getItem('recall-edit') === '1'; }
  function setEdit(on) { sessionStorage.setItem('recall-edit', on ? '1' : '0'); location.reload(); }
  function currentTechId() {
    const p = new URLSearchParams(location.search).get('tech');
    if (p && getTech(p)) return p;
    const last = localStorage.getItem(pkey('last-tech'));
    if (last && getTech(last)) return last;
    return (window.RECALL_ORDER || Object.keys(window.RECALL_CONTENT || {}))[0];
  }
  const PAGE = (location.pathname.split('/').pop() || 'index.html');

  /* ============================================================
     Profiles (local) — namespaces all progress per person
     ============================================================ */
  function todayStr() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  const AVATAR_COLORS = ['#B45309', '#2A6FAF', '#1F8A5B', '#9A4A12', '#6B4FA0', '#9A2F5B', '#3E7C8A'];
  function colorFor(name) { let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; return AVATAR_COLORS[h % AVATAR_COLORS.length]; }
  function initials(name) { const p = name.trim().split(/\s+/); return ((p[0] || '')[0] || '?').toUpperCase() + (p[1] ? p[1][0].toUpperCase() : ''); }

  const Profiles = {
    list() { try { return JSON.parse(localStorage.getItem('recall-profiles') || '[]'); } catch (e) { return []; } },
    save(l) { localStorage.setItem('recall-profiles', JSON.stringify(l)); },
    currentId() { return localStorage.getItem('recall-current'); },
    current() { const id = this.currentId(); return this.list().find(p => p.id === id) || null; },
    setCurrent(id) { localStorage.setItem('recall-current', id); },
    create(name) { const id = 'p' + Date.now().toString(36) + Math.floor(Math.random() * 99); const l = this.list(); l.push({ id, name: name, color: colorFor(name), created: todayStr() }); this.save(l); this.setCurrent(id); return id; },
    rename(id, name) { const l = this.list(); const p = l.find(x => x.id === id); if (p) { p.name = name; p.color = colorFor(name); this.save(l); } },
    remove(id) { let l = this.list().filter(p => p.id !== id); this.save(l); Object.keys(localStorage).filter(k => k.startsWith('recall:' + id + ':')).forEach(k => localStorage.removeItem(k)); if (this.currentId() === id) this.setCurrent(l[0] ? l[0].id : ''); },
    ensure() { if (!this.current()) { const id = this.create('You'); migrateLegacy(id); } return this.current(); }
  };
  function pkey(suffix) { return 'recall:' + (Profiles.currentId() || '_') + ':' + suffix; }
  function migrateLegacy(pid) {
    const move = (from, to) => { const v = localStorage.getItem(from); if (v != null && localStorage.getItem(to) == null) localStorage.setItem(to, v); };
    (window.RECALL_ORDER || []).forEach(t => { move('recall-known-' + t, 'recall:' + pid + ':known:' + t); move('recall-last-' + t, 'recall:' + pid + ':last:' + t); });
    move('recall-reveal', 'recall:' + pid + ':reveal');
    move('recall-filter', 'recall:' + pid + ':filter');
    move('recall-last-tech', 'recall:' + pid + ':last-tech');
  }
  function bumpActivity() { const k = pkey('activity'); let m = {}; try { m = JSON.parse(localStorage.getItem(k) || '{}'); } catch (e) {} const d = todayStr(); m[d] = (m[d] || 0) + 1; localStorage.setItem(k, JSON.stringify(m)); }
  function bumpReview(got) { const k = pkey('reviews'); let s = { cards: 0, gotit: 0 }; try { s = Object.assign(s, JSON.parse(localStorage.getItem(k) || '{}')); } catch (e) {} s.cards++; if (got) s.gotit++; localStorage.setItem(k, JSON.stringify(s)); }

  /* ============================================================
     Syntax highlighter
     ============================================================ */
  const KEYWORDS = new Set(('break case catch class const continue debugger default delete do else export ' +
    'extends finally for function if import in instanceof let new return super switch this throw try ' +
    'typeof var void while with yield async await of static get set interface type implements enum ' +
    'public private protected readonly namespace declare module require').split(' '));
  const LITERALS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function highlight(src) {
    let out = '', i = 0; const n = src.length;
    const isIdStart = c => /[A-Za-z_$]/.test(c);
    const isId = c => /[A-Za-z0-9_$]/.test(c);
    while (i < n) {
      const c = src[i];
      if (c === '/' && src[i + 1] === '/') { let j = i; while (j < n && src[j] !== '\n') j++; out += '<span class="tok-com">' + esc(src.slice(i, j)) + '</span>'; i = j; continue; }
      if (c === '/' && src[i + 1] === '*') { let j = i + 2; while (j < n && !(src[j] === '*' && src[j + 1] === '/')) j++; j = Math.min(n, j + 2); out += '<span class="tok-com">' + esc(src.slice(i, j)) + '</span>'; i = j; continue; }
      if (c === '"' || c === "'" || c === '`') { const q = c; let j = i + 1; while (j < n) { if (src[j] === '\\') { j += 2; continue; } if (src[j] === q) { j++; break; } j++; } out += '<span class="tok-str">' + esc(src.slice(i, j)) + '</span>'; i = j; continue; }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1]))) { let j = i; while (j < n && /[0-9a-fxA-FX._n]/.test(src[j])) j++; out += '<span class="tok-num">' + esc(src.slice(i, j)) + '</span>'; i = j; continue; }
      if (isIdStart(c)) {
        let j = i; while (j < n && isId(src[j])) j++;
        const word = src.slice(i, j); let k = j; while (k < n && /\s/.test(src[k])) k++;
        if (KEYWORDS.has(word)) out += '<span class="tok-key">' + word + '</span>';
        else if (LITERALS.has(word)) out += '<span class="tok-bool">' + word + '</span>';
        else if (src[k] === '(') out += '<span class="tok-fn">' + word + '</span>';
        else if (src[i - 1] === '.') out += '<span class="tok-prop">' + word + '</span>';
        else out += esc(word);
        i = j; continue;
      }
      if (/[{}()\[\];,.:?=<>+\-*/%&|!~^]/.test(c)) { out += '<span class="tok-punc">' + esc(c) + '</span>'; i++; continue; }
      out += esc(c); i++;
    }
    return out;
  }
  function applyHighlight(scope) {
    (scope || document).querySelectorAll('pre > code').forEach(el => {
      if (el.dataset.hl) return; el.dataset.hl = '1'; el.innerHTML = highlight(el.textContent);
    });
  }

  /* ============================================================
     Module state (Q&A)
     ============================================================ */
  let TECH = null, TECHID = null;
  let qaCards = [], sectionsList = [], railLinks = [], currentSub = null, topicNav = null;
  let knownSet = new Set(), filterKnown = false, revealedPref = false;

  /* ============================================================
     RENDER — Home
     ============================================================ */
  function renderHome() {
    const mount = document.getElementById('techList');
    if (!mount) return false;
    const techs = allTechs();
    mount.innerHTML = techs.map((t, i) => {
      const count = (t.topics || []).reduce((a, top) => a + top.subtopics.reduce((b, s) => b + s.cards.length, 0), 0);
      return `<div class="tech-row">
        <span class="idx">${pad2(i + 1)}</span>
        <div class="tr-body">
          <span class="tr-name">${t.name}</span>
          <span class="tr-blurb">${t.blurb || ''}</span>
        </div>
        <div class="tr-links">
          <a class="tr-qa" href="qa.html?tech=${t.id}">Q&amp;A <span class="tr-n">${count}</span></a>
          <a class="tr-book" href="book.html?tech=${t.id}">Book</a>
        </div>
      </div>`;
    }).join('');
    return true;
  }

  /* ============================================================
     RENDER — Q&A
     ============================================================ */
  function renderQA() {
    const mount = document.getElementById('qaApp');
    if (!mount) return false;
    TECHID = currentTechId(); TECH = getTech(TECHID);
    if (!TECH) { mount.innerHTML = '<p style="padding:60px">No content found.</p>'; return false; }
    localStorage.setItem(pkey('last-tech'), TECHID);
    document.title = 'recall — ' + TECH.name + ' · Q&A';
    const em = editMode();

    // rail tree
    const groups = TECH.topics.map((t, ti) => {
      const subs = t.subtopics.map((s, si) =>
        `<a class="toc-sub" href="#${t.id}-${s.id}" data-ti="${ti}" data-idx="${si}"><span class="ts-name">${s.name}</span><span class="toc-rem"></span></a>`
      ).join('');
      return `<div class="toc-group" data-topic="${t.id}" data-ti="${ti}" data-idx="${ti}">
        <div class="toc-toprow"><button class="toc-topic" type="button" aria-expanded="false"><span class="tt-chev">${CHEV}</span><span class="tt-name">${t.name}</span><span class="tt-rem"></span></button>${em ? `<span class="toc-edit"><button type="button" data-act="ren-topic" title="Rename topic">✎</button><button type="button" data-act="add-sub" title="Add subtopic">+</button><button type="button" data-act="del-topic" title="Delete topic">✕</button></span>` : ''}</div>
        <div class="toc-subs">${subs}</div>
      </div>`;
    }).join('');

    // main sections
    let sections = '';
    TECH.topics.forEach((t, ti) => {
      t.subtopics.forEach((s, si) => {
        const secId = t.id + '-' + s.id;
        const num = (ti + 1) + '.' + (si + 1);
        const cards = s.cards.map((c, ci) => {
          const tag = c.tag ? `<span class="q-tag">${c.tag}</span>` : (c.long ? '<span class="q-tag">in-depth</span>' : '');
          const tools = em ? `<div class="card-tools"><button type="button" data-act="edit-card">Edit</button><button type="button" data-act="del-card">Delete</button></div>` : '';
          return `<article class="card${c.long ? ' card--long' : ''}" id="${secId}-${ci + 1}" data-ti="${ti}" data-si="${si}" data-ci="${ci}" data-idx="${ci}">${tools}<h3 class="q"><span class="marker">${pad2(ci + 1)}</span><span class="q-text">${c.q}${tag}</span></h3><div class="a">${c.a}</div></article>`;
        }).join('');
        sections += `<section class="section" id="${secId}" data-topic="${t.id}" data-ti="${ti}" data-si="${si}">
          <div class="section-head"><div class="sh-main"><span class="num">${num}</span><span class="crumb">${t.name}</span><h2>${s.name}</h2></div><span class="count">${s.cards.length}</span></div>
          ${em ? `<div class="sec-tools"><span class="st-lbl">This subtopic</span><button type="button" data-act="ren-sub">Rename</button><button type="button" data-act="del-sub">Delete</button><button type="button" data-act="add-card" class="st-prim">+ Add question</button></div>` : ''}
          ${cards}
        </section>`;
      });
    });

    mount.innerHTML =
      `<aside class="rail">
        <div class="search">${SEARCH}<input id="search" type="text" placeholder="Search ${TECH.name}…" autocomplete="off" spellcheck="false"><span class="slash kbd">/</span></div>
        <div class="rail-scroll">
          <div class="rail-label">Topics${em ? '<button class="rail-add" type="button" data-act="add-topic" title="Add topic" aria-label="Add topic">+</button>' : ''}</div>
          <nav class="toc tree">${groups}</nav>
        </div>
        <div class="rail-tools">
          <button class="review-btn" id="reviewBtn" type="button">${REVIEW}<span>Review</span><span class="rb-count" id="reviewCount"></span></button>
          <div class="progress"><div class="progress-head"><span id="progressText">0 / 0 known</span></div><div class="progress-bar"><span id="progressFill"></span></div></div>
          <button class="filter-btn" id="filterKnown" type="button">${FILTER}<span class="filter-label">Hide known</span></button>
        </div>
      </aside>
      <main class="main"><div class="main-inner">
        <div class="qa-head qa-head--slim">
          <button class="reveal-btn" id="revealAll" type="button">${EYE}<span class="reveal-label">Reveal all</span></button>
        </div>
        <div class="no-results">No questions match that search.</div>
        <div id="topicEmpty"><div class="te-mark">✓</div><p>Everything in this subtopic is marked known.</p></div>
        ${sections}
      </div></main>`;
    return true;
  }

  /* ============================================================
     RENDER — Book
     ============================================================ */
  function renderBook() {
    const mount = document.getElementById('bookApp');
    if (!mount) return false;
    TECHID = currentTechId(); TECH = getTech(TECHID);
    if (!TECH) { mount.innerHTML = '<p style="padding:60px">No content found.</p>'; return false; }
    localStorage.setItem(pkey('last-tech'), TECHID);
    document.title = 'recall — ' + TECH.name + ' · Book';
    const sections = TECH.book || [];

    const toc = sections.map(b => `<a class="toc-sub" href="#${b.id}"><span class="ts-name">${b.title}</span></a>`).join('');
    const body = sections.map((b, i) => `<h2 id="${b.id}">${pad2(i + 1)} · ${b.title}</h2>${b.html}`).join('');

    mount.innerHTML =
      `<aside class="rail">
        <div class="search">${SEARCH}<input id="search" type="text" placeholder="Search the ${TECH.name} book…" autocomplete="off" spellcheck="false"><span class="search-count"></span></div>
        <div class="rail-scroll">
          <div class="rail-label">Contents</div>
          <nav class="toc">${toc}</nav>
        </div>
        <p class="muted" style="font-size:12.5px;padding:0 8px;margin-top:auto">Type to highlight. <span class="kbd">Enter</span> jumps between matches.</p>
      </aside>
      <main class="book-main"><article class="book-inner">
        <div class="kicker">The Book · ${TECH.name}</div>
        <h1>${TECH.name}</h1>
        ${body || '<p class="muted">No book chapters yet for this subject.</p>'}
      </article></main>`;
    return true;
  }

  /* ============================================================
     Collapsible cards
     ============================================================ */
  function setCard(card, open) {
    card.classList.toggle('open', open);
    const q = card.querySelector('.q');
    if (q) q.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function initCollapse() {
    qaCards = [...document.querySelectorAll('.card')];
    if (!qaCards.length) return;
    revealedPref = localStorage.getItem(pkey('reveal')) === 'all';
    qaCards.forEach(card => {
      const a = card.querySelector('.a');
      if (a && !a.parentElement.classList.contains('a-wrap')) {
        const wrap = document.createElement('div'); wrap.className = 'a-wrap';
        a.parentNode.insertBefore(wrap, a); wrap.appendChild(a);
      }
      const q = card.querySelector('.q');
      q.setAttribute('role', 'button'); q.setAttribute('tabindex', '0');
      const known = document.createElement('button');
      known.className = 'known-btn'; known.type = 'button'; known.title = 'Mark as known';
      known.setAttribute('aria-label', 'Mark as known'); known.innerHTML = CHECK;
      known.addEventListener('click', e => { e.stopPropagation(); toggleKnown(card); });
      q.appendChild(known);
      const chev = document.createElement('span'); chev.className = 'chev'; chev.innerHTML = CHEV;
      q.appendChild(chev);
      const toggle = () => setCard(card, !card.classList.contains('open'));
      q.addEventListener('click', toggle);
      q.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      setCard(card, revealedPref);
    });
    const btn = document.getElementById('revealAll');
    if (btn) {
      const sync = () => { const l = btn.querySelector('.reveal-label'); if (l) l.textContent = revealedPref ? 'Collapse all' : 'Reveal all'; btn.classList.toggle('on', revealedPref); };
      btn.addEventListener('click', () => { revealedPref = !revealedPref; localStorage.setItem(pkey('reveal'), revealedPref ? 'all' : 'collapsed'); qaCards.forEach(c => setCard(c, revealedPref)); sync(); });
      sync();
    }
  }

  /* ============================================================
     Known / progress / filter  (scoped per technology)
     ============================================================ */
  function knownKey() { return pkey('known:' + TECHID); }
  function loadKnown() {
    try { knownSet = new Set(JSON.parse(localStorage.getItem(knownKey()) || '[]')); } catch (e) { knownSet = new Set(); }
    filterKnown = localStorage.getItem(pkey('filter')) === '1';
  }
  function saveKnown() { localStorage.setItem(knownKey(), JSON.stringify([...knownSet])); }
  function toggleKnown(card) {
    const adding = !knownSet.has(card.id);
    if (adding) knownSet.add(card.id); else knownSet.delete(card.id);
    card.classList.toggle('known', knownSet.has(card.id));
    if (adding) bumpActivity();
    saveKnown(); updateProgress(); applyFilter();
  }
  function updateProgress() {
    const total = qaCards.length, k = qaCards.filter(c => knownSet.has(c.id)).length;
    const txt = document.getElementById('progressText'), fill = document.getElementById('progressFill');
    if (txt) txt.textContent = k + ' / ' + total + ' known';
    if (fill) fill.style.width = (total ? (k / total) * 100 : 0) + '%';
    sectionsList.forEach(sec => {
      const rem = document.querySelector('.toc-sub[href="#' + sec.id + '"] .toc-rem');
      if (!rem) return;
      const left = [...sec.querySelectorAll('.card')].filter(c => !knownSet.has(c.id)).length;
      rem.textContent = left ? left : '✓'; rem.classList.toggle('done', left === 0);
    });
    if (TECH) TECH.topics.forEach(t => {
      const group = document.querySelector('.toc-group[data-topic="' + t.id + '"]'); if (!group) return;
      const left = [...document.querySelectorAll('.section[data-topic="' + t.id + '"] .card')].filter(c => !knownSet.has(c.id)).length;
      const rem = group.querySelector('.tt-rem'); if (rem) { rem.textContent = left ? left : '✓'; rem.classList.toggle('done', left === 0); }
    });
    updateReviewCount();
  }
  function updateReviewCount() {
    const el = document.getElementById('reviewCount'); if (!el) return;
    const left = qaCards.filter(c => !knownSet.has(c.id)).length;
    el.textContent = left;
    const btn = document.getElementById('reviewBtn'); if (btn) btn.classList.toggle('done', left === 0);
  }
  function applyFilter() {
    document.body.classList.toggle('filter-known', filterKnown);
    const btn = document.getElementById('filterKnown');
    if (btn) { btn.classList.toggle('on', filterKnown); const l = btn.querySelector('.filter-label'); if (l) l.textContent = filterKnown ? 'Showing to-learn' : 'Hide known'; }
    updateEmptyStates();
  }
  function updateEmptyStates() {
    const msg = document.getElementById('topicEmpty'); if (!msg) return;
    let show = false;
    if (filterKnown && currentSub && !document.body.classList.contains('searching')) {
      const sec = sectionsList.find(s => s.id === currentSub);
      if (sec) { const cards = [...sec.querySelectorAll('.card')]; show = cards.length > 0 && cards.every(c => knownSet.has(c.id)); }
    }
    msg.style.display = show ? '' : 'none';
  }
  function initKnown() {
    if (!qaCards.length) return;
    loadKnown();
    qaCards.forEach(c => c.classList.toggle('known', knownSet.has(c.id)));
    const fbtn = document.getElementById('filterKnown');
    if (fbtn) fbtn.addEventListener('click', () => { filterKnown = !filterKnown; localStorage.setItem(pkey('filter'), filterKnown ? '1' : '0'); applyFilter(); });
    updateProgress(); applyFilter();
  }

  /* ============================================================
     Search (within current technology — spans subtopics)
     ============================================================ */
  function initSearch() {
    const input = document.getElementById('search');
    if (!input || !document.querySelector('.section')) return;
    const empty = document.querySelector('.no-results');
    qaCards.forEach(c => { c.dataset.text = c.textContent.toLowerCase(); });
    function run(q) {
      q = q.trim().toLowerCase();
      document.body.classList.toggle('searching', !!q);
      if (!q) {
        sectionsList.forEach(s => { const cnt = s.querySelector('.count'); if (cnt) cnt.textContent = s.querySelectorAll('.card').length; });
        qaCards.forEach(c => { c.style.display = ''; });
        if (empty) empty.classList.remove('show');
        showSub(currentSub);
        return;
      }
      let any = false;
      qaCards.forEach(c => { const hit = c.dataset.text.includes(q); c.style.display = hit ? '' : 'none'; if (hit) { any = true; setCard(c, true); } });
      sectionsList.forEach(s => {
        const all = s.querySelectorAll('.card'); const v = [...all].filter(c => c.style.display !== 'none').length;
        s.style.display = v ? '' : 'none';
        const cnt = s.querySelector('.count'); if (cnt) cnt.textContent = v + ' / ' + all.length;
      });
      if (empty) empty.classList.toggle('show', !any);
    }
    input.addEventListener('input', () => run(input.value));
    input.addEventListener('keydown', e => { if (e.key === 'Escape') { input.value = ''; run(''); input.blur(); } });
  }

  /* ============================================================
     Router — one subtopic per view + rail tree
     ============================================================ */
  function setGroupOpen(group, open) {
    group.classList.toggle('open', open);
    const btn = group.querySelector('.toc-topic'); if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function showSub(id) {
    if (!sectionsList.length) return;
    const ids = sectionsList.map(s => s.id);
    if (!ids.includes(id)) id = ids[0];
    currentSub = id;
    if (TECHID) localStorage.setItem(pkey('last:' + TECHID), id);
    sectionsList.forEach(s => { s.style.display = s.id === id ? '' : 'none'; });
    railLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
    const sec = sectionsList.find(s => s.id === id);
    const topicId = sec.dataset.topic;
    document.querySelectorAll('.toc-group').forEach(g => setGroupOpen(g, g.dataset.topic === topicId));
    sec.querySelectorAll('.card').forEach(c => { c.style.display = ''; setCard(c, revealedPref); });
    clearFocus();
    updateTopicNav(id, ids);
    updateEmptyStates();
    window.scrollTo(0, 0);
  }
  function updateTopicNav(id, ids) {
    if (!topicNav) return;
    const i = ids.indexOf(id);
    const label = sid => { const h = sectionsList.find(s => s.id === sid).querySelector('h2'); return h ? h.textContent : sid; };
    const prev = topicNav.querySelector('.tn-prev'), next = topicNav.querySelector('.tn-next');
    if (i > 0) { prev.style.display = ''; prev.href = '#' + ids[i - 1]; prev.querySelector('.tn-name').textContent = label(ids[i - 1]); } else prev.style.display = 'none';
    if (i < ids.length - 1) { next.style.display = ''; next.href = '#' + ids[i + 1]; next.querySelector('.tn-name').textContent = label(ids[i + 1]); } else next.style.display = 'none';
  }
  function routeTo(h) {
    if (!sectionsList.length) return;
    const el = h && document.getElementById(h);
    if (el && el.classList.contains('card')) {
      const sec = el.closest('.section');
      showSub(sec.id); setCard(el, true);
      setTimeout(() => { window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1300); }, 80);
      return;
    }
    showSub(h);
  }
  function initRouter() {
    sectionsList = [...document.querySelectorAll('.section')];
    if (!sectionsList.length) return;
    railLinks = [...document.querySelectorAll('.toc-sub')];
    const inner = document.querySelector('.main-inner');
    if (inner) {
      topicNav = document.createElement('nav'); topicNav.className = 'topic-nav';
      topicNav.innerHTML = '<a class="tn-prev"><span class="tn-dir">← Previous</span><span class="tn-name"></span></a><a class="tn-next"><span class="tn-dir">Next →</span><span class="tn-name"></span></a>';
      inner.appendChild(topicNav);
    }
    const clearSearch = () => { const inp = document.getElementById('search'); if (inp && inp.value) { inp.value = ''; document.body.classList.remove('searching'); qaCards.forEach(c => { c.style.display = ''; }); sectionsList.forEach(s => { const cnt = s.querySelector('.count'); if (cnt) cnt.textContent = s.querySelectorAll('.card').length; }); const e = document.querySelector('.no-results'); if (e) e.classList.remove('show'); } };
    document.querySelectorAll('.toc-topic').forEach(btn => btn.addEventListener('click', () => { const g = btn.closest('.toc-group'); setGroupOpen(g, !g.classList.contains('open')); }));
    railLinks.forEach(a => a.addEventListener('click', e => { e.preventDefault(); clearSearch(); location.hash = a.getAttribute('href').slice(1); }));
    if (topicNav) topicNav.addEventListener('click', e => { const a = e.target.closest('a'); if (!a) return; e.preventDefault(); clearSearch(); location.hash = a.getAttribute('href').slice(1); });
    if (!window.__recallHashBound) { window.__recallHashBound = true; window.addEventListener('hashchange', () => routeTo(location.hash.slice(1))); }
    const resume = localStorage.getItem(pkey('last:' + TECHID));
    routeTo(location.hash.slice(1) || (resume && document.getElementById(resume) ? resume : sectionsList[0].id));
    updateProgress();
  }

  /* ============================================================
     Command palette (⌘K) — spans ALL technologies
     ============================================================ */
  function getIndex() {
    const out = [];
    allTechs().forEach(t => {
      (t.topics || []).forEach(top => top.subtopics.forEach(s => s.cards.forEach((c, ci) => {
        out.push({ kind: 'qa', tech: t.id, techName: t.name, topic: top.name + ' › ' + s.name, label: stripTags(c.q), page: 'qa.html', anchor: top.id + '-' + s.id + '-' + (ci + 1) });
      })));
      (t.book || []).forEach(b => out.push({ kind: 'book', tech: t.id, techName: t.name, topic: 'Book', label: b.title, page: 'book.html', anchor: b.id }));
    });
    return out;
  }
  function fuzzy(q, text) {
    if (!q) return 0; q = q.toLowerCase(); text = text.toLowerCase();
    const idx = text.indexOf(q); if (idx >= 0) return 1000 - idx - text.length * 0.05;
    let ti = 0, qi = 0, gaps = 0, last = -1;
    while (ti < text.length && qi < q.length) { if (text[ti] === q[qi]) { if (last >= 0) gaps += ti - last - 1; last = ti; qi++; } ti++; }
    if (qi < q.length) return -1; return 300 - gaps;
  }
  function initPalette() {
    const el = document.createElement('div'); el.className = 'cmdk'; el.id = 'cmdk'; el.hidden = true;
    el.innerHTML =
      '<div class="cmdk-backdrop"></div>' +
      '<div class="cmdk-panel" role="dialog" aria-modal="true" aria-label="Search recall">' +
        '<div class="cmdk-input">' + SEARCH +
          '<input id="cmdkInput" type="text" placeholder="Search every technology…" autocomplete="off" spellcheck="false"><span class="kbd">esc</span>' +
        '</div><ul class="cmdk-list" id="cmdkList"></ul>' +
        '<div class="cmdk-foot"><span><span class="kbd">↑</span><span class="kbd">↓</span> navigate</span><span><span class="kbd">↵</span> open</span></div>' +
      '</div>';
    document.body.appendChild(el);
    const input = el.querySelector('#cmdkInput'), list = el.querySelector('#cmdkList');
    let data = [], results = [], sel = 0;
    const pageTech = (PAGE === 'qa.html' || PAGE === 'book.html') ? currentTechId() : null;
    function render() {
      if (!results.length) { list.innerHTML = '<li class="cmdk-none">No matches</li>'; return; }
      list.innerHTML = '';
      results.forEach((r, i) => {
        const li = document.createElement('li'); li.className = 'cmdk-item' + (i === sel ? ' sel' : ''); li.dataset.i = i;
        li.innerHTML = '<span class="cmdk-tag ' + r.kind + '"></span><span class="cmdk-text"><span class="cmdk-label"></span><span class="cmdk-topic"></span></span><span class="cmdk-go">↵</span>';
        li.querySelector('.cmdk-tag').textContent = r.techName;
        li.querySelector('.cmdk-label').textContent = r.label;
        li.querySelector('.cmdk-topic').textContent = r.kind === 'qa' ? r.topic : 'Book';
        li.addEventListener('mousemove', () => { if (sel !== i) { sel = i; markSel(); } });
        li.addEventListener('click', () => go(r));
        list.appendChild(li);
      });
    }
    function markSel() { [...list.children].forEach((li, i) => li.classList.toggle('sel', i === sel)); const c = list.children[sel]; if (c && c.scrollIntoView) c.scrollIntoView({ block: 'nearest' }); }
    function search(q) {
      q = q.trim();
      if (!q) { results = data.slice(0, 30); sel = 0; render(); return; }
      results = data.map(e => ({ e, s: Math.max(fuzzy(q, e.label), fuzzy(q, e.topic) - 60, fuzzy(q, e.techName) - 40) }))
        .filter(x => x.s > -1).sort((a, b) => b.s - a.s).slice(0, 30).map(x => x.e);
      sel = 0; render();
    }
    function go(r) { close(); if (r.page === PAGE && r.tech === pageTech) location.hash = r.anchor; else location.href = r.page + '?tech=' + r.tech + '#' + r.anchor; }
    function open() { data = getIndex(); el.hidden = false; document.body.classList.add('cmdk-open'); input.value = ''; search(''); requestAnimationFrame(() => input.focus()); }
    function close() { el.hidden = true; document.body.classList.remove('cmdk-open'); }
    input.addEventListener('input', () => search(input.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, results.length - 1); markSel(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); markSel(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (results[sel]) go(results[sel]); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
    el.querySelector('.cmdk-backdrop').addEventListener('click', close);
    window.recallPalette = { open, close };
  }

  /* ============================================================
     Topbar: tech switcher + ⌘K trigger + tech-aware nav
     ============================================================ */
  function initTopbar() {
    const tb = document.querySelector('.topbar'); if (!tb) return;
    // tech-aware nav links
    tb.querySelectorAll('nav a').forEach(a => { const base = a.getAttribute('href').split('?')[0]; if (base === 'qa.html' || base === 'book.html') a.setAttribute('href', base + '?tech=' + currentTechId()); });
    // tech switcher
    const techs = allTechs();
    if (techs.length) {
      const wrap = document.createElement('div'); wrap.className = 'tech-switch';
      const sel = document.createElement('select'); sel.className = 'tech-select'; sel.id = 'techSelect'; sel.setAttribute('aria-label', 'Technology');
      techs.forEach(t => { const o = document.createElement('option'); o.value = t.id; o.textContent = t.name; if (t.id === currentTechId()) o.selected = true; sel.appendChild(o); });
      sel.addEventListener('change', () => { location.href = (document.getElementById('bookApp') ? 'book.html' : 'qa.html') + '?tech=' + sel.value; });
      wrap.appendChild(sel);
      const wm = tb.querySelector('.wordmark');
      if (wm && wm.nextSibling) tb.insertBefore(wrap, wm.nextSibling); else tb.appendChild(wrap);
    }
    // ⌘K trigger
    const btn = document.createElement('button'); btn.className = 'cmdk-trigger'; btn.type = 'button';
    btn.innerHTML = SEARCH + '<span>Search</span><span class="kbd">⌘K</span>';
    btn.addEventListener('click', () => window.recallPalette && window.recallPalette.open());
    const theme = tb.querySelector('.icon-btn');
    if (theme) tb.insertBefore(btn, theme); else tb.appendChild(btn);
    // reading-comfort trigger
    const cbtn = document.createElement('button'); cbtn.className = 'icon-btn comfort-trigger'; cbtn.type = 'button';
    cbtn.title = 'Reading comfort'; cbtn.setAttribute('aria-label', 'Reading comfort'); cbtn.innerHTML = AA;
    cbtn.addEventListener('click', () => window.recallComfort && window.recallComfort.toggle(cbtn));
    if (theme) tb.insertBefore(cbtn, theme); else tb.appendChild(cbtn);
  }

  /* ============================================================
     Book: search highlight + scroll-spy + h3 anchors
     ============================================================ */
  function initBook() {
    const inner = document.querySelector('.book-inner'); if (!inner) return;
    inner.querySelectorAll('h3').forEach(h => { if (!h.id) h.id = slug(h.textContent.trim()); });
    const jump = () => { const t = location.hash && document.getElementById(location.hash.slice(1)); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' }); };
    window.addEventListener('hashchange', jump);
    if (location.hash) setTimeout(jump, 90);
  }
  function initBookSearch() {
    const input = document.getElementById('search');
    const scope = document.querySelector('.book-inner');
    if (!input || !scope) return;
    const counter = document.querySelector('.search-count');
    let marks = [], idx = -1;
    function clear() { marks.forEach(m => { const t = document.createTextNode(m.textContent); m.replaceWith(t); }); marks = []; idx = -1; scope.normalize(); if (counter) counter.textContent = ''; }
    function walk(node, re) {
      if (node.nodeType === 3) {
        const text = node.nodeValue; if (!re.test(text)) return;
        const frag = document.createDocumentFragment(); let last = 0; re.lastIndex = 0; let m;
        while ((m = re.exec(text))) { if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index))); const mk = document.createElement('mark'); mk.className = 'hit'; mk.textContent = m[0]; frag.appendChild(mk); marks.push(mk); last = m.index + m[0].length; if (m[0].length === 0) re.lastIndex++; }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.replaceWith(frag);
      } else if (node.nodeType === 1 && !/^(MARK|SCRIPT|STYLE)$/.test(node.tagName)) { [...node.childNodes].forEach(c => walk(c, re)); }
    }
    function jump(to) { if (!marks.length) return; marks.forEach(m => m.classList.remove('on')); idx = (to + marks.length) % marks.length; const m = marks[idx]; m.classList.add('on'); window.scrollTo({ top: m.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' }); if (counter) counter.textContent = (idx + 1) + ' / ' + marks.length; }
    let t;
    input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { clear(); const q = input.value.trim(); if (q.length < 2) return; const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'); walk(scope, re); if (marks.length) jump(0); else if (counter) counter.textContent = 'no matches'; }, 140); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); jump(e.shiftKey ? idx - 1 : idx + 1); } if (e.key === 'Escape') { input.value = ''; clear(); input.blur(); } });
  }

  /* ---------- Scroll-spy (Book toc) ---------- */
  function initSpy() {
    if (document.querySelector('.section')) return;
    const links = [...document.querySelectorAll('.toc a[href^="#"]')]; if (!links.length) return;
    const map = new Map();
    links.forEach(l => { const t = document.getElementById(l.getAttribute('href').slice(1)); if (t) map.set(t, l); });
    const io = new IntersectionObserver(entries => { entries.forEach(en => { if (en.isIntersecting) { links.forEach(l => l.classList.remove('active')); const l = map.get(en.target); if (l) l.classList.add('active'); } }); }, { rootMargin: '-70px 0px -70% 0px', threshold: 0 });
    map.forEach((_, t) => io.observe(t));
    links.forEach(l => l.addEventListener('click', e => { const t = document.getElementById(l.getAttribute('href').slice(1)); if (t) { e.preventDefault(); window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' }); history.replaceState(null, '', l.getAttribute('href')); } }));
  }

  /* ---------- Keyboard ---------- */
  function initKeys() {
    document.addEventListener('keydown', e => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (window.recallPalette) window.recallPalette.open(); return; }
      const typing = /input|textarea|select/i.test(document.activeElement.tagName);
      if (typing || document.body.classList.contains('cmdk-open') || document.body.classList.contains('review-open')) return;
      if (e.key === '/') { e.preventDefault(); const i = document.getElementById('search'); if (i) { i.focus(); i.select(); } else if (window.recallPalette) window.recallPalette.open(); return; }
      if (e.key === '?') { e.preventDefault(); if (window.recallShortcuts) window.recallShortcuts.toggle(); return; }
      if (e.key.toLowerCase() === 't') { window.toggleTheme(); return; }
      // Q&A study flow
      if (sectionsList.length) {
        if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); moveFocus(1); }
        else if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); moveFocus(-1); }
        else if (e.key === ' ' || e.key === 'Enter' || e.key === 'o') { const c = focusedEl(); if (c) { e.preventDefault(); setCard(c, !c.classList.contains('open')); } }
        else if (e.key.toLowerCase() === 'm') { const c = focusedEl(); if (c) { e.preventDefault(); toggleKnown(c); } }
        else if (e.key === ']') { e.preventDefault(); navSub(1); }
        else if (e.key === '[') { e.preventDefault(); navSub(-1); }
        else if (e.key.toLowerCase() === 'r') { e.preventDefault(); if (window.recallReview) window.recallReview.open(); }
      }
    });
  }

  /* ============================================================
     Keyboard study flow — focus a card, move, reveal, mark
     ============================================================ */
  let focusIdx = -1;
  function visibleCards() {
    const sec = sectionsList.find(s => s.id === currentSub);
    return sec ? [...sec.querySelectorAll('.card')].filter(c => c.offsetParent !== null) : [];
  }
  function clearFocus() { document.querySelectorAll('.card.focused').forEach(c => c.classList.remove('focused')); focusIdx = -1; }
  function focusCard(i) {
    const cards = visibleCards(); if (!cards.length) return;
    i = Math.max(0, Math.min(i, cards.length - 1));
    document.querySelectorAll('.card.focused').forEach(c => c.classList.remove('focused'));
    const c = cards[i]; c.classList.add('focused'); focusIdx = i;
    const top = c.getBoundingClientRect().top;
    if (top < 80 || top > window.innerHeight - 120) window.scrollTo({ top: c.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
  }
  function moveFocus(d) { const cards = visibleCards(); if (!cards.length) return; if (focusIdx < 0) focusCard(d > 0 ? 0 : cards.length - 1); else focusCard(focusIdx + d); }
  function focusedEl() { const cards = visibleCards(); return focusIdx >= 0 ? cards[focusIdx] : null; }
  function navSub(d) { const ids = sectionsList.map(s => s.id); const i = ids.indexOf(currentSub); const j = i + d; if (j < 0 || j >= ids.length) return; clearFocus(); location.hash = ids[j]; }

  /* ============================================================
     Reading-comfort popover (text size + width)
     ============================================================ */
  function initComfort() {
    const pop = document.createElement('div'); pop.className = 'cog-pop'; pop.id = 'cogPop'; pop.hidden = true;
    pop.innerHTML =
      '<div class="cog-row"><span class="cog-lbl">Text size</span><div class="seg" data-set="size"><button data-v="s">Small</button><button data-v="m">Medium</button><button data-v="l">Large</button></div></div>' +
      '<div class="cog-row"><span class="cog-lbl">Reading width</span><div class="seg" data-set="width"><button data-v="cozy">Cozy</button><button data-v="normal">Normal</button><button data-v="wide">Wide</button></div></div>';
    document.body.appendChild(pop);
    function sync() {
      pop.querySelectorAll('.seg').forEach(seg => {
        const set = seg.dataset.set, cur = root.getAttribute('data-' + set) || (set === 'size' ? 'm' : 'normal');
        seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === cur));
      });
    }
    pop.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const set = b.closest('.seg').dataset.set; root.setAttribute('data-' + set, b.dataset.v); localStorage.setItem('recall-' + set, b.dataset.v); sync(); });
    sync();
    window.recallComfort = {
      toggle(anchor) { if (pop.hidden) { const r = anchor.getBoundingClientRect(); pop.style.top = (r.bottom + 8) + 'px'; pop.style.right = (window.innerWidth - r.right) + 'px'; pop.hidden = false; sync(); } else pop.hidden = true; },
      close() { pop.hidden = true; }
    };
    document.addEventListener('click', e => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('.comfort-trigger')) pop.hidden = true; });
  }

  /* ============================================================
     Shortcuts overlay (?)
     ============================================================ */
  function initShortcuts() {
    const rows = [
      ['j&nbsp;/&nbsp;k', 'Move between questions'],
      ['space', 'Reveal / hide answer'],
      ['m', 'Mark as known'],
      ['[&nbsp;/&nbsp;]', 'Previous / next subtopic'],
      ['r', 'Start a review session'],
      ['⌘K', 'Search every subject'],
      ['/', 'Filter this subject'],
      ['t', 'Light / dark'],
      ['?', 'This help']
    ];
    const ov = document.createElement('div'); ov.className = 'sc-ov'; ov.id = 'scOv'; ov.hidden = true;
    ov.innerHTML = '<div class="sc-back"></div><div class="sc-panel"><h3>Keyboard shortcuts</h3><ul>' +
      rows.map(r => '<li><span class="sc-keys">' + r[0].split('/').map(k => '<span class="kbd">' + k.trim().replace(/&nbsp;/g, '') + '</span>').join('<i>/</i>') + '</span><span class="sc-desc">' + r[1] + '</span></li>').join('') +
      '</ul></div>';
    document.body.appendChild(ov);
    function close() { ov.hidden = true; }
    ov.querySelector('.sc-back').addEventListener('click', close);
    window.recallShortcuts = { toggle() { ov.hidden = !ov.hidden; }, close };
    document.addEventListener('keydown', e => { if (!ov.hidden && e.key === 'Escape') { e.preventDefault(); close(); } });
  }

  /* ============================================================
     Review (cram) mode — one unknown card at a time
     ============================================================ */
  function initReview() {
    const trigger = document.getElementById('reviewBtn'); if (!trigger) return;
    const ov = document.createElement('div'); ov.className = 'review'; ov.id = 'review'; ov.hidden = true;
    ov.innerHTML =
      '<div class="rv-top"><span class="rv-count" id="rvCount"></span><div class="rv-prog"><span id="rvFill"></span></div><button class="rv-close" id="rvClose">Close <span class="kbd">esc</span></button></div>' +
      '<div class="rv-stage" id="rvStage"></div>';
    document.body.appendChild(ov);
    const stage = ov.querySelector('#rvStage');
    let queue = [], pos = 0, revealed = false;

    function open() {
      queue = qaCards.filter(c => !knownSet.has(c.id)); pos = 0;
      document.body.classList.add('review-open'); ov.hidden = false;
      if (!queue.length) renderDone(true); else render();
    }
    function close() {
      ov.hidden = true; document.body.classList.remove('review-open');
      qaCards.forEach(c => c.classList.toggle('known', knownSet.has(c.id)));
      updateProgress(); applyFilter(); if (currentSub) showSub(currentSub);
    }
    function renderDone(all) {
      document.getElementById('rvCount').textContent = '';
      document.getElementById('rvFill').style.width = '100%';
      stage.innerHTML = '<div class="rv-empty"><div class="te-mark">✓</div><p>' + (all ? 'Nothing to review — every card here is marked known.' : 'Review complete. Nicely done.') + '</p><button class="rv-done-btn" id="rvDoneBtn">Back to studying</button></div>';
      stage.querySelector('#rvDoneBtn').addEventListener('click', close);
    }
    function render() {
      if (pos >= queue.length) { renderDone(false); return; }
      revealed = false;
      const card = queue[pos], sec = card.closest('.section');
      const crumb = (sec.querySelector('.crumb') ? sec.querySelector('.crumb').textContent : '') + ' › ' + (sec.querySelector('h2') ? sec.querySelector('h2').textContent : '');
      const qNode = (card.querySelector('.q-text') || card.querySelector('.q')).cloneNode(true);
      qNode.querySelectorAll('.q-tag, .marker, .chev, .known-btn').forEach(n => n.remove());
      document.getElementById('rvCount').textContent = (pos + 1) + ' / ' + queue.length;
      document.getElementById('rvFill').style.width = (pos / queue.length * 100) + '%';
      stage.innerHTML =
        '<div class="rv-card"><div class="rv-crumb">' + crumb + '</div>' +
        '<div class="rv-q">' + qNode.innerHTML + '</div>' +
        '<div class="rv-a" hidden>' + card.querySelector('.a').innerHTML + '</div>' +
        '<button class="rv-reveal" id="rvReveal">Reveal answer <span class="kbd">space</span></button>' +
        '<div class="rv-actions" id="rvActions" hidden><button class="rv-again" id="rvAgain">Still learning <span class="kbd">j</span></button><button class="rv-got" id="rvGot">Got it <span class="kbd">m</span></button></div></div>';
      applyHighlight(stage);
      stage.querySelector('#rvReveal').addEventListener('click', reveal);
      stage.querySelector('#rvAgain').addEventListener('click', () => advance(false));
      stage.querySelector('#rvGot').addEventListener('click', () => advance(true));
    }
    function reveal() { if (revealed) return; revealed = true; stage.querySelector('.rv-a').hidden = false; stage.querySelector('#rvReveal').hidden = true; stage.querySelector('#rvActions').hidden = false; }
    function advance(got) { const card = queue[pos]; if (got) { knownSet.add(card.id); saveKnown(); bumpActivity(); } bumpReview(got); pos++; render(); }

    trigger.addEventListener('click', open);
    ov.querySelector('#rvClose').addEventListener('click', close);
    document.addEventListener('keydown', e => {
      if (ov.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === ' ') { e.preventDefault(); if (!revealed) reveal(); else advance(false); }
      else if (e.key.toLowerCase() === 'm') { e.preventDefault(); advance(true); }
      else if (e.key.toLowerCase() === 'j' || e.key === 'ArrowRight') { e.preventDefault(); advance(false); }
    });
    window.recallReview = { open };
    updateReviewCount();
  }

  /* ============================================================
     Profile menu (topbar avatar)
     ============================================================ */
  function avatarSpan(p, cls) { return '<span class="avatar ' + (cls || '') + '" style="--ac:' + p.color + '">' + initials(p.name) + '</span>'; }
  function initProfileMenu() {
    const tb = document.querySelector('.topbar'); if (!tb) return;
    const btn = document.createElement('button'); btn.className = 'avatar-btn'; btn.type = 'button';
    const cur = Profiles.current(); btn.title = cur.name + ' — profile';
    btn.innerHTML = avatarSpan(cur);
    tb.appendChild(btn);
    const pop = document.createElement('div'); pop.className = 'prof-pop'; pop.hidden = true; document.body.appendChild(pop);
    function renderPop() {
      const cur = Profiles.current(), list = Profiles.list();
      pop.innerHTML =
        '<div class="pp-head">' + avatarSpan(cur, 'lg') + '<div><div class="pp-name">' + cur.name + '</div><a class="pp-prog" href="progress.html">View progress →</a></div></div>' +
        '<div class="pp-sec">Profiles</div>' +
        '<div class="pp-list">' + list.map(p => '<button class="pp-item' + (p.id === cur.id ? ' on' : '') + '" data-id="' + p.id + '">' + avatarSpan(p, 'sm') + '<span class="pp-pname">' + p.name + '</span>' + (p.id === cur.id ? '<span class="pp-check">current</span>' : '') + '</button>').join('') + '</div>' +
        '<div class="pp-actions"><button id="ppAdd">+ Add</button><button id="ppRename">Rename</button>' + (list.length > 1 ? '<button id="ppRemove" class="pp-danger">Remove</button>' : '') + '</div>' +
        '<div class="pp-admin">' + (adminUnlocked()
          ? '<button id="ppEdit" class="' + (editMode() ? 'on' : '') + '">' + (editMode() ? '✓ Done editing' : 'Enable edit mode') + '</button><button id="ppLock" class="pp-mut">Sign out admin</button>'
          : '<button id="ppAdmin" class="pp-mut">Admin sign-in…</button>') + '</div>' +
        '<div class="pp-form" id="ppForm" hidden><input type="text" id="ppInput" maxlength="24" autocomplete="off" spellcheck="false"><button id="ppSave">Save</button></div>';
      pop.querySelectorAll('.pp-item').forEach(it => it.addEventListener('click', () => { const id = it.dataset.id; if (id !== Profiles.currentId()) { Profiles.setCurrent(id); location.reload(); } }));
      let mode = 'add';
      const form = pop.querySelector('#ppForm'), input = pop.querySelector('#ppInput');
      pop.querySelector('#ppAdd').addEventListener('click', () => { mode = 'add'; form.hidden = false; input.value = ''; input.placeholder = 'New profile name'; input.focus(); });
      pop.querySelector('#ppRename').addEventListener('click', () => { mode = 'rename'; form.hidden = false; input.value = Profiles.current().name; input.focus(); input.select(); });
      const rem = pop.querySelector('#ppRemove');
      if (rem) rem.addEventListener('click', () => { window.uiConfirm('Remove profile?', 'Remove “' + Profiles.current().name + '” and all its progress?').then(ok => { if (ok) { Profiles.remove(Profiles.currentId()); location.reload(); } }); });
      const adm = pop.querySelector('#ppAdmin'); if (adm) adm.addEventListener('click', unlockAdmin);
      const ppEdit = pop.querySelector('#ppEdit'); if (ppEdit) ppEdit.addEventListener('click', () => setEdit(!editMode()));
      const ppLock = pop.querySelector('#ppLock'); if (ppLock) ppLock.addEventListener('click', lockAdmin);
      const ppExport = pop.querySelector('#ppExport'); if (ppExport) ppExport.addEventListener('click', exportTech);
      const ppReset = pop.querySelector('#ppReset'); if (ppReset) ppReset.addEventListener('click', () => handleEdit('reset-tech'));
      const ppRenameTech = pop.querySelector('#ppRenameTech'); if (ppRenameTech) ppRenameTech.addEventListener('click', () => handleEdit('ren-tech'));
      function submit() { const v = input.value.trim(); if (!v) return; if (mode === 'add') Profiles.create(v); else Profiles.rename(Profiles.currentId(), v); location.reload(); }
      pop.querySelector('#ppSave').addEventListener('click', submit);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    }
    btn.addEventListener('click', () => { if (pop.hidden) { renderPop(); const r = btn.getBoundingClientRect(); pop.style.top = (r.bottom + 8) + 'px'; pop.style.right = (window.innerWidth - r.right) + 'px'; pop.hidden = false; } else pop.hidden = true; });
    document.addEventListener('click', e => { if (!pop.hidden && !pop.contains(e.target) && !btn.contains(e.target)) pop.hidden = true; });
  }

  /* ============================================================
     Progress dashboard (progress.html)
     ============================================================ */
  function knownSetFor(techId) { try { return new Set(JSON.parse(localStorage.getItem('recall:' + Profiles.currentId() + ':known:' + techId) || '[]')); } catch (e) { return new Set(); } }
  function techStats(techId) {
    const t = getTech(techId), ks = knownSetFor(techId); let total = 0, known = 0; const topics = [];
    (t.topics || []).forEach(top => {
      let tt = 0, tk = 0; const subs = [];
      top.subtopics.forEach(s => {
        const ids = s.cards.map((c, ci) => top.id + '-' + s.id + '-' + (ci + 1));
        const sk = ids.filter(id => ks.has(id)).length; tt += ids.length; tk += sk;
        subs.push({ id: top.id + '-' + s.id, name: s.name, topicName: top.name, total: ids.length, known: sk });
      });
      total += tt; known += tk; topics.push({ id: top.id, name: top.name, total: tt, known: tk, subs });
    });
    return { id: techId, name: t.name, total, known, topics };
  }
  function activityMap() { try { return JSON.parse(localStorage.getItem(pkey('activity')) || '{}'); } catch (e) { return {}; } }
  function streakCount() {
    const m = activityMap(); const d = new Date(); const k = dt => dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate());
    if (!m[k(d)]) d.setDate(d.getDate() - 1);
    let s = 0; while (m[k(d)]) { s++; d.setDate(d.getDate() - 1); } return s;
  }
  function lastDays(n) { const m = activityMap(), arr = [], d = new Date(); for (let i = n - 1; i >= 0; i--) { const dt = new Date(d); dt.setDate(d.getDate() - i); const k = dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate()); arr.push({ k, c: m[k] || 0 }); } return arr; }

  function renderProgress() {
    const mount = document.getElementById('progressApp'); if (!mount) return false;
    const cur = Profiles.current();
    const techs = allTechs().map(t => techStats(t.id));
    const totalAll = techs.reduce((a, t) => a + t.total, 0);
    const knownAll = techs.reduce((a, t) => a + t.known, 0);
    const pct = totalAll ? Math.round(knownAll / totalAll * 100) : 0;
    let reviews = { cards: 0, gotit: 0 }; try { reviews = Object.assign(reviews, JSON.parse(localStorage.getItem(pkey('reviews')) || '{}')); } catch (e) {}
    const gotRate = reviews.cards ? Math.round(reviews.gotit / reviews.cards * 100) : 0;
    const st = streakCount(); const days = lastDays(21);
    const maxDay = Math.max(1, ...days.map(d => d.c));
    const weak = [];
    techs.forEach(t => t.topics.forEach(top => top.subs.forEach(s => { const left = s.total - s.known; if (left > 0) weak.push({ tech: t.id, techName: t.name, id: s.id, name: top.name + ' › ' + s.name, left }); })));
    weak.sort((a, b) => b.left - a.left); const next = weak.slice(0, 5);

    const streakLine = st > 0 ? ' · ' + st + '-day streak' : '';

    // GitHub-style activity calendar (26 weeks)
    const m = activityMap();
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const WEEKS = 26;
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const startWeek = new Date(today0); startWeek.setDate(today0.getDate() - today0.getDay() - (WEEKS - 1) * 7);
    let activeDays = 0, colsHtml = '', monthsHtml = '', prevMonth = -1;
    for (let w = 0; w < WEEKS; w++) {
      const colFirst = new Date(startWeek); colFirst.setDate(startWeek.getDate() + w * 7);
      const mo = colFirst.getMonth();
      monthsHtml += '<span class="pg-cal-mo">' + (mo !== prevMonth ? MONTHS[mo] : '') + '</span>'; prevMonth = mo;
      let cells = '';
      for (let d = 0; d < 7; d++) {
        const dt = new Date(startWeek); dt.setDate(startWeek.getDate() + w * 7 + d);
        if (dt > today0) { cells += '<span class="pg-cell future"></span>'; continue; }
        const key = dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate());
        const c = m[key] || 0; if (c > 0) activeDays++;
        const lvl = c === 0 ? 0 : c <= 2 ? 1 : c <= 5 ? 2 : c <= 9 ? 3 : 4;
        cells += '<span class="pg-cell' + (lvl ? ' l' + lvl : '') + '" title="' + key + ' · ' + c + ' marked known"></span>';
      }
      colsHtml += '<span class="pg-cal-col">' + cells + '</span>';
    }
    const calendar = '<section class="pg-sec"><div class="pg-cal-head"><h2>Activity</h2><span class="pg-cal-meta">' + activeDays + ' active day' + (activeDays === 1 ? '' : 's') + (st > 0 ? ' · ' + st + '-day streak' : '') + '</span></div>' +
      '<div class="pg-cal"><div class="pg-cal-months">' + monthsHtml + '</div><div class="pg-cal-grid">' + colsHtml + '</div>' +
      '<div class="pg-cal-legend">Less <span class="pg-cell"></span><span class="pg-cell l1"></span><span class="pg-cell l2"></span><span class="pg-cell l3"></span><span class="pg-cell l4"></span> More</div></div></section>';

    const subjects = '<section class="pg-sec"><h2>Subjects</h2><div class="pg-list">' +
      techs.map(t => {
        const p = t.total ? Math.round(t.known / t.total * 100) : 0;
        return '<a class="pg-row" href="qa.html?tech=' + t.id + '"><span class="pg-row-name">' + t.name + '</span><span class="pg-row-bar"><span style="width:' + p + '%"></span></span><span class="pg-row-num">' + t.known + ' / ' + t.total + '</span><span class="pg-row-pct">' + p + '%</span></a>';
      }).join('') + '</div></section>';

    const studyNext = next.length ? '<section class="pg-sec"><h2>Study next</h2><div class="pg-next">' +
      next.slice(0, 3).map(s => '<a class="pg-next-item" href="qa.html?tech=' + s.tech + '#' + s.id + '"><div><span class="pg-next-name">' + s.name + '</span><span class="pg-next-tech">' + s.techName + '</span></div><span class="pg-next-left">' + s.left + ' left</span></a>').join('') +
      '</div></section>' :
      '<section class="pg-sec"><div class="pg-allclear"><div class="te-mark">✓</div><p>Every card across every subject is marked known. Outstanding.</p></div></section>';

    mount.innerHTML =
      '<div class="pg-inner">' +
      '<header class="pg-head">' + avatarSpan(cur, 'lg') + '<div class="pg-id"><h1>' + cur.name + '</h1><p>' + pct + '% mastered · ' + knownAll + ' of ' + totalAll + ' cards' + streakLine + '</p></div></header>' +
      calendar + subjects + studyNext +
      '</div>';
    return true;
  }

  /* ============================================================
     Admin edit mode — CRUD on the active subject
     ============================================================ */
  function uniqId(name, arr) { let base = slug(name) || 'item', id = base, n = 2; while (arr.some(e => e.id === id)) id = base + '-' + (n++); return id; }
  function remountQA() {
    if (!document.getElementById('qaApp')) { location.reload(); return; }
    const y = window.scrollY;
    renderQA();
    // Re-run only the child-scoped inits (renderQA replaces #qaApp's children).
    // initEdit is delegated on the persistent #qaApp element, so it must NOT be
    // re-run; the topbar/global inits aren't re-rendered either.
    applyHighlight(); initCollapse(); initKnown(); initSearch(); initRouter();
    window.scrollTo(0, y);
  }
  window.recallRemount = remountQA;
  function commitTech() { saveTech(TECHID, TECH); remountQA(); }

  function exportTech() {
    const body = '/* recall — ' + TECH.name + ' content (exported) */\n' +
      'window.RECALL_CONTENT = window.RECALL_CONTENT || {};\n' +
      'window.RECALL_CONTENT[' + JSON.stringify(TECHID) + '] = ' + JSON.stringify(TECH, null, 2) + ';\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/javascript' }));
    a.download = TECHID + '.js'; document.body.appendChild(a); a.click(); a.remove();
  }

  function openCardEditor(ti, si, ci) {
    const s = TECH.topics[ti].subtopics[si];
    const ex = ci != null ? s.cards[ci] : null;
    const ov = document.createElement('div'); ov.className = 'ed-ov';
    ov.innerHTML =
      '<div class="ed-back"></div><div class="ed-panel" role="dialog" aria-modal="true">' +
      '<div class="ed-head"><h3>' + (ex ? 'Edit question' : 'New question') + '</h3><button class="ed-x" title="Close">✕</button></div>' +
      '<div class="ed-body">' +
      '<label class="ed-lbl">Question<span>plain text or HTML — wrap code in &lt;code&gt;…&lt;/code&gt;</span></label>' +
      '<input class="ed-q" type="text" spellcheck="false">' +
      '<label class="ed-lbl">Answer<span>HTML — &lt;p&gt;, &lt;pre&gt;&lt;code&gt;…&lt;/code&gt;&lt;/pre&gt;, &lt;ul&gt;, tables, &lt;p class="note"&gt;</span></label>' +
      '<textarea class="ed-a" rows="9" spellcheck="false"></textarea>' +
      '<label class="ed-long"><input type="checkbox" class="ed-longcb"> Mark as “in-depth” (long answer)</label>' +
      '<div class="ed-prev-lbl">Preview</div><div class="ed-prev"><article class="card open"><h3 class="q"><span class="marker">Q</span><span class="q-text"></span></h3><div class="a"></div></article></div>' +
      '</div>' +
      '<div class="ed-foot">' + (ex ? '<button class="ed-del">Delete</button>' : '') + '<span class="ed-spacer"></span><button class="ed-cancel">Cancel</button><button class="ed-save">Save question</button></div>' +
      '</div>';
    document.body.appendChild(ov); document.body.classList.add('ed-open');
    const qIn = ov.querySelector('.ed-q'), aIn = ov.querySelector('.ed-a'), longCb = ov.querySelector('.ed-longcb');
    const pvQ = ov.querySelector('.ed-prev .q-text'), pvA = ov.querySelector('.ed-prev .a');
    qIn.value = ex ? ex.q : ''; aIn.value = ex ? ex.a : '<p class="answer-line"></p>'; longCb.checked = !!(ex && ex.long);
    function preview() { pvQ.innerHTML = qIn.value || '<span style="color:var(--ink-3)">Question…</span>'; pvA.innerHTML = aIn.value; pvA.querySelectorAll('pre > code').forEach(el => { el.innerHTML = highlight(el.textContent); }); }
    qIn.addEventListener('input', preview); aIn.addEventListener('input', preview); preview();
    function close() { ov.remove(); document.body.classList.remove('ed-open'); }
    ov.querySelector('.ed-x').addEventListener('click', close);
    ov.querySelector('.ed-cancel').addEventListener('click', close);
    ov.querySelector('.ed-back').addEventListener('click', close);
    ov.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    const del = ov.querySelector('.ed-del');
    if (del) del.addEventListener('click', () => { window.uiConfirm('Delete question?', 'This permanently removes the question.').then(ok => { if (ok) { s.cards.splice(ci, 1); commitTech(); } }); });
    ov.querySelector('.ed-save').addEventListener('click', () => {
      const q = qIn.value.trim(); if (!q) { qIn.focus(); return; }
      const card = { q: q, a: aIn.value }; if (longCb.checked) card.long = true;
      if (ci != null) s.cards[ci] = card; else s.cards.push(card);
      location.hash = TECH.topics[ti].id + '-' + s.id;
      commitTech();
    });
    setTimeout(() => qIn.focus(), 30);
  }

  function handleEdit(act, ti, si, ci) {
    const T = TECH.topics, top = ti != null ? T[ti] : null, sub = (top && si != null) ? top.subtopics[si] : null;
    switch (act) {
      case 'add-card': openCardEditor(ti, si, null); break;
      case 'edit-card': openCardEditor(ti, si, ci); break;
      case 'del-card': window.uiConfirm('Delete question?', 'This permanently removes the question.').then(ok => { if (ok) { sub.cards.splice(ci, 1); commitTech(); } }); break;
      case 'ren-sub': window.uiPrompt('Rename subtopic', sub.name).then(n => { if (n && n.trim()) { sub.name = n.trim(); commitTech(); } }); break;
      case 'del-sub': window.uiConfirm('Delete subtopic?', 'Delete “' + sub.name + '” and its questions?').then(ok => { if (ok) { top.subtopics.splice(si, 1); if (!top.subtopics.length) top.subtopics.push({ id: 'new', name: 'New subtopic', cards: [] }); commitTech(); } }); break;
      case 'add-sub': window.uiPrompt('New subtopic', '').then(n => { if (n && n.trim()) { const at = (si == null || isNaN(si)) ? top.subtopics.length : si + 1; const ns = { id: uniqId(n, top.subtopics), name: n.trim(), cards: [] }; top.subtopics.splice(at, 0, ns); location.hash = top.id + '-' + ns.id; commitTech(); } }); break;
      case 'ren-topic': window.uiPrompt('Rename topic', top.name).then(n => { if (n && n.trim()) { top.name = n.trim(); commitTech(); } }); break;
      case 'del-topic': window.uiConfirm('Delete topic?', 'Delete “' + top.name + '” and everything in it?').then(ok => { if (ok) { T.splice(ti, 1); if (!T.length) T.push({ id: 'new', name: 'New topic', subtopics: [{ id: 'new', name: 'New subtopic', cards: [] }] }); commitTech(); } }); break;
      case 'add-topic': window.uiPrompt('New topic', '').then(n => { if (n && n.trim()) { const ns = { id: 'intro', name: 'Overview', cards: [] }; T.push({ id: uniqId(n, T), name: n.trim(), subtopics: [ns] }); location.hash = T[T.length - 1].id + '-intro'; commitTech(); } }); break;
      case 'ren-tech': window.uiPrompt('Rename subject', TECH.name).then(n => { if (n && n.trim()) { TECH.name = n.trim(); commitTech(); } }); break;
      case 'reset-tech': window.uiConfirm('Discard local edits?', 'Discard all local edits for “' + TECH.name + '” and restore the original?').then(ok => { if (ok) { resetTech(TECHID); location.reload(); } }); break;
      case 'export': exportTech(); break;
      case 'exit-edit': setEdit(false); break;
    }
  }

  function initEdit() {
    if (!editMode()) return;
    document.body.classList.add('is-editing');
    const app = document.getElementById('qaApp'); if (!app) return;
    app.addEventListener('click', e => {
      const btn = e.target.closest('[data-act]'); if (!btn || !app.contains(btn)) return;
      e.preventDefault(); e.stopPropagation();
      const card = btn.closest('.card'), sec = btn.closest('.section'), subrow = btn.closest('.toc-subrow'), group = btn.closest('.toc-group');
      let ti = null, si = null, ci = null;
      if (card) { ti = +card.dataset.ti; si = +card.dataset.si; ci = +card.dataset.ci; }
      else if (sec) { ti = +sec.dataset.ti; si = +sec.dataset.si; }
      else if (subrow) { ti = +subrow.dataset.ti; si = +subrow.dataset.si; }
      else if (group) { ti = +group.dataset.ti; }
      handleEdit(btn.dataset.act, ti, si, ci);
    });
  }

  /* ============================================================
     Drag-and-drop reordering (edit mode)
     ============================================================ */
  function getDragAfter(container, selector, y) {
    const els = [...container.querySelectorAll(selector + ':not(.dragging)')];
    let closest = null, co = -Infinity;
    for (const el of els) { const b = el.getBoundingClientRect(); const off = y - b.top - b.height / 2; if (off < 0 && off > co) { co = off; closest = el; } }
    return closest;
  }
  function sortable(container, selector, onReorder, skipSel) {
    if (!container) return;
    container.querySelectorAll(selector).forEach(it => it.setAttribute('draggable', 'true'));
    let dragEl = null;
    container.addEventListener('dragstart', e => {
      if (skipSel && e.target.closest(skipSel)) return;
      const it = e.target.closest(selector);
      if (!it || !container.contains(it)) return;
      dragEl = it; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', ''); } catch (_) {}
      setTimeout(() => it.classList.add('dragging'), 0);
    });
    container.addEventListener('dragover', e => {
      if (!dragEl) return; e.preventDefault();
      const after = getDragAfter(container, selector, e.clientY);
      if (!after) container.appendChild(dragEl); else container.insertBefore(dragEl, after);
    });
    container.addEventListener('drop', e => { if (dragEl) e.preventDefault(); });
    container.addEventListener('dragend', () => {
      if (!dragEl) return; dragEl.classList.remove('dragging');
      const order = [...container.querySelectorAll(selector)].map(el => +el.dataset.idx);
      dragEl = null;
      const changed = order.some((v, i) => v !== i);
      if (changed) onReorder(order);
    });
  }
  function initSort() {
    if (!editMode()) return;
    const tree = document.querySelector('.toc.tree');
    // topics
    sortable(tree, '.toc-group', order => { TECH.topics = order.map(i => TECH.topics[i]); commitTech(); }, '.toc-sub');
    // subtopics within each topic
    if (tree) tree.querySelectorAll('.toc-group').forEach(g => {
      const ti = +g.dataset.ti;
      sortable(g.querySelector('.toc-subs'), '.toc-sub', order => { const subs = TECH.topics[ti].subtopics; TECH.topics[ti].subtopics = order.map(i => subs[i]); commitTech(); });
    });
    // questions within each subtopic
    document.querySelectorAll('.section').forEach(sec => {
      const ti = +sec.dataset.ti, si = +sec.dataset.si;
      sortable(sec, '.card', order => { const cards = TECH.topics[ti].subtopics[si].cards; location.hash = sec.id; TECH.topics[ti].subtopics[si].cards = order.map(i => cards[i]); commitTech(); });
    });
  }

  /* ============================================================
     Boot
     ============================================================ */
  document.addEventListener('DOMContentLoaded', function () {
    Profiles.ensure();
    if (document.getElementById('homeApp')) {
      renderHome();
      initPalette(); initShortcuts(); initKeys();
      return;
    }
    if (document.getElementById('qaApp')) {
      renderQA();
      applyHighlight(); initCollapse(); initKnown(); initSearch(); initRouter();
      initPalette(); initTopbar(); initProfileMenu(); initComfort(); initShortcuts(); initReview(); initKeys(); initEdit(); initSort();
      return;
    }
    if (document.getElementById('bookApp')) {
      renderBook();
      applyHighlight(); initBook(); initBookSearch(); initSpy();
      initPalette(); initTopbar(); initProfileMenu(); initComfort(); initShortcuts(); initKeys();
      return;
    }
    if (document.getElementById('progressApp')) {
      renderProgress();
      initPalette(); initTopbar(); initProfileMenu(); initShortcuts(); initKeys();
      return;
    }
  });
})();
