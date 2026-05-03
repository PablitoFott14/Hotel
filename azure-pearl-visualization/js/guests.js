/* ═══════════════════════════════════════════
   guests.js — 50 guests with stay history
   and contact enrichment
═══════════════════════════════════════════ */

let _guestAll    = [];
let _guestPage   = 1;
let _guestSearch = '';
const _guestStore = [];
const GUEST_PAGE  = 40;

let _guestResByGuest = {};

function renderGuests(DATA) {
  const hm      = DATA.hotelMgmt || {};
  const guests  = hm.guests        || [];
  const resv    = hm.reservations  || [];
  const contacts = (DATA.contacts  || {}).contacts || [];

  const contactByEmail = {};
  contacts.forEach(c => { if (c.email) contactByEmail[c.email.toLowerCase()] = c; });

  _guestResByGuest = {};
  resv.forEach(r => {
    if (!_guestResByGuest[r.guest_id]) _guestResByGuest[r.guest_id] = [];
    _guestResByGuest[r.guest_id].push(r);
  });

  _guestAll = [...guests]
    .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`))
    .map((g, i) => ({
      ...g,
      _contact: contactByEmail[g.email?.toLowerCase()] || null,
      _resv: _guestResByGuest[g.guest_id] || [],
      _idx: i,
    }));

  _guestStore.length = 0;
  _guestAll.forEach(g => _guestStore.push(g));

  document.getElementById('guests-content').innerHTML = `
    <div class="explorer-bar">
      <input id="guest-search" class="ex-search" type="text" placeholder="Name, email, guest ID…" />
      <span class="ex-count" id="guest-count"></span>
    </div>
    <div id="guest-table"></div>
    <div class="pagination" id="guest-pag"></div>`;

  document.getElementById('guest-search').addEventListener('input', e => { _guestSearch = e.target.value.toLowerCase(); _guestPage = 1; _drawGuests(); });
  _drawGuests();
}

function _drawGuests() {
  const filtered = _guestAll.filter(g => {
    if (!_guestSearch) return true;
    return `${g.first_name} ${g.last_name}`.toLowerCase().includes(_guestSearch)
      || (g.email || '').toLowerCase().includes(_guestSearch)
      || (g.guest_id || '').toLowerCase().includes(_guestSearch)
      || (g.phone || '').includes(_guestSearch);
  });

  const countEl = document.getElementById('guest-count');
  if (countEl) countEl.textContent = `${filtered.length} guest${filtered.length !== 1 ? 's' : ''}`;

  const page = paginate(filtered, _guestPage, GUEST_PAGE);
  let html = `<div class="table-wrap"><table>
    <thead><tr>
      <th>Guest ID</th><th>Name</th><th>Email</th><th>Phone</th>
      <th>Stays</th><th>Current Status</th><th>Loyalty</th>
    </tr></thead><tbody>`;

  page.forEach(g => {
    const activeRes  = g._resv.find(r => r.status === 'Checked-In');
    const confRes    = g._resv.find(r => r.status === 'Confirmed');
    const statusBadge = activeRes
      ? `<span class="badge badge-in">Checked-In · Room ${activeRes.room_number}</span>`
      : confRes
      ? `<span class="badge badge-conf">Arriving · ${fmtDate(confRes.check_in_date)}</span>`
      : `<span style="color:var(--text4);font-size:11px">—</span>`;

    html += `<tr class="clickable" onclick="showGuestModal(${g._idx})">
      <td class="mono dim">${escHtml(g.guest_id)}</td>
      <td style="font-weight:500;color:var(--text)">${escHtml(g.first_name)} ${escHtml(g.last_name)}</td>
      <td class="dim">${escHtml(g.email || '—')}</td>
      <td class="dim">${escHtml(g.phone || '—')}</td>
      <td style="text-align:center;color:var(--text)">${g.total_stays ?? '—'}</td>
      <td>${statusBadge}</td>
      <td><span style="color:var(--text3);font-size:11px">${g.loyalty_tier || 'None'}</span></td>
    </tr>`;
  });

  if (!filtered.length) html += `<tr><td colspan="7"><div class="empty-state">No guests match.</div></td></tr>`;
  html += '</tbody></table></div>';
  document.getElementById('guest-table').innerHTML = html;
  renderPagination('guest-pag', filtered.length, _guestPage, GUEST_PAGE, `function(p){_guestPage=p;_drawGuests();}`);
}

function showGuestModal(idx) {
  const g = _guestStore[idx];
  if (!g) return;
  const c = g._contact;
  const resv = g._resv.sort((a, b) => a.check_in_date.localeCompare(b.check_in_date));
  const totalSpent = resv.filter(r => r.status !== 'Cancelled').reduce((s,r) => s+(r.total_amount||0), 0);

  let body = `<div class="mf-grid">
    <div class="mf-item"><label>Guest ID</label><span class="val mono">${escHtml(g.guest_id)}</span></div>
    <div class="mf-item"><label>Loyalty Tier</label><span class="val">${g.loyalty_tier || 'None'}</span></div>
    <div class="mf-item"><label>Email</label><span class="val">${escHtml(g.email || '—')}</span></div>
    <div class="mf-item"><label>Phone</label><span class="val">${escHtml(g.phone || '—')}</span></div>
    <div class="mf-item"><label>Total Stays</label><span class="val">${g.total_stays ?? '—'}</span></div>
    <div class="mf-item"><label>Total Spent</label><span class="val" style="color:var(--emerald)">${fmtCurrency(totalSpent)}</span></div>
  </div>`;

  if (c && (c.age || c.nationality || c.job || c.description)) {
    body += `<div class="mf-sep"></div>
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:var(--text3);margin-bottom:10px">Contact Profile</div>
    <div class="mf-grid">
      ${c.age ? `<div class="mf-item"><label>Age</label><span class="val">${c.age}</span></div>` : ''}
      ${c.gender && c.gender !== 'Unknown' ? `<div class="mf-item"><label>Gender</label><span class="val">${escHtml(c.gender)}</span></div>` : ''}
      ${c.nationality ? `<div class="mf-item"><label>Nationality</label><span class="val">${escHtml(c.nationality)}</span></div>` : ''}
      ${c.job ? `<div class="mf-item"><label>Occupation</label><span class="val">${escHtml(c.job)}</span></div>` : ''}
      ${c.city_living ? `<div class="mf-item"><label>City</label><span class="val">${escHtml(c.city_living)}</span></div>` : ''}
      ${c.status && c.status !== 'Unknown' ? `<div class="mf-item"><label>Status</label><span class="val">${escHtml(c.status)}</span></div>` : ''}
      ${c.description ? `<div class="mf-item mf-full"><label>Description</label><span class="val">${escHtml(c.description)}</span></div>` : ''}
    </div>`;
  }

  body += `<div class="mf-sep"></div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:var(--text3)">
      Reservations (${resv.length})
    </div>
    <div style="font-size:12px;color:var(--emerald);font-weight:600">${fmtCurrency(totalSpent)} total</div>
  </div>`;

  if (resv.length) {
    body += `<div style="border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden">`;
    resv.forEach((r, i) => {
      const nights = nightsBetween(r.check_in_date, r.check_out_date);
      body += `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border-bottom:${i<resv.length-1?'1px solid var(--border)':'none'}">
        <div>
          <span class="mono" style="color:var(--azure);font-size:12px">${escHtml(r.confirmation_code)}</span>
          <span style="font-size:11px;color:var(--text3);margin-left:8px">${fmtDate(r.check_in_date)} → ${fmtDate(r.check_out_date)}</span>
          ${r.room_number ? `<span style="font-size:11px;color:var(--sky);margin-left:8px">Room ${escHtml(r.room_number)}</span>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="badge ${resBadgeClass(r.status)}">${escHtml(r.status)}</span>
          <span style="color:var(--emerald);font-weight:600;font-size:13px">${fmtCurrency(r.total_amount)}</span>
        </div>
      </div>`;
    });
    body += `</div>`;
  } else {
    body += `<div style="color:var(--text3);font-size:12px">No reservations on file.</div>`;
  }

  openModal('Guest', `${g.first_name} ${g.last_name}`, body);
}
