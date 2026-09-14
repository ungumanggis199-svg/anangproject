/* =====================================================
   DATA PERKARA (SPDP) — Sheet "Data Perkara"
   Fokus pada Jenis Pidana tanpa Status Laporan
   ===================================================== */

const PRK_SHEET_ID  = '1VOZUFvj042hHXFejLHXjQg7FVO3otDNV_L3UGAnrhCQ';
const PRK_SHEET_NAME = 'Data%20Perkara';

const PRK_CSV_URL   = `https://docs.google.com/spreadsheets/d/${PRK_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${PRK_SHEET_NAME}`;
const PRK_GVIZ_URL  = `https://docs.google.com/spreadsheets/d/${PRK_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${PRK_SHEET_NAME}`;

const PRK_BOUNDS = [[-5.85, 121.85], [-3.95, 123.35]];
const PRK_CENTER = [-4.95, 122.55];

// Palet Warna Dinamis untuk Jenis Pidana
const PRK_PIDANA_COLORS = {};
let prkColorIndex = 0;
const PIDANA_PALETTE = [
  '#D94A4A', '#2E9A6B', '#4A90D9', '#B8902E', '#7C5CBF', 
  '#3AA6A0', '#C46A2E', '#5B7DB1', '#8A9490', '#155A41', '#0B3D2E'
];

function getPidanaColor(pidanaName) {
  const key = prkNorm(pidanaName) || '-';
  if (!PRK_PIDANA_COLORS[key]) {
    PRK_PIDANA_COLORS[key] = PIDANA_PALETTE[prkColorIndex % PIDANA_PALETTE.length];
    prkColorIndex++;
  }
  return PRK_PIDANA_COLORS[key];
}

const PRK_LABELS = {
  sumber:   ['sumber'],
  nospdp:   ['no spdp'],
  tglspdp:  ['tanggal spdp'],
  kecamatan:['kecamatan'],
  kabupaten:['kabupaten'],
  waktu:    ['waktu kejadian'],
  tglkejadian:['tanggal kejadian'],
  lokasi:   ['lokasi lengkap kejadian','lokasi kejadian'],
  pasal:    ['melanggar uu dan pasal','pasal'],
  pidana:   ['pidana'],
  tersangka:['tersangka'],
  kordinat: ['kordinat','koordinat']
};

let prkMap = null;
let prkMarkersLayer = null;
let prkAllData = [];
let prkGroupStore = {};      
let prkMarkersByKey = {};    
let prkPopupIndex = {};      
let prkLastRenderedData = []; 

