/* ═══════════════════════════════════════════
   communications.js — Email inbox (email service)
   + Reservation mail (hotel-management emails)
═══════════════════════════════════════════ */

// ── EMAIL INBOX ──────────────────────────────
let _emAll    = [];
let _emFolder = 'INBOX';
let _emSearch = '';

// ── RESERVATION MAIL ─────────────────────────
let _rmAll    = [];
let _rmSearch = '';
let _rmPage   = 1;
const RM_PAGE = 30;

function renderCommunications(DATA) {
  const emails   = (DATA.email || {}).emails || [];
  const hm       = DATA.hotelMgmt || {};
  const hmEmails = hm.emails       || [];

  // Email inbox setup
  _emAll = [...emails].sort((a, b) => (b.timestamp||0) - (a.timestamp||0));
  const folders = [...new Set(_emAll.map(e => e.folder).filter(Boolean))].sort();
  const unread  = _emAll.filter(e => !e.is_read && e.folder === 'INBOX').length;

  document.getElementById('comm-inbox').innerHTML = `
    <div class="explorer-bar">
      <input id="em-search" class="ex-search" type="text" placeholder="Subject, sender, content…" />
      <select id="em-folder" class="ex-filter">
        ${folders.map(f => `<option value="${escHtml(f)}"${f==='INBOX'?' selected':''}>${escHtml(f)}${f==='INBOX'&&unread>0?' ('+unread+' unread)':''}</option>`).join('')}
      </select>
      <span class="ex-count" id="em-count"></span>
    </div>
    <div id="em-list"></div>`;

  document.getElementById('em-search').addEventListener('input', e => { _emSearch = e.target.value.toLowerCase(); _drawEmails(); });
  document.getElementById('em-folder').addEventListener('change', e => { _emFolder = e.target.value; _drawEmails(); });
  _drawEmails();

  // Reservation mail setup
  _rmAll = [...hmEmails].sort((a, b) => {
    const da = a.date + ' ' + (a.time||'');
    const db = b.date + ' ' + (b.time||'');
    return db.localeCompare(da);
  });

  document.getElementById('comm-resmail').innerHTML = `
    <div class="explorer-bar">
      <input id="rm-search" class="ex-search" type="text" placeholder="Subject, guest name, confirmation…" />
      <span class="ex-count" id="rm-count"></span>
    </div>
    <div id="rm-list"></div>
    <div class="pagination" id="rm-pag"></div>`;

  document.getElementById('rm-search').addEventListener('input', e => { _rmSearch = e.target.value.toLowerCase(); _rmPage = 1; _drawResMail(); });
  _drawResMail();
}

function _drawEmails() {
  const filtered = _emAll.filter(e => {
    if (_emFolder && e.folder !== _emFolder) return false;
    if (!_emSearch) return true;
    return (e.subject || '').toLowerCase().includes(_emSearch)
      || (e.sender   || '').toLowerCase().includes(_emSearch)
      || (e.content  || '').toLowerCase().includes(_emSearch)
      || (e.recipients || []).some(r => r.toLowerCase().includes(_emSearch));
  });

  const countEl = document.getElementById('em-count');
  if (countEl) countEl.textContent = `${filtered.length} email${filtered.length !== 1 ? 's' : ''}`;

  if (!filtered.length) { document.getElementById('em-list').innerHTML = '<div class="empty-state">No emails match.</div>'; return; }

  let html = '';
  filtered.forEach(e => {
    const eid = 'em-' + escHtml(e.email_id);
    const from = e.folder === 'SENT' ? (e.recipients||[]).join(', ') : e.sender;
    html += `<div class="email-item">
      <div class="email-header" onclick="apToggleEmail('${escHtml(e.email_id)}')">
        <span class="${e.is_read ? 'email-read-dot' : 'email-unread-dot'}"></span>
        <span class="email-from">${escHtml(from)}</span>
        <span class="email-subject">${escHtml(e.subject || '(no subject)')}</span>
        <span class="email-meta">${fmtTs(e.timestamp)}</span>
      </div>
      <div class="email-body" id="${eid}">
        <div style="font-size:10px;color:var(--text3);margin-bottom:8px">
          ${e.folder==='SENT'?'To: ':'From: '}${escHtml(from)}
          ${(e.cc||[]).length ? ' · CC: '+escHtml(e.cc.join(', ')) : ''}
        </div>
        ${escHtml(e.content || '')}
      </div>
    </div>`;
  });

  document.getElementById('em-list').innerHTML = html;
}

function _drawResMail() {
  const filtered = _rmAll.filter(e => {
    if (!_rmSearch) return true;
    return (e.subject || '').toLowerCase().includes(_rmSearch)
      || (e.from_name || '').toLowerCase().includes(_rmSearch)
      || (e.from_email || '').toLowerCase().includes(_rmSearch)
      || (e.confirmation_code || '').toLowerCase().includes(_rmSearch)
      || (e.body || '').toLowerCase().includes(_rmSearch);
  });

  const countEl = document.getElementById('rm-count');
  if (countEl) countEl.textContent = `${filtered.length} email${filtered.length !== 1 ? 's' : ''}`;

  const page = paginate(filtered, _rmPage, RM_PAGE);
  let html = '';

  page.forEach(e => {
    const eid = 'rm-' + escHtml(e.email_id);
    html += `<div class="email-item">
      <div class="email-header" onclick="apToggleEmail('${escHtml(e.email_id)}')">
        <span class="email-read-dot"></span>
        <span class="email-from">${escHtml(e.from_name || e.from_email)}</span>
        <span class="email-subject">${escHtml(e.subject || '(no subject)')}</span>
        <span class="email-meta">
          ${escHtml(e.date || '')} ·
          <span class="mono" style="color:var(--azure)">${escHtml(e.confirmation_code||'')}</span>
        </span>
      </div>
      <div class="email-body" id="${eid}">
        <div style="font-size:10px;color:var(--text3);margin-bottom:8px">
          From: ${escHtml(e.from_email)} · ${escHtml(e.date)} ${escHtml(e.time||'')}
          ${e.confirmation_code ? ` · Confirmation: <span style="color:var(--azure)">${escHtml(e.confirmation_code)}</span>` : ''}
        </div>
        ${escHtml(e.body || '')}
      </div>
    </div>`;
  });

  if (!filtered.length) html = '<div class="empty-state">No reservation emails match.</div>';
  document.getElementById('rm-list').innerHTML = html;
  renderPagination('rm-pag', filtered.length, _rmPage, RM_PAGE, `function(p){_rmPage=p;_drawResMail();}`);
}

function apToggleEmail(id) {
  const el = document.getElementById('em-' + id) || document.getElementById('rm-' + id);
  if (el) el.classList.toggle('open');
}
