/* ═══════════════════════════════════════════
   Azure Pearl Hotel · app.js
   4 services · routing · utilities · modal
═══════════════════════════════════════════ */

const BASE = '../openclaw-hotel-universe-wbwopmtz/openclaw-hotel-universe-wbwopmtz/services/';
const AP_TZ = 'UTC'; // Calendar timestamps verified UTC via reservation check_in_date cross-reference

const SERVICE_MAP = {
  'hotel-management': 'hotelMgmt',
  'calendar':         'calendar',
  'contacts':         'contacts',
  'email':            'email',
};

const DATA = {};
let activeTab = 'overview';
const rendered = new Set();

async function loadAll() {
  setStatus('loading', 'Loading…');
  const statusEl = document.getElementById('load-status');
  let loaded = 0;
  const total = Object.keys(SERVICE_MAP).length;
  try {
    await Promise.all(Object.entries(SERVICE_MAP).map(([svc, key]) =>
      fetch(BASE + svc + '/data.json')
        .then(r => { if (!r.ok) throw new Error(svc); return r.json(); })
        .then(d => { DATA[key] = d; loaded++; if (statusEl) statusEl.textContent = `Loading… (${loaded}/${total})`; })
    ));
    document.getElementById('loading-overlay').style.display = 'none';
    setStatus('live', 'Loaded');
    renderActiveTab();
  } catch (e) {
    setStatus('loading', 'Error: ' + e.message);
    if (statusEl) statusEl.textContent = 'Failed to load: ' + e.message;
  }
}

function setStatus(state, text) {
  const dot = document.getElementById('status-dot');
  const span = document.getElementById('status-text');
  dot.className = 'pulse-dot' + (state === 'loading' ? ' loading' : '');
  span.textContent = text;
}

function renderActiveTab() {
  const tab = activeTab;
  if (rendered.has(tab)) return;
  rendered.add(tab);
  switch (tab) {
    case 'overview':       renderOverview(DATA);       break;
    case 'reservations':   renderReservations(DATA);   break;
    case 'rooms':          renderRooms(DATA);          break;
    case 'guests':         renderGuests(DATA);         break;
    case 'communications': renderCommunications(DATA); break;
    case 'calendar':       renderCalendar(DATA);       break;
  }
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + btn.dataset.tab).classList.add('active');
    activeTab = btn.dataset.tab;
    renderActiveTab();
  });
});

document.querySelectorAll('.sub-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const parent = btn.closest('section');
    parent.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    parent.querySelectorAll('.sub-page').forEach(p => p.classList.remove('active'));
    const target = parent.querySelector('#' + btn.dataset.subtab);
    if (target) target.classList.add('active');
  });
});

function openModal(badge, title, bodyHTML) {
  document.getElementById('modal-badge').textContent = badge;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML    = bodyHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }
function handleModalClick(e) { if (e.target.id === 'modal-overlay') closeModal(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── UTILITIES ─────────────────────────────
function escHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtCurrency(n) {
  if (n == null) return '—';
  const abs = Math.abs(n);
  return (n < 0 ? '-$' : '$') + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtTs(ts) {
  if (!ts) return '—';
  const n = typeof ts === 'string' ? parseFloat(ts) : ts;
  if (!isFinite(n)) return escHtml(String(ts));
  const ms = n > 1e12 ? n : n * 1000;
  return new Date(ms).toLocaleDateString('en-US', { timeZone: AP_TZ, month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTsTime(ts) {
  if (!ts) return '—';
  const ms = (ts > 1e12 ? ts : ts * 1000);
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', { timeZone: AP_TZ, month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { timeZone: AP_TZ, hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtDate(s) {
  if (!s) return '—';
  try {
    return new Date(String(s) + 'T00:00:00Z').toLocaleDateString('en-US', { timeZone: AP_TZ, month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return escHtml(String(s)); }
}
function nightsBetween(a, b) {
  if (!a || !b) return null;
  return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
}
function paginate(items, page, size) { return items.slice((page-1)*size, page*size); }
function renderPagination(containerId, total, page, size, onPageFn) {
  const totalPages = Math.ceil(total / size);
  const el = document.getElementById(containerId);
  if (!el || totalPages <= 1) { if (el) el.innerHTML = ''; return; }
  let html = `<button class="page-btn" ${page===1?'disabled':''} onclick="(${onPageFn})(${page-1})">‹</button>`;
  const range = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i===1||i===totalPages||Math.abs(i-page)<=2) range.push(i);
    else if (range[range.length-1] !== '…') range.push('…');
  }
  range.forEach(r => {
    if (r === '…') html += `<span class="page-btn" style="cursor:default">…</span>`;
    else html += `<button class="page-btn ${r===page?'active':''}" onclick="(${onPageFn})(${r})">${r}</button>`;
  });
  html += `<button class="page-btn" ${page===totalPages?'disabled':''} onclick="(${onPageFn})(${page+1})">›</button>`;
  el.innerHTML = html;
}

// Shared status helpers
function resBadgeClass(status) {
  return { 'Checked-In':'badge-in','Confirmed':'badge-conf','Checked-Out':'badge-out','No-Show':'badge-noshow','Cancelled':'badge-cancel' }[status] || '';
}

loadAll();