function prkNorm(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function prkBuildColMap(headerLabels) {
  const norm = headerLabels.map(prkNorm);
  const map = {};
  const order = ['sumber','nospdp','tglspdp','kecamatan','kabupaten','waktu','tglkejadian','lokasi','pasal','pidana','tersangka','kordinat'];
  order.forEach(key => {
    const candidates = PRK_LABELS[key];
    let idx = -1;
    for (const cand of candidates) {
      idx = norm.findIndex((h, i) => h === cand && !Object.values(map).includes(i));
      if (idx !== -1) break;
    }
    if (idx === -1) {
      for (const cand of candidates) {
        idx = norm.findIndex((h, i) => h.includes(cand) && !Object.values(map).includes(i));
        if (idx !== -1) break;
      }
    }
    if (idx !== -1) map[key] = idx;
  });
  return map;
}

function prkRowToObj(cols, map) {
  const get = key => (map[key] != null && cols[map[key]] != null) ? String(cols[map[key]]).trim() : '';
  const kordinatRaw = get('kordinat');
  const parts = kordinatRaw.split(',').map(s => parseFloat(s.trim()));
  const lat = parts[0], lng = parts[1];
  if (isNaN(lat) || isNaN(lng)) return null;

  const tglKejadianRaw = get('tglkejadian');
  const tglSpdpRaw = get('tglspdp');
  const tgl = prkParseTanggalID(tglKejadianRaw) || prkParseTglDMY(tglSpdpRaw);

  return {
    sumber: get('sumber'),
    noSpdp: get('nospdp'),
    tglSpdp: tglSpdpRaw,
    kecamatan: get('kecamatan'),
    kabupaten: get('kabupaten').trim().toUpperCase(),
    waktu: get('waktu'),
    tglKejadian: tglKejadianRaw,
    lokasi: get('lokasi'),
    pasal: get('pasal'),
    pidana: get('pidana') || '-',
    tersangka: get('tersangka'),
    year: tgl ? tgl.year : null,
    month: tgl ? tgl.month : null,
    lat, lng
  };
}

const PRK_BULAN_ID = {
  januari:1, februari:2, maret:3, april:4, mei:5, juni:6,
  juli:7, agustus:8, september:9, oktober:10, november:11, desember:12
};
const PRK_BULAN_NAMA = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function prkParseTanggalID(str) {
  if (!str) return null;
  const m = String(str).match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return null;
  const bulan = PRK_BULAN_ID[m[2].toLowerCase()];
  if (!bulan) return null;
  return { year: parseInt(m[3], 10), month: bulan, day: parseInt(m[1], 10) };
}

function prkParseTglDMY(str) {
  if (!str) return null;
  const m = String(str).match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (!m) return null;
  return { year: parseInt(m[3], 10), month: parseInt(m[2], 10), day: parseInt(m[1], 10) };
}

function prkParseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const splitLine = line => (line.match(/(".*?"|[^",]+)(?=,|$)/g) || []).map(c => c.replace(/^"|"$/g, '').trim());
  const header = splitLine(lines[0]);
  const map = prkBuildColMap(header);
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    if (!cols.length) continue;
    const obj = prkRowToObj(cols, map);
    if (obj) data.push(obj);
  }
  return data;
}

function prkParseGviz(text) {
  const clean = text.replace(/^[^(]+\(/, '').replace(/\);\s*$/, '');
  const json  = JSON.parse(clean);
  const cols  = (json.table && json.table.cols) ? json.table.cols : [];
  const rows  = (json.table && json.table.rows) ? json.table.rows : [];
  const header = cols.map(c => c.label || '');
  const map = prkBuildColMap(header);
  const data = [];
  for (const row of rows) {
    if (!row || !row.c) continue;
    const values = row.c.map(c => (c && c.v != null) ? c.v : '');
    const obj = prkRowToObj(values, map);
    if (obj) data.push(obj);
  }
  return data;
}

function prkFetchWithTimeout(url, ms = 8000) {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(tid));
}

async function fetchPrkData() {
  try {
    const res = await prkFetchWithTimeout(PRK_CSV_URL);
    if (res.ok) {
      const text = await res.text();
      if (!text.includes('<html') && !text.includes('<!DOCTYPE')) {
        const data = prkParseCSV(text);
        if (data.length > 0) return data;
      }
    }
  } catch (e) {
    console.warn('CSV Perkara fetch gagal, coba gviz:', e.message);
  }
  const res2 = await prkFetchWithTimeout(PRK_GVIZ_URL);
  if (!res2.ok) throw new Error('HTTP ' + res2.status);
  const text2 = await res2.text();
  const data2 = prkParseGviz(text2);
  if (data2.length === 0) throw new Error('Data kosong dari kedua sumber');
  return data2;
}

function initPrkMap() {
  if (prkMap) return;
  prkMap = L.map('prkMap', {
    maxBounds: PRK_BOUNDS,
    maxBoundsViscosity: 1.0,
    minZoom: 8,
    maxZoom: 16
  }).setView(PRK_CENTER, 9);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    bounds: PRK_BOUNDS
  }).addTo(prkMap);

  prkMap.fitBounds(PRK_BOUNDS);
  prkMarkersLayer = L.layerGroup().addTo(prkMap);
}

function prkCreateIcon(color, count) {
  const badge = (count && count > 1)
    ? `<div style="position:absolute;top:-6px;right:-7px;background:#1a2e22;color:#fff;font-size:9.5px;font-weight:700;min-width:16px;height:16px;line-height:16px;text-align:center;border-radius:50%;border:1.5px solid #fff;padding:0 2px;">${count}</div>`
    : '';
  return L.divIcon({
    className: 'prk-marker',
    html: `<div style="position:relative;width:22px;height:22px;">
      <div style="width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>
      ${badge}
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [10, 22]
  });
}

function prkEsc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function prkCoordKey(lat, lng) {
  return lat.toFixed(5) + ',' + lng.toFixed(5);
}

function prkDominantColor(items) {
  const counts = {};
  items.forEach(it => { counts[it.pidana] = (counts[it.pidana] || 0) + 1; });
  let best = null, bestN = -1;
  Object.entries(counts).forEach(([k, v]) => { if (v > bestN) { best = k; bestN = v; } });
  return getPidanaColor(best);
}

function prkBuildPopup(key, group) {
  const kec = group.items[0].kecamatan || '-';
  const kab = group.items[0].kabupaten || '-';
  const navBtn = (dir, label) => `
    <button onclick="prkSlideNav('${key}',${dir})"
      style="border:none;background:#0B3D2E;color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">
      ${label}
    </button>`;
  return `
    <div class="prk-popup" style="font-size:12.5px;min-width:235px;max-width:290px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:700;color:#0B3D2E;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(0,0,0,0.08);">
        <span>📍 ${prkEsc(kec)}, ${prkEsc(kab)}</span>
        <span style="font-weight:600;color:#8a9490;font-size:11px;white-space:nowrap;">${group.items.length} kasus</span>
      </div>
      <div id="prk-slide-${key}"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.08);">
        ${navBtn(-1, '‹ Sebelumnya')}
        <span id="prk-idx-${key}" style="font-size:11px;color:#8a9490;font-weight:600;"></span>
        ${navBtn(1, 'Berikutnya ›')}
      </div>
    </div>
  `;
}

function prkRenderSlide(key) {
  const group = prkGroupStore[key];
  if (!group) return;
  const total = group.items.length;
  let idx = prkPopupIndex[key] || 0;
  if (idx < 0) idx = total - 1;
  if (idx >= total) idx = 0;
  prkPopupIndex[key] = idx;

  const d = group.items[idx];
  const idxEl   = document.getElementById('prk-idx-' + key);
  const slideEl = document.getElementById('prk-slide-' + key);
  if (idxEl) idxEl.textContent = (idx + 1) + ' / ' + total;
  if (!slideEl || !d) return;

  const color = getPidanaColor(d.pidana);

  slideEl.innerHTML = `
    <div style="font-weight:700;color:${color};margin-bottom:4px;">${prkEsc(d.pidana)}</div>
    ${d.tersangka ? `<div style="color:#555;margin-bottom:3px;">👤 ${prkEsc(d.tersangka)}</div>` : ''}
    ${d.lokasi ? `<div style="color:#555;margin-bottom:3px;">📍 ${prkEsc(d.lokasi)}</div>` : ''}
    ${d.tglKejadian ? `<div style="color:#555;margin-bottom:3px;">📅 ${prkEsc(d.tglKejadian)}</div>` : ''}
    ${d.noSpdp ? `<div style="margin-top:5px;font-size:11px;color:#8a9490;">${prkEsc(d.noSpdp)}</div>` : ''}
    ${d.sumber ? `<div style="font-size:11px;color:#8a9490;">${prkEsc(d.sumber)}</div>` : ''}
  `;
}

function prkSlideNav(key, dir) {
  const group = prkGroupStore[key];
  if (!group) return;
  const total = group.items.length;
  let idx = (prkPopupIndex[key] || 0) + dir;
  if (idx < 0) idx = total - 1;
  if (idx >= total) idx = 0;
  prkPopupIndex[key] = idx;
  prkRenderSlide(key);
}

function renderPrkMarkers(data) {
  if (!prkMarkersLayer) return;
  prkMarkersLayer.clearLayers();
  prkGroupStore = {};
  prkMarkersByKey = {};

  data.forEach(d => {
    const key = prkCoordKey(d.lat, d.lng);
    if (!prkGroupStore[key]) prkGroupStore[key] = { lat: d.lat, lng: d.lng, items: [] };
    prkGroupStore[key].items.push(d);
  });

  Object.keys(prkGroupStore).forEach(key => {
    const group = prkGroupStore[key];
    if (prkPopupIndex[key] == null) prkPopupIndex[key] = 0;

    const color = prkDominantColor(group.items);
    const icon  = prkCreateIcon(color, group.items.length);

    const marker = L.marker([group.lat, group.lng], { icon })
      .bindPopup(prkBuildPopup(key, group), { maxWidth: 300 })
      .addTo(prkMarkersLayer);

    marker.on('popupopen', () => prkRenderSlide(key));
    marker.on('popupclose', () => { prkPopupIndex[key] = 0; });

    prkMarkersByKey[key] = marker;
  });
}

function renderPrkLegend(data) {
  const legendEl = document.getElementById('prkLegend');
  if (!legendEl) return;

  const pidanaSet = [...new Set(data.map(d => d.pidana))].filter(Boolean).sort();
  if (pidanaSet.length === 0) {
    legendEl.innerHTML = '<div style="color:#aaa;">Belum ada data</div>';
    return;
  }

  legendEl.innerHTML = pidanaSet.map(p => {
    const color = getPidanaColor(p);
    const count = data.filter(d => d.pidana === p).length;
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(0,0,0,0.04);">
        <div style="width:12px;height:12px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};flex-shrink:0;"></div>
        <span style="flex:1;color:#1a2e22;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${prkEsc(p)}">${prkEsc(p)}</span>
        <span style="color:#8a9490;font-weight:600;">${count}</span>
      </div>`;
  }).join('');
}

