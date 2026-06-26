// state variables
let statusData = [];
let statusGroups = {};
let torqueData = [];
let torqueGroups = {};
let positionData = [];
let positionGroups = {};
let torqueRedlines = {}; 
let timer = null;
let activeTab = 'status';

// helpers shared between tabs
function parseRobot(tag) {
  const idx = tag.indexOf('Rob');
  if (idx === -1) return 'cell';
  return tag.substring(idx, idx + 4);
}

function parseTorqueAxis(tag) {
  const m = tag.match(/\[(\d+)\]/);
  return m ? m[1] : '?';
}

function parsePositionAxis(tag) {
  const m = tag.match(/ROBOTPOS\.([XYZ])/i);
  return m ? m[1].toUpperCase() : null;
}

function isBool(v) {
  return v === 'True' || v === 'False' || v === true || v === false || v === 'true' || v === 'false';
}

function boolVal(v) {
  return v === 'True' || v === true || v === 'true';
}

function dotClass(v) {
  if(v === null || v === undefined) 
    return '';
  if(isBool(v)) 
    return boolVal(v) ? 'ok' : 'warn';
  const n = parseFloat(v);
  if(!isNaN(n)) 
    return n === 0 ? 'warn' : 'ok';
  return '';
}

function renderValue(v) {
  if(v === null || v === undefined)
    return '<span style="color:var(--text-3)">—</span>';
  if(isBool(v)) {
    const on = boolVal(v);
    return `<span class="badge badge-${on}">${on ? 'true' : 'false'}</span>`;
  }
  const n = parseFloat(v);
  if(!isNaN(n)) 
    return Number.isInteger(n) ? String(n) : n.toFixed(3);
  return String(v);
}

