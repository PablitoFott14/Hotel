/* Communications: email inbox and reservation mail */

let _emAll = [];
let _emFolder = 'INBOX';
let _emSearch = '';

let _rmAll = [];
let _rmSearch = '';
let _rmPage = 1;
const RM_PAGE = 30;

function renderCommunications(DATA) {
  const emails = (DATA.email || {}).emails || [];
  const hm = DATA.hotelMgmt || {};
  const hmEmails = hm.emails || [];

  _emAll = [...emails].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  document.getElementById('comm-inbox').innerHTML = `
    <div class="explorer-bar">
      <input id="em-search" class="ex-search" type="text" placeholder="Subject, sender, content..." />
      <span class="ex-count" id="em-count"></span>
    </div>
    <div id="em-list"></div>`;

  document.getElementById('em-search').addEventListener('input', e => {
    _emSearch = e.target.value.toLowerCase();
    _drawEmails();
  });
  _drawEmails();

  _rmAll = [...hmEmails].sort((a, b) => {
    const da = a.date + ' ' + (a.time || '');
    const db = b.date + ' ' + (b.time || '');
    return db.localeCompare(da);
  });

  document.getElementById('comm-resmail').innerHTML = `
    <div class="explorer-bar">
      <input id="rm-search" class="ex-search" type="text" placeholder="Subject, guest name, confirmation..." />
      <span class="ex-count" id="rm-count"></span>
    </div>
    <div id="rm-list"></div>
    <div class="pagination" id="rm-pag"></div>`;

  document.getElementById('rm-search').addEventListener('input', e => {
    _rmSearch = e.target.value.toLowerCase();
    _rmPage = 1;
    _drawResMail();
  });
  _drawResMail();
}

function _drawEmails() {
  const filtered = _emAll.filter(e => {
    if (!_emSearch) return true;
    return (e.subject || '').toLowerCase().includes(_emSearch)
      || (e.sender || '').toLowerCase().includes(_emSearch)
      || (e.content || '').toLowerCase().includes(_emSearch)
      || (e.recipients || []).some(r => r.toLowerCase().includes(_emSearch));
  });

  const countEl = document.getElementById('em-count');
  if (countEl) countEl.textContent = `${filtered.length} email${filtered.length !== 1 ? 's' : ''}`;

  if (!filtered.length) {
    document.getElementById('em-list').innerHTML = '<div class="empty-state">No emails match.</div>';
    return;
  }

  let html = '';
  filtered.forEach((e, i) => {
    const eid = `em-row-${i}`;
    const from = e.folder === 'SENT' ? (e.recipients || []).join(', ') : e.sender;
    const cc = (e.cc || []).length ? ` | CC: ${escHtml(e.cc.join(', '))}` : '';
    html += `<div class="email-item">
      <button type="button" class="email-header" onclick="apToggleEmail('${eid}')" aria-expanded="false" aria-controls="${eid}">
        <span class="${e.is_read ? 'email-read-dot' : 'email-unread-dot'}"></span>
        <span class="email-from">${escHtml(from)}</span>
        <span class="email-subject">${escHtml(e.subject || '(no subject)')}</span>
        <span class="email-meta">${fmtTs(e.timestamp)}</span>
      </button>
      <div class="email-body" id="${eid}">
        <div class="email-body-meta">${e.folder === 'SENT' ? 'To:' : 'From:'} ${escHtml(from)}${cc}</div>
        <div class="email-content">${escHtml(e.content || '')}</div>
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

  page.forEach((e, i) => {
    const eid = `rm-row-${(_rmPage - 1) * RM_PAGE + i}`;
    const sentAt = `${escHtml(e.date || '')}${e.time ? ' ' + escHtml(e.time) : ''}`;
    html += `<div class="email-item">
      <button type="button" class="email-header" onclick="apToggleEmail('${eid}')" aria-expanded="false" aria-controls="${eid}">
        <span class="email-read-dot"></span>
        <div class="email-res-main">
          <span class="email-from">${escHtml(e.from_name || e.from_email)}</span>
          ${e.confirmation_code ? `<span class="badge badge-azure" style="flex-shrink:0;font-size:9px">${escHtml(e.confirmation_code)}</span>` : ''}
          <span class="email-subject">${escHtml(e.subject || '(no subject)')}</span>
        </div>
        <span class="email-meta">${escHtml(e.date || '')}</span>
      </button>
      <div class="email-body" id="${eid}">
        <div class="email-body-meta">From: ${escHtml(e.from_email)} | ${sentAt}</div>
        <div class="email-content">${escHtml(e.body || '')}</div>
      </div>
    </div>`;
  });

  if (!filtered.length) html = '<div class="empty-state">No reservation emails match.</div>';
  document.getElementById('rm-list').innerHTML = html;
  renderPagination('rm-pag', filtered.length, _rmPage, RM_PAGE, `function(p){_rmPage=p;_drawResMail();}`);
}

function apToggleEmail(id) {
  const el = document.getElementById(id)
    || document.getElementById('em-' + id)
    || document.getElementById('rm-' + id);
  if (!el) return;
  const isOpen = el.classList.toggle('open');
  const trigger = document.querySelector(`[aria-controls="${id}"]`);
  if (trigger) trigger.setAttribute('aria-expanded', String(isOpen));
}