function renderPrkTable(data) {
  const tabelEl = document.getElementById('prkTabel');
  const countEl = document.getElementById('prkDataCount');
  if (countEl) countEl.textContent = data.length + ' data';
  prkLastRenderedData = data;
  if (!tabelEl) return;

  if (data.length === 0) {
    tabelEl.innerHTML = '<div style="color:#aaa;text-align:center;padding:20px;">Tidak ada data untuk filter ini</div>';
    return;
  }

  const PRK_LIST_LIMIT = 4;
  const shown = data.slice(0, PRK_LIST_LIMIT);
  const sisa  = data.length - shown.length;

  const rows = shown.map((d, i) => {
    const color = getPidanaColor(d.pidana);
    return `
      <div onclick="prkTableItemClick(${i})"
           style="padding:8px 10px;border-bottom:1px solid rgba(0,0,0,0.05);cursor:pointer;transition:background .15s;"
           onmouseover="this.style.background='rgba(11,61,46,0.04)'"
           onmouseout="this.style.background=''">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
          <div style="width:8px;height:8px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};flex-shrink:0;"></div>
          <span style="font-weight:600;color:#1a2e22;font-size:12px;">${prkEsc(d.pidana)}</span>
        </div>
        <div style="color:#1a2e22;font-size:11.5px;padding-left:14px;">${prkEsc(d.tersangka) || '-'}</div>
        <div style="color:#8a9490;font-size:11px;padding-left:14px;">${prkEsc(d.kecamatan)}${d.kecamatan && d.kabupaten ? ', ' : ''}${prkEsc(d.kabupaten)}</div>
      </div>`;
  }).join('');

  const footer = sisa > 0
    ? `<div onclick="prkOpenFullList()"
           style="text-align:center;padding:9px;font-size:12px;font-weight:600;color:#0B3D2E;cursor:pointer;background:rgba(11,61,46,0.04);border-top:1px solid rgba(11,61,46,0.08);"
           onmouseover="this.style.background='rgba(11,61,46,0.08)'"
           onmouseout="this.style.background='rgba(11,61,46,0.04)'">
         Lihat ${sisa} data lainnya ↓
       </div>`
    : '';

  tabelEl.innerHTML = rows + footer;
}