function formatTime(ds) {
  if(!ds) 
    return '';
  const d = new Date(ds);
  return isNaN(d)
    ? ds
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

//grouping by robot
function groupByRobot(data) {
  const g = {};
  for(const row of data) {
    const r = parseRobot(row.tag);
    (g[r] = g[r] || []).push(row);
  }
  return g;
}

function groupPositions(data) {
  const g = {};
  for(const row of data) {
    const robot = parseRobot(row.tag);
    const axis  = parsePositionAxis(row.tag);
    if(!axis) 
      continue;
    if(!g[robot]) 
      g[robot] = {};
    g[robot][axis] = parseFloat(row.value);
    g[robot].datestamp = row.datestamp;
  }
  return g;
}

// default: last 30000 seconds
function getFromParam() {
  const val = document.getElementById('from-date').value;
  if(!val) {
    return new Date(Date.now() - 30000).toISOString();
  }
  return new Date(val).toISOString();
}

function getUntilParam() {
  const val = document.getElementById('to-date').value;
  if(!val) 
    return undefined;
  return new Date(val).toISOString();
}

// populating the filter
function populateFilter() {
  const sel = document.getElementById('robot-filter');
  const prev = sel.value;
  while(sel.options.length > 1) 
    sel.remove(1);

  const robots = new Set([
    ...Object.keys(statusGroups),
    ...Object.keys(torqueGroups),
    ...Object.keys(positionGroups),
  ]);

  const sorted = [...robots].sort((a, b) =>
    a === 'cell' ? 1 : b === 'cell' ? -1 : a.localeCompare(b));

  for(const r of sorted) {
    const opt = document.createElement('option');
    opt.value = r;
    opt.textContent = r === 'cell' ? 'Cell (no robot)' : r;
    sel.appendChild(opt);
  }

  if(prev && [...sel.options].some(o => o.value === prev)) 
    sel.value = prev;
}

// robot basic status

function renderStatusContent(filter) {
  const toRender = filter === 'all'
    ? Object.entries(statusGroups).sort(([a], [b]) =>
        a === 'cell' ? 1 : b === 'cell' ? -1 : a.localeCompare(b))
    : [[filter, statusGroups[filter] || []]];

  if(toRender.length === 0) {
    document.getElementById('content').innerHTML = '<div class="empty">No data</div>';
    return;
  }

  let html = '';
  for(const [robot, rows] of toRender) {
    const label = robot === 'cell' ? 'Cell (no robot)' : robot;
    html += `
      <div class="robot-section">
        <div class="robot-header">
          <span class="robot-name">${label}</span>
          <span class="robot-count">${rows.length}</span>
        </div>
        <div class="cards">
    `;
    for(const row of rows) {
      html += `
        <div class="card">
          <div class="card-header">
            <span class="dot ${dotClass(row.value)}"></span>
            <span class="card-tag" title="${row.tag}">${row.tag}</span>
          </div>
          <div class="card-val">${renderValue(row.value)}</div>
          <div class="card-footer">
            <span class="card-time">${formatTime(row.datestamp)}</span>
            <span class="card-uid">uid ${row.tagSetupUID}</span>
          </div>
        </div>
      `;
    }
    html += '</div></div>';
  }

  document.getElementById('content').innerHTML = html;
}

//torque data rendering
function renderTorqueChart(robot, rows) {
  if(!rows.length) 
    return '';

  const byTag = {};
  for(const r of rows) {
    (byTag[r.tag] = byTag[r.tag] || []).push(r);
  }
  const tags = Object.keys(byTag).sort((a, b) => {
    const ai = parseInt(parseTorqueAxis(a));
    const bi = parseInt(parseTorqueAxis(b));
    if(isNaN(ai) || isNaN(bi)) 
      return a.localeCompare(b);
    return ai - bi;
  });

  let xMin = Infinity, xMax = -Infinity, yMax = -Infinity;
  for(const r of rows) {
    const t = new Date(r.datestamp).getTime();
    const v = parseFloat(r.value);
    if(isNaN(t) || isNaN(v)) continue;
    if(t < xMin) 
      xMin = t;
    if(t > xMax) 
      xMax = t;
    if(v > yMax) 
      yMax = v;
  }

  if(xMin === xMax) { 
      xMin -= 1000; 
      xMax += 1000; 
  }
  if(yMax <= 0) 
    yMax = 1;

  const yMin = 0;

  // viewBox geometry
  const W = 800, H = 280;
  const padL = 50, padR = 16, padT = 12, padB = 32;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xScale = t => padL + ((t - xMin) / (xMax - xMin)) * innerW;
  const yScale = v => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  let maxRedline = 0;
  for(const tag of tags) {
    const rl = torqueRedlines[tag];
    if(rl && rl > maxRedline) 
      maxRedline = rl;
  }
  if(maxRedline > yMax)
    yMax = maxRedline * 1.05;

  const redline = maxRedline > 0 ? `
    <line x1="${padL}" y1="${yScale(maxRedline).toFixed(1)}"
          x2="${W - padR}" y2="${yScale(maxRedline).toFixed(1)}"
          class="chart-redline" />
      Redline ${maxRedline.toFixed(0)}
    </text>
  ` : '';

  // paths
  const paths = tags.map((tag, i) => {
    const pts = byTag[tag];
    let d = '';
    for(let j = 0; j < pts.length; j++) {
      const t = new Date(pts[j].datestamp).getTime();
      const v = parseFloat(pts[j].value);
      if(isNaN(t) || isNaN(v)) 
        continue;
      const x = xScale(t);
      const y = yScale(v);
      d += (d ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    }
    return `<path d="${d}" class="chart-line chart-color-${(i % 6) + 1}" />`;
  }).join('');

  // y ticks + grid
  let yGrid = '';
  const yTicks = 5;
  for(let i = 0; i <= yTicks; i++) {
    const val = yMin + (yMax - yMin) * (i / yTicks);
    const y = yScale(val);
    yGrid += `
      <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" class="chart-grid" />
      <text x="${padL - 6}" y="${y + 3}" class="chart-tick" text-anchor="end">${val.toFixed(1)}</text>
    `;
  }

  // x ticks
  let xGrid = '';
  const xTicks = 5;
  const spanMs = xMax - xMin;
  const sameDay = new Date(xMin).toDateString() === new Date(xMax).toDateString();
  const shortSpan = spanMs < 5 * 60 * 1000;
  for(let i = 0; i <= xTicks; i++) {
    const t = xMin + spanMs * (i / xTicks);
    const x = xScale(t);
    const d = new Date(t);
    const label = shortSpan
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : sameDay
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    xGrid += `<text x="${x}" y="${H - padB + 16}" class="chart-tick" text-anchor="middle">${label}</text>`;
  }

  // legend
  const legend = tags.map((tag, i) => {
    const axis = parseTorqueAxis(tag);
    return `
      <span class="chart-legend-item">
        <span class="chart-legend-swatch chart-color-${(i % 6) + 1}"></span>
        <span class="chart-legend-label">M${axis}</span>
      </span>
    `;
  }).join('');

  const label = robot === 'cell' ? 'Cell (no robot)' : robot;

  return `
    <div class="chart-container">
      <div class="chart-header">
        <span class="robot-name">${label}</span>
        <span class="robot-count">${tags.length} motors · ${rows.length} pts</span>
      </div>
      <div class="chart-legend">${legend}</div>
      <svg viewBox="0 0 ${W} ${H}" class="torque-chart">
        ${yGrid}
        ${xGrid}
        ${redline}
        ${paths}
      </svg>
    </div>
  `;
}

function renderTorqueContent(filter) {
  const toRender = filter === 'all'
    ? Object.entries(torqueGroups).sort(([a], [b]) =>
        a === 'cell' ? 1 : b === 'cell' ? -1 : a.localeCompare(b))
    : [[filter, torqueGroups[filter] || []]];

  let html = '';
  for(const [robot, rows] of toRender) {
    if(!rows.length) 
      continue;
    html += renderTorqueChart(robot, rows);
  }

  if(!html) 
    html = '<div class="empty">No torque data in this range</div>';

  document.getElementById('torque-content').innerHTML = html;
}

function renderPositionChart(points) {
  const xMin = -1000, xMax = 1000;
  const yMin = -700,  yMax = 700;

  const W = 1000, H = 700;
  const padL = 70, padR = 30, padT = 30, padB = 60;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xScale = x => padL + ((x - xMin) / (xMax - xMin)) * innerW;
  const yScale = y => padT + (1 - (y - yMin) / (yMax - yMin)) * innerH;

  const fsTick = Math.round(H * 0.022); 
  const fsLabel = Math.round(H * 0.028); 
  const fsName = Math.round(H * 0.030); 
  const fsCoord = Math.round(H * 0.024); 
  const dotR = Math.round(H * 0.012); 

  // Grid + ticks
  let yGrid = '';
  for (let i = 0; i <= 7; i++) {
    const val = yMin + (yMax - yMin) * (i / 7);
    const y = yScale(val);
    yGrid += `
      <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" class="chart-grid" />
      <text x="${padL - 8}" y="${y + fsTick / 3}" class="chart-tick"
            text-anchor="end" font-size="${fsTick }">${val.toFixed(0)}</text>
    `;
  }

  let xGrid = '';
  for (let i = 0; i <= 10; i++) {
    const val = xMin + (xMax - xMin) * (i / 10);
    const x = xScale(val);
    xGrid += `
      <line x1="${x}" y1="${padT}" x2="${x}" y2="${H - padB}" class="chart-grid" />
      <text x="${x}" y="${H - padB + fsTick + 6}" class="chart-tick"
            text-anchor="middle" font-size="${fsTick}">${val.toFixed(0)}</text>
    `;
  }

  const axisLabels = `
    <text x="${W / 2}" y="${H - 10}" class="chart-axis-label"
          text-anchor="middle" font-size="${fsLabel}">X</text>
    <text x="20" y="${H / 2}" class="chart-axis-label"
          text-anchor="middle" font-size="${fsLabel}"
          transform="rotate(-90 20 ${H / 2})">Y</text>
  `;

  const sorted = [...points].sort((a, b) => a.robot.localeCompare(b.robot));

  const dots = sorted.map((p, i) => {
    const x = xScale(p.X);
    const y = yScale(p.Y);
    const label = p.robot === 'cell' ? 'Cell' : p.robot;

    const m = p.robot.match(/Rob(\d+)/);
    const colorIdx = m ? ((parseInt(m[1]) - 1) % 6) + 1 : ((i % 6) + 1);
    const cls = `chart-color-${colorIdx}`;

    const zStr = isNaN(p.Z) ? '' : ` · Z ${p.Z.toFixed(1)}`;
    return `
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${dotR}"
              class="position-dot ${cls}" />
      <text x="${x.toFixed(1)}" y="${(y - dotR - 6).toFixed(1)}"
            class="position-label ${cls}" text-anchor="middle"
            font-size="${fsName}">${label}</text>
      <text x="${x.toFixed(1)}" y="${(y + dotR + fsCoord + 2).toFixed(1)}"
            class="position-coord" text-anchor="middle"
            font-size="${fsCoord}">${p.X.toFixed(1)}, ${p.Y.toFixed(1)}${zStr}</text>
    `;
  }).join('');

  return `
    <div class="chart-container position-chart-container">
      <div class="chart-header">
        <span class="robot-name">Current positions</span>
        <span class="robot-count">${points.length} robots</span>
      </div>
      <svg viewBox="0 0 ${W} ${H}" class="position-chart"
           preserveAspectRatio="xMidYMid meet">
        ${yGrid}
        ${xGrid}
        ${axisLabels}
        ${dots}
      </svg>
    </div>
  `;
}

function renderPositionContent(filter) {
  const entries = filter === 'all'
    ? Object.entries(positionGroups)
    : positionGroups[filter] ? [[filter, positionGroups[filter]]] : [];

  const points = entries
    .map(([robot, p]) => ({ robot, X: p.X, Y: p.Y, Z: p.Z, datestamp: p.datestamp }))
    .filter(p => !isNaN(p.X) && !isNaN(p.Y));

  if(!points.length) {
    document.getElementById('position-content').innerHTML = '<div class="empty">No position data</div>';
    return;
  }

  document.getElementById('position-content').innerHTML = renderPositionChart(points);
}

// conn status
function setConnStatus(state, label) {
  document.getElementById('conn-dot').className = 'dot ' + state;
  document.getElementById('conn-label').textContent = label;
}

function showError(msg) {
  const bar = document.getElementById('error-bar');
  bar.textContent = msg;
  bar.style.display = 'block';
}

function clearError() {
  document.getElementById('error-bar').style.display = 'none';
}

// fetching
function getBase() {
  return document.getElementById('api-url').value.replace(/\/$/, '');
}

async function fetchStatus() {
  setConnStatus('pulse', 'Fetching…');
  clearError();

  try {
    const res = await fetch(`${getBase()}/status`);
    if(!res.ok) 
      throw new Error(`/status HTTP ${res.status}`);

    statusData = await res.json();
    statusGroups = groupByRobot(statusData);
    populateFilter();

    const filter = document.getElementById('robot-filter').value;
    renderStatusContent(filter);

    setConnStatus('ok', `Updated ${new Date().toLocaleTimeString()}`);
  } catch(e) {
    setConnStatus('err', 'Error');
    showError(`Failed to fetch: ${e.message}`);
  }
}

async function fetchTorque() {
  setConnStatus('pulse', 'Fetching…');
  clearError();

  const params = new URLSearchParams();
  const from = getFromParam();
  const until = getUntilParam();
  if(from)  
    params.set('from',  from);
  if(until) 
    params.set('until', until);
  const url = `${getBase()}/torque?${params.toString()}`;

  try {
    const [res] = await Promise.all([
      fetch(url),
      fetchTorqueRedlines(),
    ]);
    if(!res.ok) 
      throw new Error(`/torque HTTP ${res.status}`);

    torqueData = await res.json();
    torqueGroups = groupByRobot(torqueData);
    populateFilter();

    const filter = document.getElementById('robot-filter').value;
    renderTorqueContent(filter);

    setConnStatus('ok', `Updated ${new Date().toLocaleTimeString()}`);
  } catch (e) {
    setConnStatus('err', 'Error');
    showError(`Failed to fetch: ${e.message}`);
  }
}

async function fetchTorqueRedlines() {
  try {
    const res = await fetch(`${getBase()}/torque/redline`);
    if(!res.ok) 
      return;
    const rows = await res.json();
    torqueRedlines = {};
    for(const r of rows) {
      torqueRedlines[r.tag] = parseFloat(r.redline);
    }
  } catch (e) {
    console.warn('Failed to fetch torque redlines:', e.message);
  }
}

async function fetchPosition() {
  setConnStatus('pulse', 'Fetching…');
  clearError();

  try {
    const res = await fetch(`${getBase()}/position`);
    if(!res.ok) 
      throw new Error(`/position HTTP ${res.status}`);

    positionData = await res.json();
    positionGroups = groupPositions(positionData);
    populateFilter();

    const filter = document.getElementById('robot-filter').value;
    renderPositionContent(filter);

    setConnStatus('ok', `Updated ${new Date().toLocaleTimeString()}`);
  } catch(e) {
    setConnStatus('err', 'Error');
    showError(`Failed to fetch: ${e.message}`);
  }
}

async function refresh(manual = false) {
  if(activeTab === 'status')   
    await fetchStatus();
  else if(activeTab === 'torque') {
    const from  = document.getElementById('from-date').value;
    const until = document.getElementById('to-date').value;
    if(!manual && from && until) 
      return;
    await fetchTorque();
  }
  else if(activeTab === 'position')
    await fetchPosition();
}

function scheduleRefresh() {
  clearInterval(timer);
  const interval = parseInt(document.getElementById('auto-refresh').value, 10);
  if(interval > 0) 
    timer = setInterval(refresh, interval * 1000);
}


//tab switch
function switchTab(tab) {
  activeTab = tab;

  document.querySelectorAll('.tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  document.getElementById('tab-status').style.display = tab === 'status' ? '' : 'none';
  document.getElementById('tab-torque').style.display = tab === 'torque' ? '' : 'none';
  document.getElementById('tab-position').style.display = tab === 'position' ? '' : 'none';

  document.getElementById('from-group').style.display = tab === 'torque' ? 'inline-flex' : 'none';

  refresh();
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

document.getElementById('robot-filter').addEventListener('change', e => {
  if(activeTab === 'status') 
    renderStatusContent(e.target.value);
  else if(activeTab === 'torque') 
    renderTorqueContent(e.target.value);
  else if(activeTab === 'position') 
    renderPositionContent(e.target.value);
});

document.getElementById('from-date').addEventListener('change', () => {
  if(activeTab === 'torque') 
    fetchTorque();
});

document.getElementById('to-date').addEventListener('change', () => {
  if(activeTab === 'torque') 
    fetchTorque();
});

document.getElementById('refresh-btn').addEventListener('click', () => refresh(true));
document.getElementById('auto-refresh').addEventListener('change', scheduleRefresh);
document.getElementById('api-url').addEventListener('change', refresh);

switchTab('status');
scheduleRefresh();