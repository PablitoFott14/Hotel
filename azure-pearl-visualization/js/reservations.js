/* ═══════════════════════════════════════════
   reservations.js — All 68 reservations
   with linked guest info and reservation emails
═══════════════════════════════════════════ */

let _resAll    = [];
let _resPage   = 1;
let _resSearch = '';
let _resStatus = '';
let _resSrc    = '';
const _resStore = [];
const RES_PAGE  = 40;

let _resEmailsByCode = {};

function renderReservations(DATA) {
  const hm = DATA.hotelMgmt || {};
  const resv     = hm.reservations || [];
  const guests   = hm.guests       || [];
  const hmEmails = hm.emails       || [];

  const guestMap = Object.fromEntries(guests.map(g => [g.guest_id, g]));

  // Build reservation emails map
  _resEmailsByCode = {};
  hmEmails.forEach(e => {
    if (!_resEmailsByCode[e.confirmation_code]) _resEmailsByCode[e.confirmation_code] = [];
    _resEmailsByCode[e.confirmation_code].push(e);
  });

  _resAll = [...resv]
    .sort((a, b) => a.check_in_date.localeCompare(b.check_in_date))
    .map((r, i) => ({ ...r, _guest: guestMap[r.guest_id] || null, _idx: i }));

  _resStore.length = 0;
  _resAll.forEach(r => _resStore.push(r));

  const sources  = [...new Set(resv.map(r => r.booking_source).filter(Boolean))].sort();
  const statuses = [...new Set(resv.map(r => r.status).filter(Boolean))].sort();

  document.getElementById('reservations-content').innerHTML = `
    <div class="explorer-bar">
      <input id="res-search" class="ex-search" type="text" placeholder="Guest name, confirmation, room…" />
      <select id="res-status" class="ex-filter">
        <option value="">All Statuses</option>
        ${statuses.map(s => `<option value="${escHtml(s)}">${escHtml(s)}</option>`).join('')}
      </select>
      <select id="res-src" class="ex-filter">
        <option value="">All Sources</option>
        ${sources.map(s => `<option value="${escHtml(s)}">${escHtml(s)}</option>`).join('')}
      </select>
      <span class="ex-count" id="res-count"></span>
    </div>
    <div id="res-table"></div>
    <div class="pagination" id="res-pag"></div>`;

  document.getElementById('res-search').addEventListener('input', e => { _resSearch = e.target.value.toLowerCase(); _resPage = 1; _drawRes(); });
  document.getElementById('res-status').addEventListener('change', e => { _resStatus = e.target.value; _resPage = 1; _drawRes(); });
  document.getElementById('res-src').addEventListener('change', e => { _resSrc = e.target.value; _resPage = 1; _drawRes(); });
  _drawRes();
}

function _drawRes() {
  const filtered = _resAll.filter(r => {
    if (_resStatus && r.status !== _resStatus) return false;
    if (_resSrc    && r.booking_source !== _resSrc) return false;
    if (!_resSearch) return true;
    return (r.guest_name || '').toLowerCase().includes(_resSearch)
      || (r.confirmation_code || '').toLowerCase().includes(_resSearch)
      || (r.room_number || '').toLowerCase().includes(_resSearch)
      || (r.room_type || '').toLowerCase().includes(_resSearch)
      || (r._guest?.email || '').toLowerCase().includes(_resSearch);
  });

  const countEl = document.getElementById('res-count');
  if (countEl) countEl.textContent = `${filtered.length} reservation${filtered.length !== 1 ? 's' : ''}`;

  const page = paginate(filtered, _resPage, RES_PAGE);
  let html = `<div class="table-wrap"><table>
    <thead><tr>
      <th>Confirmation</th><th>Guest</th><th>Room</th><th>Type</th>
      <th>Check-In</th><th>Check-Out</th><th>Nights</th>
      <th>Source</th><th>Status</th><th style="text-align:right">Total</th>
    </tr></thead><tbody>`;

  page.forEach(r => {
    const nights = nightsBetween(r.check_in_date, r.check_out_date);
    html += `<tr class="clickable" onclick="showResModal(${r._idx})">
      <td class="mono" style="color:var(--azure)">${escHtml(r.confirmation_code)}</td>
      <td>
        <div style="font-weight:500;color:var(--text)">${escHtml(r.guest_name)}</div>
        ${r._guest ? `<div style="font-size:10px;color:var(--text3)">${escHtml(r._guest.email)}</div>` : ''}
      </td>
      <td class="mono" style="color:var(--sky)">${r.room_number || '—'}</td>
      <td class="dim" style="font-size:11px">${escHtml(r.room_type)}</td>
      <td class="mono dim">${fmtDate(r.check_in_date)}</td>
      <td class="mono dim">${fmtDate(r.check_out_date)}</td>
      <td class="dim">${nights !== null ? nights : '—'}</td>
      <td class="dim" style="font-size:11px">${escHtml(r.booking_source)}</td>
      <td><span class="badge ${resBadgeClass(r.status)}">${escHtml(r.status)}</span></td>
      <td style="text-align:right;color:var(--emerald);font-weight:600">${fmtCurrency(r.total_amount)}</td>
    </tr>`;
  });

  if (!filtered.length) html += `<tr><td colspan="10"><div class="empty-state">No reservations match.</div></td></tr>`;
  html += '</tbody></table></div>';
  document.getElementById('res-table').innerHTML = html;
  renderPagination('res-pag', filtered.length, _resPage, RES_PAGE, `function(p){_resPage=p;_drawRes();}`);
}

