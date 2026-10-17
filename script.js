/* Nom Nom Diary — meal price tracker. Data is stored in the browser (localStorage). */
(() => {
  'use strict';

  const KEY = 'nomnom-diary-v1';
  const TYPES = {
    breakfast: { emoji: '🥞', label: 'Breakfast' },
    lunch:     { emoji: '🍱', label: 'Lunch' },
    dinner:    { emoji: '🍜', label: 'Dinner' },
    snack:     { emoji: '🍡', label: 'Snack' },
    treat:     { emoji: '🧋', label: 'Treat' },
  };
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const CUTE = [
    'Tell me what yummy things you ate today!',
    'Snack time? I won\'t tell 🤫',
    'You deserve all the good food 💕',
    'Eating well is self-care 🌸',
    'Every bite counts, cutie ✨',
    'Hehe, that tickles! 🐱',
    'I\'m so proud of you for tracking! 🍓',
    'Hydrate too, okay? 💧',
    'Treat yourself — you\'re worth it 🧁',
    'Boop! You found me 🎀',
  ];
  const SAVED = ['Yum, saved! 🍓', 'Added to the diary 💕', 'Nom nom noted! 🍡', 'Saved with love ✨', 'Tasty! 🧁'];

  const $ = (id) => document.getElementById(id);

  /* ---------- state ---------- */
  let state = load();
  const now = new Date();
  const view = { mode: 'month', year: now.getFullYear(), month: now.getMonth() };
  let editingId = null;
  let historyMode = 'month';
  let shownTotal = 0;

  function load() {
    const fallback = { meals: [], settings: { name: '', currency: '₹', budget: 0 } };
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (!raw) return fallback;
      return {
        meals: Array.isArray(raw.meals) ? raw.meals : [],
        settings: Object.assign(fallback.settings, raw.settings || {}),
      };
    } catch { return fallback; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { toast('Could not save — is your browser storage full? 🥺'); }
  }

  /* ---------- helpers ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const money = (n) => state.settings.currency + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const parts = (dateStr) => { const [y, m, d] = dateStr.split('-').map(Number); return { y, m: m - 1, d }; };
  const sum = (arr) => arr.reduce((t, m) => t + m.price, 0);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function inView(meal) {
    const p = parts(meal.date);
    return p.y === view.year && (view.mode === 'year' || p.m === view.month);
  }

  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function say(msg) { $('bubble').textContent = msg; }

  function burst(x, y, emojis = ['💖', '🍓', '✨', '🌸', '🍡'], count = 14) {
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'particle';
      s.textContent = pick(emojis);
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 110;
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(angle) * dist - 40 + 'px');
      s.style.setProperty('--r', (Math.random() * 120 - 60) + 'deg');
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1300);
    }
  }

  function animateTotal(target) {
    const from = shownTotal, start = performance.now(), dur = 600;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { shownTotal = target; $('total').textContent = money(target); return; }
    const step = (t) => {
      const k = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      shownTotal = from + (target - from) * e;
      $('total').textContent = money(Math.round(shownTotal * 100) / 100);
      if (k < 1) requestAnimationFrame(step); else shownTotal = target;
    };
    requestAnimationFrame(step);
  }

  /* ---------- render ---------- */
  function render() {
    const s = state.settings;
    $('greeting').textContent = s.name ? `Hi, ${s.name} 💕` : 'Hi cutie 💕';
    $('currencyIcon').textContent = s.currency;

    const isMonth = view.mode === 'month';
    $('tabMonth').classList.toggle('active', isMonth);
    $('tabYear').classList.toggle('active', !isMonth);
    $('periodLabel').textContent = isMonth ? `${MONTHS[view.month]} ${view.year}` : String(view.year);

    const isCurrent = view.year === now.getFullYear() && (!isMonth || view.month === now.getMonth());
    const word = isMonth ? 'month' : 'year';
    $('totalLabel').textContent = isCurrent ? `Total spent this ${word}` : `Total spent in ${isMonth ? MONTHS[view.month] + ' ' : ''}${view.year}`;
    $('listTitle').textContent = isCurrent ? `🍽️ Meals this ${word}` : `🍽️ Meals in ${isMonth ? MONTHS[view.month] + ' ' : ''}${view.year}`;

    const meals = state.meals.filter(inView).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const total = sum(meals);
    animateTotal(total);
    $('statCount').textContent = meals.length;
    $('statAvg').textContent = meals.length ? money(total / meals.length) : money(0);
    $('statMax').textContent = meals.length ? money(Math.max(...meals.map((m) => m.price))) : money(0);

    // budget (monthly view only)
    const showBudget = isMonth && s.budget > 0;
    $('budgetBox').classList.toggle('hidden', !showBudget);
    if (showBudget) {
      const pct = (total / s.budget) * 100;
      $('budgetText').textContent = `Budget ${money(s.budget)}`;
      $('budgetPct').textContent = pct > 100 ? `${money(total - s.budget)} over 🥺` : `${money(s.budget - total)} left 🌷`;
      $('budgetFill').style.width = Math.min(100, pct) + '%';
      $('budgetFill').classList.toggle('over', pct > 100);
    }

    // list
    const ul = $('mealList');
    ul.innerHTML = meals.map((m) => {
      const t = TYPES[m.type] || TYPES.snack;
      const p = parts(m.date);
      const title = m.name ? esc(m.name) : t.label;
      return `<li class="meal" data-id="${m.id}">
        <span class="meal-emoji">${t.emoji}</span>
        <div class="meal-info">
          <div class="meal-name">${title}</div>
          <div class="meal-date">${t.label} · ${p.d} ${MONTHS[p.m].slice(0, 3)} ${p.y}</div>
        </div>
        <span class="meal-price">${money(m.price)}</span>
        <div class="meal-actions">
          <button data-act="edit" aria-label="Edit" title="Edit">✏️</button>
          <button data-act="del" aria-label="Delete" title="Delete">🗑️</button>
        </div>
      </li>`;
    }).join('');
    $('emptyMsg').classList.toggle('hidden', meals.length > 0);
  }

  function renderHistory() {
    document.querySelectorAll('[data-hmode]').forEach((b) => b.classList.toggle('active', b.dataset.hmode === historyMode));
    const groups = new Map();
    for (const m of state.meals) {
      const p = parts(m.date);
      const key = historyMode === 'month' ? `${p.y}-${pad(p.m + 1)}` : String(p.y);
      const g = groups.get(key) || { total: 0, count: 0, y: p.y, m: p.m };
      g.total += m.price; g.count++;
      groups.set(key, g);
    }
    const rows = [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    const max = Math.max(0, ...rows.map(([, g]) => g.total));
    $('historyList').innerHTML = rows.map(([key, g]) => {
      const label = historyMode === 'month' ? `${MONTHS[g.m]} ${g.y}` : String(g.y);
      const w = max ? Math.max(4, (g.total / max) * 100) : 0;
      return `<li class="h-item" data-y="${g.y}" data-m="${g.m}">
        <div class="h-top"><span class="h-label">${label}</span><span class="h-total">${money(g.total)}</span></div>
        <div class="h-sub">${g.count} meal${g.count === 1 ? '' : 's'} · avg ${money(g.total / g.count)}</div>
        <div class="h-bar"><div style="width:${w}%"></div></div>
      </li>`;
    }).join('');
    $('historyEmpty').classList.toggle('hidden', rows.length > 0);
  }

  /* ---------- form ---------- */
  function resetForm() {
    editingId = null;
    $('mealForm').reset();
    $('date').value = todayStr();
    $('submitBtn').textContent = 'Save meal 🍓';
    $('cancelEdit').classList.add('hidden');
  }

  $('mealForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const price = parseFloat($('price').value);
    if (!isFinite(price) || price < 0) { toast('Please enter a valid price 🥺'); return; }
    const data = {
      price: Math.round(price * 100) / 100,
      name: $('name').value.trim(),
      type: document.querySelector('input[name=type]:checked').value,
      date: $('date').value || todayStr(),
    };
    if (editingId) {
      const m = state.meals.find((x) => x.id === editingId);
      if (m) Object.assign(m, data);
      toast('Updated 💕');
    } else {
      state.meals.push({ id: Date.now() + Math.floor(Math.random() * 1000), ...data });
      toast(pick(SAVED));
    }
    save();
    // jump to the month of the saved meal so she sees it
    const p = parts(data.date);
    view.year = p.y; view.month = p.m;
    resetForm();
    render();
    const r = $('submitBtn').getBoundingClientRect();
    burst(r.left + r.width / 2, r.top);
    happy();
    say(pick(CUTE));
  });

  $('cancelEdit').addEventListener('click', resetForm);

  $('mealList').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = Number(btn.closest('.meal').dataset.id);
    const m = state.meals.find((x) => x.id === id);
    if (!m) return;
    if (btn.dataset.act === 'del') {
      if (!confirm('Delete this meal? 🥺')) return;
      state.meals = state.meals.filter((x) => x.id !== id);
      save(); render(); toast('Deleted');
    } else {
      editingId = id;
      $('price').value = m.price;
      $('name').value = m.name;
      $('date').value = m.date;
      document.querySelector(`input[name=type][value=${m.type}]`).checked = true;
      $('submitBtn').textContent = 'Update meal 💕';
      $('cancelEdit').classList.remove('hidden');
      $('mealForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('price').focus();
    }
  });

  /* ---------- navigation ---------- */
  document.querySelectorAll('.summary .tab').forEach((b) => b.addEventListener('click', () => { view.mode = b.dataset.mode; render(); }));
  $('prev').addEventListener('click', () => shift(-1));
  $('next').addEventListener('click', () => shift(1));
  function shift(dir) {
    if (view.mode === 'year') view.year += dir;
    else {
      view.month += dir;
      if (view.month < 0) { view.month = 11; view.year--; }
      if (view.month > 11) { view.month = 0; view.year++; }
    }
    render();
  }

  /* ---------- modals ---------- */
  $('openHistory').addEventListener('click', () => { renderHistory(); $('historyModal').showModal(); });
  document.querySelectorAll('[data-hmode]').forEach((b) => b.addEventListener('click', () => { historyMode = b.dataset.hmode; renderHistory(); }));
  $('historyList').addEventListener('click', (e) => {
    const li = e.target.closest('.h-item');
    if (!li) return;
    view.mode = historyMode;
    view.year = Number(li.dataset.y);
    view.month = Number(li.dataset.m);
    $('historyModal').close();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('openSettings').addEventListener('click', () => {
    $('setName').value = state.settings.name;
    $('setCurrency').value = state.settings.currency;
    $('setBudget').value = state.settings.budget || '';
    $('settingsModal').showModal();
  });
  $('saveSettings').addEventListener('click', () => {
    state.settings.name = $('setName').value.trim();
    state.settings.currency = $('setCurrency').value;
    state.settings.budget = Math.max(0, parseFloat($('setBudget').value) || 0);
    save(); render();
    $('settingsModal').close();
    toast('Settings saved 🎀');
  });

  document.querySelectorAll('dialog').forEach((d) => {
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  });

  /* ---------- backup / restore ---------- */
  $('exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nomnom-diary-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      if (!Array.isArray(raw.meals)) throw new Error('bad file');
      const clean = raw.meals
        .filter((m) => m && isFinite(m.price) && /^\d{4}-\d{2}-\d{2}$/.test(m.date))
        .map((m) => ({ id: Number(m.id) || Date.now() + Math.random(), price: Number(m.price), name: String(m.name || '').slice(0, 60), type: TYPES[m.type] ? m.type : 'snack', date: m.date }));
      if (!confirm(`Restore ${clean.length} meals? This replaces what's here now.`)) return;
      state = { meals: clean, settings: Object.assign({ name: '', currency: '₹', budget: 0 }, raw.settings || {}) };
      save(); render(); $('settingsModal').close(); toast('Diary restored 💖');
    } catch { toast('That file didn\'t look right 🥺'); }
    e.target.value = '';
  });
  $('wipeBtn').addEventListener('click', () => {
    if (!confirm('Delete ALL meals? This cannot be undone.')) return;
    state.meals = []; save(); render(); $('settingsModal').close(); toast('All clear ✨');
  });

  /* ---------- mascot ---------- */
  function happy() {
    const svg = $('mascotSvg');
    svg.classList.remove('happy');
    void svg.getBoundingClientRect();
    svg.classList.add('happy');
    setTimeout(() => svg.classList.remove('happy'), 1300);
  }
  $('mascot').addEventListener('click', (e) => {
    happy(); say(pick(CUTE));
    burst(e.clientX, e.clientY, ['💖', '✨', '🎀'], 8);
  });

  // sparkle on any tap (light touch)
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('input, textarea, select, dialog')) return;
    burst(e.clientX, e.clientY, ['✨', '♡'], 3);
  });

  /* ---------- init ---------- */
  $('date').value = todayStr();
  render();
  if (!state.meals.length) say('Welcome! Add your first meal below 🍓');
})();
