/* ═══════════════════════════════════════════
   overview.js — KPIs, interactive occupancy
   chart, clickable status / source breakdown,
   expandable recent inbox
═══════════════════════════════════════════ */

let _occData    = [];
let _occSelDate = null;

function renderOverview(DATA) {
  const hm      = DATA.hotelMgmt || {};
  const resv     = hm.reservations     || [];
  const occHist  = hm.occupancy_history || [];
  const emails   = (DATA.email || {}).emails || [];
  const rooms    = hm.rooms || [];

  // Use latest occupancy_history entry for ADR/RevPAR (authoritative source)
  _occData = [...occHist];
  const latestOcc = occHist.length ? occHist[occHist.length - 1] : null;

  const checkedIn  = resv.filter(r => r.status === 'Checked-In').length;
  const confirmed  = resv.filter(r => r.status === 'Confirmed').length;
  const checkedOut = resv.filter(r => r.status === 'Checked-Out').length;
  const noShow     = resv.filter(r => r.status === 'No-Show').length;
  const cancelled  = resv.filter(r => r.status === 'Cancelled').length;
  const occPct     = rooms.length ? Math.round(checkedIn / rooms.length * 100) : 0;
  const adr        = latestOcc ? latestOcc.adr    : 0;
  const revpar     = latestOcc ? latestOcc.revpar  : 0;
  const totalRevenue = resv.filter(r => r.status !== 'Cancelled').reduce((s, r) => s + (r.total_amount || 0), 0);
  const unreadEmail  = emails.filter(e => !e.is_read).length;

  const bySrc = {};
  resv.forEach(r => { bySrc[r.booking_source] = (bySrc[r.booking_source] || 0) + 1; });

  const recentEmail = [...emails].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 5);

  let html = '';

  // ── KPI row ────────────────────────────────
  html += `<div class="kpi-row">
    <div class="kpi-tile">
      <div class="kpi-label">Occupancy</div>
      <div class="kpi-value" style="color:var(--azure)">${occPct}%</div>
      <div class="kpi-sub">${checkedIn} of ${rooms.length} rooms</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">Checked In</div>
      <div class="kpi-value" style="color:var(--sky)">${checkedIn}</div>
      <div class="kpi-sub">active stays</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">Confirmed</div>
      <div class="kpi-value" style="color:var(--violet)">${confirmed}</div>
      <div class="kpi-sub">upcoming arrivals</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">ADR</div>
      <div class="kpi-value" style="color:var(--emerald)">${fmtCurrency(adr)}</div>
      <div class="kpi-sub">avg daily rate</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">RevPAR</div>
      <div class="kpi-value" style="color:var(--teal)">${fmtCurrency(revpar)}</div>
      <div class="kpi-sub">rev per available room</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">Total Revenue</div>
      <div class="kpi-value" style="color:var(--indigo)">${fmtCurrency(totalRevenue)}</div>
      <div class="kpi-sub">all non-cancelled</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">Unread Emails</div>
      <div class="kpi-value" style="color:${unreadEmail > 0 ? 'var(--amber)' : 'var(--emerald)'}">${unreadEmail}</div>
      <div class="kpi-sub">inbox</div>
    </div>
  </div>`;

  // ── Occupancy history (interactive) + Status breakdown ──
  html += `<div class="grid-2" style="margin-bottom:18px">

    <div class="card">
      <h4>Occupancy History · ${occHist.length} days
        <span style="float:right;font-size:10px;color:var(--text3);font-weight:400;text-transform:none">Click a bar to inspect</span>
      </h4>
      <div class="occ-chart" id="occ-bars">`;

  const maxOcc = 100;
  occHist.forEach(d => {
    const h   = Math.max(4, Math.round((d.occupancy_percent / maxOcc) * 60));
    const col = d.occupancy_percent >= 90 ? 'var(--emerald)' : d.occupancy_percent >= 70 ? 'var(--azure)' : 'var(--amber)';
    html += `<div class="occ-bar" data-occ-date="${d.date}" style="height:${h}px;background:${col};cursor:pointer"
      onclick="_apOccSelect('${d.date}')"></div>`;
  });

  html += `</div>
      <div class="occ-labels">`;
  occHist.forEach(d => { html += `<div class="occ-label">${d.date.slice(5)}</div>`; });
  html += `</div>
      <div id="occ-detail" style="margin-top:12px;min-height:48px">
        <div style="font-size:11px;color:var(--text4);text-align:center;padding:12px 0">
          Select a day to see details
        </div>
      </div>
    </div>

    <div class="card">
      <h4>Reservation Status <span style="float:right;font-size:10px;color:var(--text3);font-weight:400;text-transform:none">Click to filter</span></h4>
      <div class="status-bars" style="margin-bottom:14px">`;

  const statuses = [
    ['Checked-In',  checkedIn,  'var(--azure)'],
    ['Confirmed',   confirmed,  'var(--violet)'],
    ['Checked-Out', checkedOut, 'var(--emerald)'],
    ['No-Show',     noShow,     'var(--rose)'],
    ['Cancelled',   cancelled,  'var(--amber)'],
  ];
  statuses.forEach(([label, count, col]) => {
    const pct = resv.length ? count / resv.length * 100 : 0;
    html += `<div class="status-bar-row" onclick="navigateToReservations('${label}', '')"
      style="cursor:pointer;padding:4px 6px;border-radius:6px;margin:0 -6px;transition:background 0.12s"
      onmouseenter="this.style.background='var(--surface2)'" onmouseleave="this.style.background=''">
      <span class="status-bar-label">${label}</span>
      <div class="status-bar-track"><div class="status-bar-fill" style="width:${pct.toFixed(1)}%;background:${col}"></div></div>
      <span class="status-bar-val" style="color:${col}">${count}</span>
    </div>`;
  });

  html += `</div>
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:var(--text3);margin-bottom:8px">
        Booking Sources <span style="font-weight:400;text-transform:none;letter-spacing:0">· click to filter</span>
      </div>`;

  Object.entries(bySrc).sort((a, b) => b[1] - a[1]).forEach(([src, cnt]) => {
    html += `<div style="display:flex;justify-content:space-between;padding:5px 6px;border-bottom:1px solid var(--border);
      font-size:12px;cursor:pointer;border-radius:4px;margin:0 -6px;transition:background 0.12s"
      onclick="navigateToReservations('', '${escHtml(src)}')"
      onmouseenter="this.style.background='var(--surface2)'" onmouseleave="this.style.background=''">
      <span style="color:var(--text2)">${escHtml(src)}</span>
      <span style="color:var(--text);font-weight:500">${cnt}</span>
    </div>`;
  });

  html += `</div></div>`;

  // ── Recent inbox (expandable) ──────────────
  html += `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h4 style="margin-bottom:0">Recent Inbox</h4>
      <button onclick="navigateToComms()" style="background:none;border:none;color:var(--azure);font-size:11px;cursor:pointer;font-family:var(--font)">View all →</button>
    </div>`;

  if (recentEmail.length) {
    recentEmail.forEach(e => {
      const eid = 'ov-em-' + escHtml(e.email_id);
      html += `<div style="border-bottom:1px solid var(--border)">
        <div onclick="document.getElementById('${eid}').classList.toggle('open')"
          style="display:flex;gap:8px;align-items:center;padding:9px 0;cursor:pointer">
          <span style="width:6px;height:6px;border-radius:50%;background:${e.is_read ? 'transparent' : 'var(--azure)'};flex-shrink:0"></span>
          <span style="font-size:12px;color:var(--text2);width:160px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(e.sender)}</span>
          <span style="font-size:12px;font-weight:${e.is_read ? '400' : '600'};color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(e.subject)}</span>
          <span style="font-size:10px;color:var(--text3);font-family:var(--mono);flex-shrink:0">${fmtTs(e.timestamp)}</span>
        </div>
        <div id="${eid}" class="email-body">${escHtml(e.content || '')}</div>
      </div>`;
    });
  } else {
    html += '<div class="empty-state">No inbox emails.</div>';
  }

  html += `</div>`;

  document.getElementById('overview-content').innerHTML = html;

  // Select the last day by default
  if (_occData.length) {
    _apOccSelect(_occData[_occData.length - 1].date);
  }
}