function prkOpenFullList() {
  const modal   = document.getElementById('prkFullListModal');
  const title   = document.getElementById('prkFullListModalTitle');
  const content = document.getElementById('prkFullListModalContent');
  if (title) title.textContent = 'Semua Data Perkara (' + prkLastRenderedData.length + ')';
  if (content) {
    content.innerHTML = prkLastRenderedData.map((d, i) => {
      const color = getPidanaColor(d.pidana);
      return `
        <div onclick="document.getElementById('prkFullListModal').style.display='none';prkTableItemClick(${i})"
             style="padding:9px 4px;border-bottom:1px solid rgba(0,0,0,0.06);cursor:pointer;"
             onmouseover="this.style.background='rgba(11,61,46,0.04)'"
             onmouseout="this.style.background=''">
          <div style="font-weight:700;color:#1a2e22;font-size:13px;display:flex;align-items:center;gap:6px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${color};"></div>
            ${prkEsc(d.pidana)}
          </div>
          <div style="font-size:12px;color:#555;padding-left:14px;">${prkEsc(d.tersangka) || '-'}</div>
          <div style="font-size:11.5px;color:#8a9490;padding-left:14px;">${prkEsc(d.kecamatan)}${d.kecamatan && d.kabupaten ? ', ' : ''}${prkEsc(d.kabupaten)}</div>
        </div>`;
    }).join('');
  }
  if (modal) modal.style.display = 'flex';
}

