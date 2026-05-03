/* ═══════════════════════════════════════════
   overview.js — KPIs, occupancy chart,
   status breakdown, today's activity
═══════════════════════════════════════════ */

function renderOverview(DATA) {
  const hm     = DATA.hotelMgmt || {};
  const rooms  = hm.rooms  || [];
  const resv   = hm.reservations || [];
  const occHist = hm.occupancy_history || [];
  const emails = (DATA.email || {}).emails || [];

  // KPI computations
  const checkedIn    = resv.filter(r => r.status === 'Checked-In').length;
  const confirmed    = resv.filter(r => r.status === 'Confirmed').length;
  const checkedOut   = resv.filter(r => r.status === 'Checked-Out').length;
  const noShow       = resv.filter(r => r.status === 'No-Show').length;
  const cancelled    = resv.filter(r => r.status === 'Cancelled').length;
  const occPct       = rooms.length ? Math.round(checkedIn / rooms.length * 100) : 0;
  const activeRates  = resv.filter(r => r.status === 'Checked-In' && r.rate_per_night);
  const adr          = activeRates.length ? activeRates.reduce((s,r) => s+(r.rate_per_night||0),0) / activeRates.length : 0;
  const totalRevenue = resv.filter(r => r.status !== 'Cancelled').reduce((s,r) => s+(r.total_amount||0), 0);
  const unreadEmail  = emails.filter(e => !e.is_read && e.folder === 'INBOX').length;

  // Occupancy history chart
  const maxRev = Math.max(...occHist.map(d => d.revenue||0), 1);
  const maxOcc = 100;

  // Recent inbox
  const recentEmail = [...emails].filter(e => e.folder === 'INBOX').sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)).slice(0,5);

  let html = '';

  // KPIs
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
      <div class="kpi-label">Avg Daily Rate</div>
      <div class="kpi-value" style="color:var(--emerald)">${fmtCurrency(adr)}</div>
      <div class="kpi-sub">checked-in rooms</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">Total Revenue</div>
      <div class="kpi-value" style="color:var(--teal)">${fmtCurrency(totalRevenue)}</div>
      <div class="kpi-sub">all non-cancelled</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">Reservations</div>
      <div class="kpi-value" style="color:var(--indigo)">${resv.length}</div>
      <div class="kpi-sub">${checkedOut} checked-out</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">Unread Emails</div>
      <div class="kpi-value" style="color:${unreadEmail>0?'var(--amber)':'var(--emerald)'}">${unreadEmail}</div>
      <div class="kpi-sub">inbox</div>
    </div>
  </div>`;

  // Two-column: occupancy chart + status breakdown
  html += `<div class="grid-2" style="margin-bottom:18px">
    <div class="card">
      <h4>Occupancy History (${occHist.length} days)</h4>
      <div class="occ-chart">`;

  occHist.forEach(d => {
    const h = Math.max(4, Math.round((d.occupancy_percent / maxOcc) * 60));
    const col = d.occupancy_percent >= 90 ? 'var(--emerald)' : d.occupancy_percent >= 70 ? 'var(--azure)' : 'var(--amber)';
    html += `<div class="occ-bar" style="height:${h}px;background:${col}" title="${d.date}: ${d.occupancy_percent}% occ · ADR $${d.adr} · Rev $${d.revenue?.toLocaleString()}"></div>`;
  });

  html += `</div>
      <div class="occ-labels">`;
  occHist.forEach(d => {
    html += `<div class="occ-label">${d.date.slice(5)}</div>`;
  });
  html += `</div>
      <div style="margin-top:10px;display:flex;gap:16px;flex-wrap:wrap">`;

  if (occHist.length) {
    const latest = occHist[occHist.length - 1];
    const avgOcc = Math.round(occHist.reduce((s,d) => s+d.occupancy_percent,0) / occHist.length);
    const avgADR = Math.round(occHist.reduce((s,d) => s+(d.adr||0),0) / occHist.length);
    const totalRev = occHist.reduce((s,d) => s+(d.revenue||0),0);
    html += `
        <div><div class="kpi-label">Avg Occupancy</div><div style="font-size:13px;font-weight:600;color:var(--azure);margin-top:2px">${avgOcc}%</div></div>
        <div><div class="kpi-label">Avg ADR</div><div style="font-size:13px;font-weight:600;color:var(--emerald);margin-top:2px">$${avgADR}</div></div>
        <div><div class="kpi-label">Period Revenue</div><div style="font-size:13px;font-weight:600;color:var(--teal);margin-top:2px">${fmtCurrency(totalRev)}</div></div>`;
  }

  html += `</div></div>

    <div class="card">
      <h4>Reservation Status</h4>
      <div class="status-bars">`;

  const statuses = [
    ['Checked-In',  checkedIn,  'var(--azure)'],
    ['Confirmed',   confirmed,  'var(--violet)'],
    ['Checked-Out', checkedOut, 'var(--emerald)'],
    ['No-Show',     noShow,     'var(--rose)'],
    ['Cancelled',   cancelled,  'var(--amber)'],
  ];
  statuses.forEach(([label, count, col]) => {
    const pct = resv.length ? count / resv.length * 100 : 0;
    html += `<div class="status-bar-row">
      <span class="status-bar-label">${label}</span>
      <div class="status-bar-track"><div class="status-bar-fill" style="width:${pct.toFixed(1)}%;background:${col}"></div></div>
      <span class="status-bar-val">${count}</span>
    </div>`;
  });

  html += `</div>
      <div class="mf-sep"></div>
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:var(--text3);margin-bottom:8px">Booking Sources</div>`;

  const bySrc = {};
  resv.forEach(r => { bySrc[r.booking_source] = (bySrc[r.booking_source]||0) + 1; });
  Object.entries(bySrc).sort((a,b) => b[1]-a[1]).forEach(([src, cnt]) => {
    html += `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px">
      <span style="color:var(--text2)">${escHtml(src)}</span>
      <span style="color:var(--text);font-weight:500">${cnt}</span>
    </div>`;
  });

  html += `</div></div>`;

  // Recent inbox
  html += `<div class="card" style="margin-bottom:18px">
    <h4>Recent Inbox</h4>`;
  if (recentEmail.length) {
    recentEmail.forEach(e => {
      html += `<div style="display:flex;gap:8px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="width:6px;height:6px;border-radius:50%;background:${e.is_read?'transparent':'var(--azure)'};flex-shrink:0;margin-top:4px"></span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(e.sender)}</div>
          <div style="font-size:12px;font-weight:${e.is_read?'400':'600'};color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(e.subject)}</div>
        </div>
        <span style="font-size:10px;color:var(--text3);font-family:var(--mono);flex-shrink:0">${fmtTs(e.timestamp)}</span>
      </div>`;
    });
  } else {
    html += '<div class="empty-state">No inbox emails.</div>';
  }
  html += `</div>`;

  document.getElementById('overview-content').innerHTML = html;
}