// ── Occupancy bar selection ────────────────
function _apOccSelect(date) {
  _occSelDate = date;

  document.querySelectorAll('[data-occ-date]').forEach(el => {
    const isSelected = el.dataset.occDate === date;
    el.style.opacity = isSelected ? '1' : '0.45';
    el.style.outlineOffset = '-2px';
    el.style.outline = isSelected ? '2px solid rgba(255,255,255,0.35)' : 'none';
  });

  const day = _occData.find(d => d.date === date);
  const detailEl = document.getElementById('occ-detail');
  if (!day || !detailEl) return;

  detailEl.innerHTML = `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px">
      <div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:8px">${day.date}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px">Occupancy</div>
          <div style="font-size:14px;font-weight:700;color:var(--azure)">${day.occupancy_percent}%</div></div>
        <div><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px">Rooms Sold</div>
          <div style="font-size:14px;font-weight:700;color:var(--sky)">${day.rooms_sold}</div></div>
        <div><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px">ADR</div>
          <div style="font-size:14px;font-weight:700;color:var(--emerald)">${fmtCurrency(day.adr)}</div></div>
        <div><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px">RevPAR</div>
          <div style="font-size:14px;font-weight:700;color:var(--teal)">${fmtCurrency(day.revpar)}</div></div>
        <div style="grid-column:2/-1"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px">Daily Revenue</div>
          <div style="font-size:14px;font-weight:700;color:var(--violet)">${fmtCurrency(day.revenue)}</div></div>
      </div>
    </div>`;
}

// ── Tab navigation helpers ─────────────────
function navigateToReservations(status, source) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const tabBtn = document.querySelector('[data-tab="reservations"]');
  const pageEl = document.getElementById('page-reservations');
  if (tabBtn) tabBtn.classList.add('active');
  if (pageEl) pageEl.classList.add('active');
  activeTab = 'reservations';

  if (!rendered.has('reservations')) {
    renderReservations(DATA);
    rendered.add('reservations');
  }

  _resStatus = status || '';
  _resSrc    = source || '';
  _resPage   = 1;

  const statusSel = document.getElementById('res-status');
  const srcSel    = document.getElementById('res-src');
  if (statusSel) statusSel.value = _resStatus;
  if (srcSel)    srcSel.value    = _resSrc;

  _drawRes();
  window.scrollTo(0, 0);
}

function navigateToComms() {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const tabBtn = document.querySelector('[data-tab="communications"]');
  const pageEl = document.getElementById('page-communications');
  if (tabBtn) tabBtn.classList.add('active');
  if (pageEl) pageEl.classList.add('active');
  activeTab = 'communications';

  if (!rendered.has('communications')) {
    renderCommunications(DATA);
    rendered.add('communications');
  }
  window.scrollTo(0, 0);
}