function prkTableItemClick(i) {
  const d = prkLastRenderedData[i];
  if (!d) return;
  const key = prkCoordKey(d.lat, d.lng);
  const group = prkGroupStore[key];
  if (group) {
    const idx = group.items.indexOf(d);
    prkPopupIndex[key] = idx >= 0 ? idx : 0;
  }
  if (prkMap) prkMap.flyTo([d.lat, d.lng], 14, { duration: 0.8 });
  const marker = prkMarkersByKey[key];
  if (marker) {
    setTimeout(() => marker.openPopup(), 700);
  }
}

function updatePrkStats(data) {
  const totalEl  = document.getElementById('prkStatTotal');
  if (totalEl)  totalEl.textContent  = data.length;
}

let prkChartKecamatan = null;
let prkChartPidana    = null;
let prkChartTren      = null;

function prkTopCounts(data, key, limit) {
  const counts = {};
  data.forEach(d => {
    const val = (d[key] || '-').trim() || '-';
    counts[val] = (counts[val] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function prkRenderBarChart(canvasId, chartRef, pairs, color) {
  const el = document.getElementById(canvasId);
  if (!el) return chartRef;
  const labels = pairs.map(p => p[0]);
  const values = pairs.map(p => p[1]);

  if (chartRef) {
    chartRef.data.labels = labels;
    chartRef.data.datasets[0].data = values;
    chartRef.update();
    return chartRef;
  }

  return new Chart(el.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: color,
        borderRadius: 5,
        maxBarThickness: 22
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0, font: { size: 10.5 } }, grid: { color: 'rgba(11,61,46,0.06)' } },
        y: { ticks: { font: { size: 10.5 } }, grid: { display: false } }
      }
    }
  });
}

function updatePrkChartKecamatan(data) {
  const pairs = prkTopCounts(data, 'kecamatan', 10);
  prkChartKecamatan = prkRenderBarChart('prkChartKecamatan', prkChartKecamatan, pairs, '#2E9A6B');
}

