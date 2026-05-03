/* ═══════════════════════════════════════════
   rooms.js — 60 rooms by floor, live status
   from Checked-In and Confirmed reservations
═══════════════════════════════════════════ */

const _roomStore = [];

function renderRooms(DATA) {
  const hm   = DATA.hotelMgmt || {};
  const rooms = hm.rooms        || [];
  const resv  = hm.reservations || [];
  const guests = hm.guests      || [];

  const guestMap = Object.fromEntries(guests.map(g => [g.guest_id, g]));

  // Current status maps
  const occupiedMap  = {}; // room_number → reservation (Checked-In)
  const arrivingMap  = {}; // room_number → reservation (Confirmed)
  resv.forEach(r => {
    if (r.room_number) {
      if (r.status === 'Checked-In')  occupiedMap[r.room_number]  = r;
      if (r.status === 'Confirmed')   arrivingMap[r.room_number]  = r;
    }
  });

  _roomStore.length = 0;
  rooms.forEach((r, i) => {
    const oRes = occupiedMap[r.room_number];
    const aRes = arrivingMap[r.room_number];
    const status = oRes ? 'occupied' : aRes ? 'arriving' : 'available';
    _roomStore.push({ ...r, _status: status, _oRes: oRes || null, _aRes: aRes || null, _idx: i });
  });

  // Group by floor
  const byFloor = {};
  _roomStore.forEach(r => {
    if (!byFloor[r.floor]) byFloor[r.floor] = [];
    byFloor[r.floor].push(r);
  });

  const occupied  = _roomStore.filter(r => r._status === 'occupied').length;
  const arriving  = _roomStore.filter(r => r._status === 'arriving').length;
  const available = _roomStore.filter(r => r._status === 'available').length;

  let html = `<div class="kpi-row" style="margin-bottom:20px">
    <div class="kpi-tile">
      <div class="kpi-label">Occupied</div>
      <div class="kpi-value" style="color:var(--azure)">${occupied}</div>
      <div class="kpi-sub">${Math.round(occupied/rooms.length*100)}% of ${rooms.length} rooms</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">Arriving</div>
      <div class="kpi-value" style="color:var(--violet)">${arriving}</div>
      <div class="kpi-sub">confirmed bookings</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">Available</div>
      <div class="kpi-value" style="color:var(--emerald)">${available}</div>
      <div class="kpi-sub">ready to book</div>
    </div>
  </div>
  <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2)"><div style="width:10px;height:3px;background:var(--azure);border-radius:2px"></div>Occupied</div>
    <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2)"><div style="width:10px;height:3px;background:var(--violet);border-radius:2px"></div>Arriving (Confirmed)</div>
    <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2)"><div style="width:10px;height:3px;background:var(--emerald);border-radius:2px"></div>Available</div>
  </div>`;

  Object.keys(byFloor).sort((a,b) => Number(a)-Number(b)).forEach(floor => {
    const floorRooms = byFloor[floor];
    const flOcc = floorRooms.filter(r => r._status === 'occupied').length;
    html += `<div class="rooms-floor-section">
      <div class="rooms-floor-label">
        Floor ${floor}
        <span style="font-weight:400;color:var(--text3)">${flOcc}/${floorRooms.length} occupied</span>
      </div>
      <div class="rooms-grid">`;

    floorRooms.forEach(r => {
      const res = r._oRes || r._aRes;
      const g   = res && guestMap[res.guest_id];
      html += `<div class="room-card ${r._status}" onclick="showRoomModal(${r._idx})">
        <div class="room-number">${escHtml(r.room_number)}</div>
        <div class="room-type-label">${escHtml(r.room_type)}</div>
        <div class="room-detail">${escHtml(r.beds)} · ${escHtml(r.view)}</div>
        <div class="room-rate">${fmtCurrency(r.base_rate)}<span style="font-size:9px;color:var(--text3);font-weight:400">/night</span></div>
        ${res ? `<div class="room-guest">${escHtml(res.guest_name)}${r._status === 'arriving' ? ' ↓' : ''}</div>` : '<div style="font-size:10px;color:var(--emerald);margin-top:4px">Available</div>'}
      </div>`;
    });

    html += `</div></div>`;
  });

  document.getElementById('rooms-content').innerHTML = html;
}

function showRoomModal(idx) {
  const r = _roomStore[idx];
  if (!r) return;

  const res = r._oRes || r._aRes;
  const nights = res ? nightsBetween(res.check_in_date, res.check_out_date) : null;

  const statusLabel = r._status === 'occupied' ? 'Checked-In' : r._status === 'arriving' ? 'Arriving' : 'Available';
  const statusCol   = r._status === 'occupied' ? 'var(--azure)' : r._status === 'arriving' ? 'var(--violet)' : 'var(--emerald)';

  let body = `<div class="mf-grid">
    <div class="mf-item"><label>Room Number</label><span class="val mono" style="color:var(--sky);font-size:18px">${escHtml(r.room_number)}</span></div>
    <div class="mf-item"><label>Status</label><span class="val"><span style="color:${statusCol};font-weight:600">${statusLabel}</span></span></div>
    <div class="mf-item"><label>Room Type</label><span class="val">${escHtml(r.room_type)}</span></div>
    <div class="mf-item"><label>Floor</label><span class="val">${r.floor}</span></div>
    <div class="mf-item"><label>Beds</label><span class="val">${escHtml(r.beds)}</span></div>
    <div class="mf-item"><label>View</label><span class="val">${escHtml(r.view)}</span></div>
    <div class="mf-item"><label>Base Rate</label><span class="val" style="color:var(--emerald)">${fmtCurrency(r.base_rate)}/night</span></div>
  </div>`;

  if (res) {
    body += `<div class="mf-sep"></div>
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:var(--text3);margin-bottom:10px">
      ${r._status === 'occupied' ? 'Current Stay' : 'Upcoming Reservation'}
    </div>
    <div class="mf-grid">
      <div class="mf-item"><label>Confirmation</label><span class="val mono" style="color:var(--azure)">${escHtml(res.confirmation_code)}</span></div>
      <div class="mf-item"><label>Status</label><span class="val"><span class="badge ${resBadgeClass(res.status)}">${escHtml(res.status)}</span></span></div>
      <div class="mf-item"><label>Guest</label><span class="val">${escHtml(res.guest_name)}</span></div>
      <div class="mf-item"><label>Booking Source</label><span class="val">${escHtml(res.booking_source)}</span></div>
      <div class="mf-item"><label>Check-In</label><span class="val">${fmtDate(res.check_in_date)}</span></div>
      <div class="mf-item"><label>Check-Out</label><span class="val">${fmtDate(res.check_out_date)}${nights !== null ? ` (${nights}n)` : ''}</span></div>
      <div class="mf-item"><label>Rate / Night</label><span class="val" style="color:var(--emerald)">${fmtCurrency(res.rate_per_night)}</span></div>
      <div class="mf-item"><label>Total</label><span class="val" style="color:var(--emerald);font-weight:600">${fmtCurrency(res.total_amount)}</span></div>
      ${res.special_requests ? `<div class="mf-item mf-full"><label>Special Requests</label><span class="val">${escHtml(res.special_requests)}</span></div>` : ''}
    </div>`;
  }

  openModal('Room', `Room ${r.room_number} · ${r.room_type}`, body);
}