function showResModal(idx) {
  const r = _resStore[idx];
  if (!r) return;
  const g = r._guest;
  const nights = nightsBetween(r.check_in_date, r.check_out_date);
  const linkedEmails = _resEmailsByCode[r.confirmation_code] || [];

  let body = `<div class="mf-grid">
    <div class="mf-item"><label>Confirmation</label><span class="val mono" style="color:var(--azure)">${escHtml(r.confirmation_code)}</span></div>
    <div class="mf-item"><label>Status</label><span class="val"><span class="badge ${resBadgeClass(r.status)}">${escHtml(r.status)}</span></span></div>
    <div class="mf-item"><label>Guest</label><span class="val">${escHtml(r.guest_name)}</span></div>
    <div class="mf-item"><label>Guest ID</label><span class="val mono">${escHtml(r.guest_id)}</span></div>
    <div class="mf-item"><label>Room</label><span class="val mono" style="color:var(--sky)">${r.room_number || '—'}</span></div>
    <div class="mf-item"><label>Room Type</label><span class="val">${escHtml(r.room_type)}</span></div>
    <div class="mf-item"><label>Check-In</label><span class="val">${fmtDate(r.check_in_date)}</span></div>
    <div class="mf-item"><label>Check-Out</label><span class="val">${fmtDate(r.check_out_date)}${nights !== null ? ` (${nights} night${nights!==1?'s':''})` : ''}</span></div>
    <div class="mf-item"><label>Rate / Night</label><span class="val" style="color:var(--emerald)">${fmtCurrency(r.rate_per_night)}</span></div>
    <div class="mf-item"><label>Total Amount</label><span class="val" style="color:var(--emerald);font-weight:600">${fmtCurrency(r.total_amount)}</span></div>
    <div class="mf-item"><label>Booking Source</label><span class="val">${escHtml(r.booking_source)}</span></div>
    ${r.special_requests ? `<div class="mf-item mf-full"><label>Special Requests</label><span class="val">${escHtml(r.special_requests)}</span></div>` : ''}
  </div>`;

  if (g) {
    body += `<div class="mf-sep"></div>
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:var(--text3);margin-bottom:10px">Guest Profile</div>
    <div class="mf-grid">
      <div class="mf-item"><label>Email</label><span class="val">${escHtml(g.email)}</span></div>
      <div class="mf-item"><label>Phone</label><span class="val">${escHtml(g.phone||'—')}</span></div>
      <div class="mf-item"><label>Total Stays</label><span class="val">${g.total_stays ?? '—'}</span></div>
      <div class="mf-item"><label>Loyalty Tier</label><span class="val">${g.loyalty_tier || 'None'}</span></div>
    </div>`;
  }

  if (linkedEmails.length) {
    body += `<div class="mf-sep"></div>
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:var(--text3);margin-bottom:10px">Correspondence (${linkedEmails.length})</div>`;
    linkedEmails.forEach((e, i) => {
      const eid = 'rem-' + r.confirmation_code + '-' + i;
      body += `<div class="email-item" style="margin-bottom:6px">
        <div class="email-header" onclick="apToggleEmail('${eid}')">
          <span class="email-read-dot"></span>
          <span class="email-from">${escHtml(e.from_name || e.from_email)}</span>
          <span class="email-subject">${escHtml(e.subject)}</span>
          <span class="email-meta">${escHtml(e.date)} ${escHtml(e.time||'')}</span>
        </div>
        <div class="email-body" id="${eid}">${escHtml(e.body||'')}</div>
      </div>`;
    });
  }

  openModal('Reservation', `${r.guest_name} · ${r.confirmation_code}`, body);
}