function updatePrkChartPidana(data) {
  const pairs = prkTopCounts(data, 'pidana', 10);
  prkChartPidana = prkRenderBarChart('prkChartPidana', prkChartPidana, pairs, '#D94A4A');
}

function updatePrkChartTren(data) {
  const el = document.getElementById('prkChartTren');
  if (!el) return;

  const counts = {};
  data.forEach(d => {
    if (!d.year || !d.month) return;
    const key = d.year + '-' + String(d.month).padStart(2, '0');
    counts[key] = (counts[key] || 0) + 1;
  });
  const keys = Object.keys(counts).sort();
  const labels = keys.map(k => {
    const [y, m] = k.split('-');
    return PRK_BULAN_NAMA[parseInt(m, 10)] + ' ' + y;
  });
  const values = keys.map(k => counts[k]);

  if (prkChartTren) {
    prkChartTren.data.labels = labels;
    prkChartTren.data.datasets[0].data = values;
    prkChartTren.update();
    return;
  }

  prkChartTren = new Chart(el.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: '#0B3D2E',
        backgroundColor: 'rgba(11,61,46,0.10)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: '#0B3D2E'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 45 }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10.5 } }, grid: { color: 'rgba(11,61,46,0.06)' } }
      }
    }
  });
}

function updatePrkCharts(data) {
  if (typeof Chart === 'undefined') return;
  updatePrkChartKecamatan(data);
  updatePrkChartPidana(data);
  updatePrkChartTren(data);
}

function prkPopulatePidanaFilter(data) {
  const sel = document.getElementById('prkFilterPidana');
  if (!sel) return;
  const current = sel.value;
  const pidanaSet = [...new Set(data.map(d => d.pidana).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Semua Jenis Pidana</option>' +
    pidanaSet.map(p => `<option value="${prkEsc(p)}">${prkEsc(p)}</option>`).join('');
  sel.value = current;
}

function prkPopulateTahunFilter(data) {
  const sel = document.getElementById('prkFilterTahun');
  if (!sel) return;
  const current = sel.value;
  const years = [...new Set(data.map(d => d.year).filter(Boolean))].sort((a, b) => b - a);
  sel.innerHTML = '<option value="">Semua Tahun</option>' +
    years.map(y => `<option value="${y}">${y}</option>`).join('');
  sel.value = current;
}

function applyPrkFilter() {
  const kab    = document.getElementById('prkFilterKabupaten')?.value || '';
  const pidana = document.getElementById('prkFilterPidana')?.value || '';
  const bulan  = document.getElementById('prkFilterBulan')?.value || '';
  const tahun  = document.getElementById('prkFilterTahun')?.value || '';
  const search = prkNorm(document.getElementById('prkSearch')?.value || '');

  const filtered = prkAllData.filter(d => {
    if (kab && d.kabupaten !== kab) return false;
    if (pidana && d.pidana !== pidana) return false;
    if (bulan && String(d.month) !== bulan) return false;
    if (tahun && String(d.year) !== tahun) return false;
    if (search) {
      const hay = prkNorm(d.tersangka + ' ' + d.kecamatan + ' ' + d.noSpdp + ' ' + d.lokasi);
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  renderPrkMarkers(filtered);
  renderPrkTable(filtered);
  updatePrkCharts(filtered);
}

function prkShowError(msg) {
  const loadingMap = document.getElementById('prkLoadingMap');
  if (!loadingMap) return;
  loadingMap.style.display = 'flex';
  document.getElementById('prkMap').style.display = 'none';
  loadingMap.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="#D94A4A" stroke-width="2" width="36" height="36" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <div style="color:#D94A4A;font-size:13px;text-align:center;max-width:320px;padding:0 20px;line-height:1.6;">${msg}</div>
    <button onclick="loadPrkData()" style="padding:8px 18px;background:#0B3D2E;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;">↻ Coba Lagi</button>
  `;
}

async function loadPrkData() {
  const loadingMap = document.getElementById('prkLoadingMap');
  const mapEl      = document.getElementById('prkMap');
  const tabelEl    = document.getElementById('prkTabel');

  if (loadingMap) {
    loadingMap.style.display = 'flex';
    loadingMap.innerHTML = `
      <div style="width:36px;height:36px;border:3px solid rgba(11,61,46,0.15);border-top-color:#0B3D2E;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
      <div style="color:#8a9490;font-size:13px;">Memuat peta dan data perkara...</div>
    `;
  }
  if (mapEl) mapEl.style.display = 'none';
  if (tabelEl) tabelEl.innerHTML = '<div style="color:#aaa;text-align:center;padding:20px;">Memuat data...</div>';

  try {
    const data = await fetchPrkData();
    prkAllData = data;

    if (mapEl) mapEl.style.display = 'block';
    if (loadingMap) loadingMap.style.display = 'none';

    initPrkMap();
    setTimeout(() => { if (prkMap) prkMap.invalidateSize(); }, 100);

    prkPopulatePidanaFilter(data);
    prkPopulateTahunFilter(data);
    prkPopulateExportTahun(data);
    renderPrkMarkers(data);
    renderPrkLegend(data);
    renderPrkTable(data);
    updatePrkStats(data);
    updatePrkCharts(data);

    const updEl = document.getElementById('prkLastUpdate');
    if (updEl) {
      const now = new Date();
      updEl.textContent = 'Update: ' + now.toLocaleString('id-ID', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
    }
  } catch (err) {
    console.error('Gagal memuat data Perkara:', err);
    prkShowError(`Gagal memuat data perkara dari Google Sheets.<br><small style="opacity:.8;">${err.message}</small>`);
  }
}

/* ============================================================
   EKSPOR INFOGRAFIS DATA PERKARA — PNG
   ============================================================ */

function prkPopulateExportTahun(data) {
  const sel = document.getElementById('expFilterTahun');
  if (!sel) return;
  const current = sel.value;
  const years = [...new Set((data || prkAllData).map(d => d.year).filter(Boolean))].sort((a, b) => b - a);
  sel.innerHTML = '<option value="">Semua Tahun</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
  sel.value = current;
}

function prkInfografisBar(label, val, max, color) {
  const pct = max > 0 ? Math.max((val / max) * 100, 3) : 0;
  return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:11px;">
      <div style="width:150px;font-size:12.5px;color:#2c3e35;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${prkEsc(label)}</div>
      <div style="flex:1;background:#eef1ef;border-radius:7px;height:18px;overflow:hidden;">
        <div style="width:${pct}%;background:${color};height:100%;border-radius:7px;"></div>
      </div>
      <div style="width:28px;font-size:12.5px;font-weight:700;color:#1a2e22;text-align:right;">${val}</div>
    </div>`;
}

async function prkDownloadInfografis() {
  const btn = document.getElementById('expDownloadBtn');
  const bulan = document.getElementById('expFilterBulan')?.value || '';
  const tahun = document.getElementById('expFilterTahun')?.value || '';
  const kab   = document.getElementById('expFilterKabupaten')?.value || '';

  const filtered = prkAllData.filter(d => {
    if (bulan && String(d.month) !== bulan) return false;
    if (tahun && String(d.year) !== tahun) return false;
    if (kab && d.kabupaten !== kab) return false;
    return true;
  });

  if (!filtered.length) { alert('Tidak ada data perkara untuk periode/filter yang dipilih.'); return; }
  if (typeof html2canvas === 'undefined') { alert('Komponen ekspor gagal dimuat. Periksa koneksi internet lalu coba lagi.'); return; }

  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; btn.querySelector('svg')?.remove(); btn.insertAdjacentHTML('afterbegin',
    '<span style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin 0.7s linear infinite;"></span>'); }

  try {
    const periodeLabel = (bulan ? PRK_BULAN_NAMA[parseInt(bulan, 10)] + ' ' : '') + (tahun || 'Semua Tahun');
    const wilayahLabel = kab ? (kab === 'MUNA' ? 'Kab. Muna' : kab === 'MUNA BARAT' ? 'Kab. Muna Barat' : 'Kab. Buton Utara') : 'Seluruh Wilayah';

    const total  = filtered.length;
    const topKec = prkTopCounts(filtered, 'kecamatan', 5);
    const topPid = prkTopCounts(filtered, 'pidana', 5);
    const maxKec = Math.max(...topKec.map(k => k[1]), 1);
    const maxPid = Math.max(...topPid.map(k => k[1]), 1);

    const el = document.createElement('div');
    el.style.cssText = 'width:960px;padding:40px;background:#ffffff;font-family:Inter,Arial,sans-serif;position:fixed;left:-9999px;top:0;z-index:-1;';
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #0B3D2E;padding-bottom:16px;margin-bottom:24px;">
        <div>
          <div style="font-size:11px;font-weight:700;color:#8a9490;letter-spacing:1.5px;text-transform:uppercase;">Kejaksaan Negeri Muna · Bidang Intelijen</div>
          <div style="font-size:24px;font-weight:800;color:#0B3D2E;margin-top:4px;">Rekap Data Perkara (SPDP)</div>
          <div style="font-size:13.5px;color:#555;margin-top:2px;">${prkEsc(periodeLabel)} · ${prkEsc(wilayahLabel)}</div>
        </div>
        <img src="${location.origin}${location.pathname.replace(/dashboard\.html$/, '')}Logo-Kejaksaan2.png" style="width:60px;height:60px;object-fit:contain;">
      </div>

      <div style="display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:28px;">
        <div style="background:#0B3D2E;color:#fff;border-radius:14px;padding:18px;text-align:center;">
          <div style="font-size:30px;font-weight:800;line-height:1;">${total}</div>
          <div style="font-size:11.5px;opacity:.85;margin-top:6px;">Total Perkara</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:24px;">
        <div>
          <div style="font-size:13.5px;font-weight:700;color:#0B3D2E;margin-bottom:12px;">🏘️ 5 Kecamatan Perkara Terbanyak</div>
          ${topKec.map(([k, v]) => prkInfografisBar(k, v, maxKec, '#2E9A6B')).join('') || '<div style="color:#aaa;font-size:12px;">Tidak ada data</div>'}
        </div>
        <div>
          <div style="font-size:13.5px;font-weight:700;color:#0B3D2E;margin-bottom:12px;">⚖️ 5 Jenis Pidana Terbanyak</div>
          ${topPid.map(([k, v]) => prkInfografisBar(k, v, maxPid, '#D94A4A')).join('') || '<div style="color:#aaa;font-size:12px;">Tidak ada data</div>'}
        </div>
      </div>

      <div style="margin-top:28px;padding-top:14px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:10.5px;color:#aaa;">
        <span>Sistem Informasi Intelijen — Kejaksaan Negeri Muna</span>
        <span>Diunduh ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
      </div>
    `;
    document.body.appendChild(el);

    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    document.body.removeChild(el);

    const link = document.createElement('a');
    const fileSafe = periodeLabel.replace(/\s+/g, '-');
    link.download = `Infografis-Perkara-${fileSafe}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('Gagal membuat infografis:', err);
    alert('Gagal membuat infografis: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false; btn.style.opacity = '1';
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Unduh Infografis (PNG)`;
    }
  }
}

// Filter listeners
['prkFilterKabupaten','prkFilterPidana','prkFilterBulan','prkFilterTahun'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', applyPrkFilter);
});
const _prkSearchEl = document.getElementById('prkSearch');
if (_prkSearchEl) {
  let _prkSearchTimer;
  _prkSearchEl.addEventListener('input', () => {
    clearTimeout(_prkSearchTimer);
    _prkSearchTimer = setTimeout(applyPrkFilter, 250);
  });
}

document.addEventListener('DOMContentLoaded', loadPrkData);
