const http = require('http');
const https = require('https');

const JIRA_DOMAIN = 'melity.atlassian.net';
const EMAIL = 'aniket.batwal@sphereglobal.com';
const API_TOKEN = 'ATATT3xFfGF0vEEnd7Fxw1LjDOeTbsL0Ex-EJ-9r9HyDNWywWcIkkj3w5VY8YSNouxNPHAq0b6Nc8Q8EnEuxskh5Vc_mXZcF9qpkMURO2q_wDp6h1HV2Tr-pFkc6bo-8v1ymx5NCUQcqmyOCg2b0-2ByhIWuFP_-nHn7nCV051NRQ2AJnpugkMQ=11385913';

const PORT = 3000;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/' || req.url === '/report') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getHTML());
    return;
  }

  if (req.url === '/api/users') {
    proxyUsersRequest((err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
      }
    });
    return;
  }

  if (req.url === '/api/jira') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { jql, fields } = JSON.parse(body || '{}');
      proxyJiraRequest(jql, fields, (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(data);
        }
      });
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

function proxyUsersRequest(callback) {
  const credentials = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString('base64');
  const options = {
    hostname: JIRA_DOMAIN, port: 443,
    path: '/rest/api/3/user/assignable/search?project=HY&maxResults=100',
    method: 'GET',
    headers: { 'Authorization': `Basic ${credentials}`, 'Accept': 'application/json' }
  };
  const req = https.request(options, (res) => { let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => callback(null, data)); });
  req.on('error', callback);
  req.end();
}

function proxyJiraRequest(jql, fields, callback) {
  const credentials = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString('base64');
  const postData = JSON.stringify({ jql, maxResults: 100, fields: fields || ['key', 'summary', 'worklog'] });
  const options = {
    hostname: JIRA_DOMAIN, port: 443, path: '/rest/api/3/search/jql', method: 'POST',
    headers: { 'Authorization': `Basic ${credentials}`, 'Accept': 'application/json', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
  };
  const req = https.request(options, (res) => { let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => callback(null, data)); });
  req.on('error', callback);
  req.write(postData);
  req.end();
}

function getHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HY Project — Hours Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --primary: #0052CC;
      --primary-light: #2684FF;
      --primary-dark: #003D99;
      --accent: #00B8D9;
      --success: #36B37E;
      --warning: #FFAB00;
      --danger: #FF5630;
      --bg-dark: #0D1117;
      --bg-card: #161B22;
      --bg-card-hover: #1C2128;
      --border: #30363D;
      --text-primary: #E6EDF3;
      --text-secondary: #8B949E;
      --text-muted: #6E7681;
    }

    @media print {
      body { background: white; }
      .no-print { display: none !important; }
      .card { break-inside: avoid; border: 1px solid #ddd; }
      @page { size: landscape; margin: 1cm; }
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-dark);
      color: var(--text-primary);
      min-height: 100vh;
      line-height: 1.5;
    }

    .container {
      max-width: 1600px;
      margin: 0 auto;
      padding: 24px 32px;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
      gap: 16px;
    }

    .header-left { display: flex; align-items: center; gap: 16px; }
    .logo {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      color: #fff;
    }
    .header h1 { font-size: 24px; font-weight: 600; color: var(--text-primary); }
    .header .subtitle { font-size: 14px; color: var(--text-secondary); }
    .header-right { text-align: right; }
    .company-badge {
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    .company-badge strong { color: var(--text-primary); }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 24px;
      background: var(--bg-card);
      padding: 4px;
      border-radius: 12px;
      width: fit-content;
      border: 1px solid var(--border);
    }
    .tab {
      padding: 10px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
      transition: all 0.2s;
      border: none;
      background: transparent;
    }
    .tab:hover { color: var(--text-primary); background: var(--bg-card-hover); }
    .tab.active { background: var(--primary); color: #fff; }

    /* Controls */
    .controls {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 24px;
      align-items: center;
    }
    .control-group { display: flex; align-items: center; gap: 8px; }
    label { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
    input, select {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 14px;
      color: var(--text-primary);
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus, select:focus { border-color: var(--primary); }
    button {
      background: var(--primary);
      border: none;
      border-radius: 8px;
      padding: 10px 24px;
      color: #fff;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.2s;
    }
    button:hover { background: var(--primary-light); }

    /* Grid Layout */
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }

    @media (max-width: 1200px) {
      .grid-4 { grid-template-columns: repeat(2, 1fr); }
      .grid-3 { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .grid-4, .grid-3, .grid-2 { grid-template-columns: 1fr; }
    }

    /* Cards */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .card-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .card-title::before {
      content: '';
      width: 4px;
      height: 18px;
      background: var(--primary);
      border-radius: 2px;
    }

    /* Stats Cards */
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }
    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--primary), var(--accent));
    }
    .stat-value {
      font-size: 36px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 4px;
    }
    .stat-label {
      font-size: 13px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }
    .stat-icon {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(0, 82, 204, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    /* Tables */
    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left;
      padding: 14px 16px;
      background: var(--bg-dark);
      color: var(--text-secondary);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      border-bottom: 1px solid var(--border);
    }
    th:first-child { border-radius: 8px 0 0 0; }
    th:last-child { border-radius: 0 8px 0 0; text-align: right; }
    td { padding: 16px; border-bottom: 1px solid var(--border); font-size: 14px; }
    td:last-child { text-align: right; }
    tr:hover td { background: var(--bg-card-hover); }
    tr:last-child td:first-child { border-radius: 0 0 0 8px; }
    tr:last-child td:last-child { border-radius: 0 0 8px 0; }

    .user-cell { display: flex; align-items: center; gap: 12px; }
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 12px;
      color: #fff;
    }
    .time-cell { font-weight: 600; color: var(--accent); }
    .summary-row td { background: rgba(0, 82, 204, 0.1); font-weight: 600; border-bottom: none; }

    /* Charts */
    .chart-container { position: relative; height: 300px; }
    .chart-container.pie { height: 280px; }

    /* Progress Bar */
    .progress-bar {
      height: 8px;
      background: var(--bg-dark);
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary), var(--accent));
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    /* Daily Cards */
    .day-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: var(--bg-dark);
      border-radius: 12px;
      margin-bottom: 10px;
      transition: transform 0.2s;
    }
    .day-card:hover { transform: translateX(4px); }
    .day-date { font-weight: 600; color: var(--text-primary); }
    .day-stats { display: flex; gap: 24px; align-items: center; }
    .day-hours { font-weight: 700; color: var(--accent); font-size: 16px; }
    .day-users { color: var(--text-secondary); font-size: 13px; }

    /* Status badges */
    .badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-success { background: rgba(54, 179, 126, 0.15); color: var(--success); }
    .badge-warning { background: rgba(255, 171, 0, 0.15); color: var(--warning); }
    .badge-info { background: rgba(0, 184, 217, 0.15); color: var(--accent); }

    .loading, .error, .empty { text-align: center; padding: 60px; color: var(--text-secondary); }
    .error { background: rgba(255, 86, 48, 0.1); border: 1px solid rgba(255, 86, 48, 0.3); border-radius: 12px; color: var(--danger); display: none; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* Team performance bars */
    .team-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }
    .team-bar-info { min-width: 150px; }
    .team-bar-name { font-weight: 500; font-size: 14px; }
    .team-bar-hours { font-size: 12px; color: var(--text-secondary); }
    .team-bar-track { flex: 1; height: 24px; background: var(--bg-dark); border-radius: 6px; overflow: hidden; position: relative; }
    .team-bar-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--accent)); border-radius: 6px; display: flex; align-items: center; justify-content: flex-end; padding-right: 10px; font-size: 12px; font-weight: 600; color: #fff; min-width: fit-content; transition: width 0.5s ease; }

    /* Footer */
    .footer {
      text-align: center;
      padding: 24px;
      color: var(--text-muted);
      font-size: 12px;
      border-top: 1px solid var(--border);
      margin-top: 32px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header no-print">
      <div class="header-left">
        <div class="logo">HY</div>
        <div>
          <h1>HY Project — Hours Dashboard</h1>
          <p class="subtitle">Worklog Summary & Team Analytics</p>
        </div>
      </div>
      <div class="header-right">
        <div class="company-badge">Sphere<span style="color: var(--primary)">Global</span></div>
        <div class="company-badge" id="reportPeriod" style="margin-top: 8px;">Loading...</div>
      </div>
    </div>

    <!-- Global User Filter -->
    <div class="controls no-print" style="margin-bottom: 16px;">
      <div class="control-group">
        <label>Team Member:</label>
        <select id="globalUserFilter" onchange="onUserFilterChange()" style="min-width: 200px;">
          <option value="">All Users</option>
        </select>
      </div>
      <span id="userFilterBadge" style="display:none;" class="badge badge-info"></span>
    </div>

    <!-- Tabs -->
    <div class="tabs no-print">
      <button class="tab active" data-tab="daily">Daily</button>
      <button class="tab" data-tab="7days">Last 7 Days</button>
      <button class="tab" data-tab="15days">Last 15 Days</button>
      <button class="tab" data-tab="sprint">Custom Range</button>
    </div>

    <!-- Tab Contents -->
    <!-- DAILY TAB -->
    <div id="tab-daily" class="tab-content active">
      <div class="controls">
        <div class="control-group">
          <label>Date:</label>
          <input type="date" id="dailyDate">
        </div>
        <button onclick="loadDaily()">Load Report</button>
      </div>

      <div class="grid-4" id="dailyStats">
        <div class="stat-card"><div class="stat-value" id="dailyTotal">—</div><div class="stat-label">Total Hours</div><div class="stat-icon">⏱</div></div>
        <div class="stat-card"><div class="stat-value" id="dailyIssues">—</div><div class="stat-label">Issues Logged</div><div class="stat-icon">📋</div></div>
        <div class="stat-card"><div class="stat-value" id="dailyUsers">—</div><div class="stat-label">Team Members</div><div class="stat-icon">👥</div></div>
        <div class="stat-card"><div class="stat-value" id="dailyAvg">—</div><div class="stat-label">Avg Hours/Person</div><div class="stat-icon">📊</div></div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Team Hours Distribution</div></div>
          <div class="chart-container"><canvas id="dailyPieChart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Hours by Team Member</div></div>
          <div id="dailyTeamBars"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">Detailed Worklogs</div>
          <span class="badge badge-info" id="dailyWorklogCount">0 entries</span>
        </div>
        <table>
          <thead><tr><th>Team Member</th><th>Issue</th><th>Description</th><th>Time Spent</th></tr></thead>
          <tbody id="dailyDetail"></tbody>
        </table>
      </div>
    </div>

    <!-- 7 DAYS TAB -->
    <div id="tab-7days" class="tab-content">
      <div class="controls">
        <div class="control-group">
          <label>End Date:</label>
          <input type="date" id="days7End">
        </div>
        <button onclick="loadDateRange(7)">Load 7 Days</button>
      </div>

      <div class="grid-4">
        <div class="stat-card"><div class="stat-value" id="range7Total">—</div><div class="stat-label">Total Hours</div><div class="stat-icon">⏱</div></div>
        <div class="stat-card"><div class="stat-value" id="range7Issues">—</div><div class="stat-label">Issues Logged</div><div class="stat-icon">📋</div></div>
        <div class="stat-card"><div class="stat-value" id="range7Users">—</div><div class="stat-label">Active Members</div><div class="stat-icon">👥</div></div>
        <div class="stat-card"><div class="stat-value" id="range7Days">—</div><div class="stat-label">Days Tracked</div><div class="stat-icon">📅</div></div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Daily Hours Trend</div></div>
          <div class="chart-container"><canvas id="dailyTrendChart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Team Contribution (%)</div></div>
          <div class="chart-container pie"><canvas id="teamPieChart7"></canvas></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Daily Breakdown</div></div>
          <div id="range7Daily" style="max-height: 400px; overflow-y: auto;"></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Team Performance</div></div>
          <div id="range7TeamBars" style="padding: 10px 0;"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">Summary by Team Member</div>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Team Member</th><th>Issues Worked</th><th>Hours Logged</th></tr></thead>
          <tbody id="range7Summary"></tbody>
        </table>
      </div>
    </div>

    <!-- 15 DAYS TAB -->
    <div id="tab-15days" class="tab-content">
      <div class="controls">
        <div class="control-group">
          <label>End Date:</label>
          <input type="date" id="days15End">
        </div>
        <button onclick="loadDateRange(15)">Load 15 Days</button>
      </div>

      <div class="grid-4">
        <div class="stat-card"><div class="stat-value" id="range15Total">—</div><div class="stat-label">Total Hours</div><div class="stat-icon">⏱</div></div>
        <div class="stat-card"><div class="stat-value" id="range15Issues">—</div><div class="stat-label">Issues Logged</div><div class="stat-icon">📋</div></div>
        <div class="stat-card"><div class="stat-value" id="range15Users">—</div><div class="stat-label">Active Members</div><div class="stat-icon">👥</div></div>
        <div class="stat-card"><div class="stat-value" id="range15Days">—</div><div class="stat-label">Days Tracked</div><div class="stat-icon">📅</div></div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Daily Hours Trend</div></div>
          <div class="chart-container"><canvas id="dailyTrendChart15"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Team Contribution (%)</div></div>
          <div class="chart-container pie"><canvas id="teamPieChart15"></canvas></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Daily Breakdown</div></div>
          <div id="range15Daily" style="max-height: 400px; overflow-y: auto;"></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Team Performance</div></div>
          <div id="range15TeamBars" style="padding: 10px 0;"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">Summary by Team Member</div>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Team Member</th><th>Issues Worked</th><th>Hours Logged</th></tr></thead>
          <tbody id="range15Summary"></tbody>
        </table>
      </div>
    </div>

    <!-- SPRINT/CUSTOM RANGE TAB -->
    <div id="tab-sprint" class="tab-content">
      <div class="controls">
        <div class="control-group">
          <label>Range Name:</label>
          <input type="text" id="sprintName" placeholder="e.g., Sprint 23" style="width: 140px;">
        </div>
        <div class="control-group">
          <label>Start:</label>
          <input type="date" id="sprintStart">
        </div>
        <div class="control-group">
          <label>End:</label>
          <input type="date" id="sprintEnd">
        </div>
        <button onclick="loadCustomRange()">Load Range</button>
      </div>

      <div class="grid-4">
        <div class="stat-card"><div class="stat-value" id="sprintTotal">—</div><div class="stat-label">Total Hours</div><div class="stat-icon">⏱</div></div>
        <div class="stat-card"><div class="stat-value" id="sprintIssues">—</div><div class="stat-label">Issues Logged</div><div class="stat-icon">📋</div></div>
        <div class="stat-card"><div class="stat-value" id="sprintUsers">—</div><div class="stat-label">Active Members</div><div class="stat-icon">👥</div></div>
        <div class="stat-card"><div class="stat-value" id="sprintDays">—</div><div class="stat-label">Days in Range</div><div class="stat-icon">📅</div></div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Hours Trend</div></div>
          <div class="chart-container"><canvas id="sprintTrendChart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Team Contribution</div></div>
          <div class="chart-container pie"><canvas id="sprintPieChart"></canvas></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">Detailed Worklogs</div>
          <span class="badge badge-info" id="sprintWorklogCount">0 entries</span>
        </div>
        <table>
          <thead><tr><th>Team Member</th><th>Issue</th><th>Description</th><th>Time Spent</th><th>Date</th></tr></thead>
          <tbody id="sprintDetail"></tbody>
        </table>
      </div>
    </div>

    <div id="loading" class="loading" style="display: none;">Loading report data...</div>
    <div id="error" class="error"></div>

    <div class="footer">
      Generated by SphereGlobal Analytics | HY Project Hours Dashboard
    </div>
  </div>

  <script>
    const PROJECT = 'HY';
    let dailyPieChart, dailyTrendChart, teamPieChart7, teamPieChart15, teamPieChartSprint, sprintTrendChart;
    let lastDailyData = null, lastDailyDate = null;
    let lastRange7Data = null, lastRange7Start = null, lastRange7End = null;
    let lastRange15Data = null, lastRange15Start = null, lastRange15End = null;
    let lastCustomData = null, lastCustomStart = null, lastCustomEnd = null, lastCustomName = null;

    // Chart defaults
    Chart.defaults.color = '#8B949E';
    Chart.defaults.borderColor = '#30363D';
    Chart.defaults.font.family = "'Inter', sans-serif";

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
    });

    function formatDateDB(d) { return d.toISOString().split('T')[0]; }
    function formatDateDisplay(d) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    function formatHours(s) { const h = Math.floor(s/3600), m = Math.floor((s%3600)/60); return h + 'h ' + m.toString().padStart(2,'0') + 'm'; }
    function formatHoursShort(s) { const h = Math.floor(s/3600), m = Math.floor((s%3600)/60); return h + '.' + Math.round(m/60*100).toString().padStart(2,'0') + 'h'; }
    function getInitials(name) { return name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase(); }

    const today = new Date();
    document.getElementById('dailyDate').value = formatDateDB(today);
    document.getElementById('days7End').value = formatDateDB(today);
    document.getElementById('days15End').value = formatDateDB(today);

    const sprintStartDefault = new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000);
    const sprintEndDefault = new Date(today.getTime());
    document.getElementById('sprintStart').value = formatDateDB(sprintStartDefault);
    document.getElementById('sprintEnd').value = formatDateDB(sprintEndDefault);

    async function fetchUsers() {
      try {
        const res = await fetch('/api/users');
        const users = await res.json();
        const select = document.getElementById('globalUserFilter');
        if (Array.isArray(users)) {
          users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.accountId;        // accountId used in JQL filter
            opt.textContent = u.displayName;
            select.appendChild(opt);
          });
        }
      } catch (e) { /* silent — users dropdown is optional */ }
    }

    function getSelectedAccountId() {
      return document.getElementById('globalUserFilter').value;  // accountId or ''
    }

    function getSelectedDisplayName() {
      const select = document.getElementById('globalUserFilter');
      return select.options[select.selectedIndex].textContent;
    }

    function buildAuthorFilter() {
      const accountId = getSelectedAccountId();
      return accountId ? " AND worklogAuthor = '" + accountId + "'" : '';
    }

    function onUserFilterChange() {
      const accountId = getSelectedAccountId();
      const badge = document.getElementById('userFilterBadge');
      if (accountId) {
        badge.style.display = 'inline';
        badge.textContent = 'Filtered: ' + getSelectedDisplayName();
      } else {
        badge.style.display = 'none';
      }
      // Re-fetch with new JQL so server-side author filter is applied
      const activeTab = document.querySelector('.tab.active').dataset.tab;
      if (activeTab === 'daily') loadDaily();
      else if (activeTab === '7days') loadDateRange(7);
      else if (activeTab === '15days') loadDateRange(15);
      else if (activeTab === 'sprint') loadCustomRange();
    }

    async function fetchJira(jql, fields) {
      const res = await fetch('/api/jira', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jql, fields: fields || ['key', 'summary', 'worklog'] })
      });
      return res.json();
    }

    let charts = {};

    function destroyChart(id) { if (charts[id]) { charts[id].destroy(); charts[id] = null; } }

    function createPieChart(id, labels, data) {
      destroyChart(id);
      const ctx = document.getElementById(id).getContext('2d');
      charts[id] = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: ['#0052CC', '#00B8D9', '#36B37E', '#FFAB00', '#FF5630', '#6554C0', '#8777D9', '#172B4D'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { padding: 20, usePointStyle: true, pointStyle: 'circle' } },
            tooltip: { callbacks: { label: (ctx) => { const h = Math.floor(ctx.raw); const m = Math.round((ctx.raw % 1) * 60); return ' ' + ctx.label + ': ' + h + 'h ' + (m < 10 ? '0' : '') + m + 'm'; } } }
          },
          cutout: '60%'
        }
      });
    }

    function createBarChart(id, labels, data, label) {
      destroyChart(id);
      const ctx = document.getElementById(id).getContext('2d');
      charts[id] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: label,
            data: data,
            backgroundColor: 'rgba(0, 82, 204, 0.8)',
            borderColor: '#0052CC',
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => { const secs = ctx.raw * 3600; const h = Math.floor(secs / 3600); const m = Math.round((secs % 3600) / 60); return ' ' + ctx.label + ': ' + h + 'h ' + (m < 10 ? '0' : '') + m + 'm'; } } }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: '#30363D' }, ticks: { callback: (v) => v + 'h' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    function createLineChart(id, labels, data) {
      destroyChart(id);
      const ctx = document.getElementById(id).getContext('2d');
      charts[id] = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Hours',
            data: data,
            borderColor: '#00B8D9',
            backgroundColor: 'rgba(0, 184, 217, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#00B8D9',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => { const secs = ctx.raw * 3600; const h = Math.floor(secs / 3600); const m = Math.round((secs % 3600) / 60); return ' ' + ctx.label + ': ' + h + 'h ' + (m < 10 ? '0' : '') + m + 'm'; } } }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: '#30363D' }, ticks: { callback: (v) => v + 'h' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    function extractWorklogs(issues, date, startDate, endDate) {
      const worklogs = [];
      issues.forEach(issue => {
        if (issue.fields.worklog && issue.fields.worklog.worklogs) {
          issue.fields.worklog.worklogs.forEach(wl => {
            if (wl.started) {
              // For daily queries, Jira has already filtered by worklogDate so we accept all returned worklogs
              // For range queries, we need to filter by the actual started date
              if (startDate && endDate) {
                const wlDate = wl.started.split('T')[0];
                if (wlDate >= startDate && wlDate <= endDate) worklogs.push({ user: wl.author.displayName, issue: issue.key, summary: issue.fields.summary, timeSpent: wl.timeSpent, timeSpentSeconds: wl.timeSpentSeconds, started: wl.started });
              } else {
                worklogs.push({ user: wl.author.displayName, issue: issue.key, summary: issue.fields.summary, timeSpent: wl.timeSpent, timeSpentSeconds: wl.timeSpentSeconds, started: wl.started });
              }
            }
          });
        }
      });
      return worklogs;
    }

    // DAILY TAB
    async function loadDaily() {
      const date = document.getElementById('dailyDate').value;
      if (!date) return;
      document.getElementById('reportPeriod').textContent = formatDateDisplay(date);
      try {
        const jql = "project = '" + PROJECT + "' AND worklogDate = '" + date + "'" + buildAuthorFilter();
        const data = await fetchJira(jql);
        if (data.error) throw new Error(data.error);
        lastDailyData = data; lastDailyDate = date;
        renderDaily(data, date);
      } catch (err) { showError(err.message); }
    }

    function renderDaily(data, date) {
      const issues = data.issues || [];
      const worklogs = extractWorklogs(issues, date);
      const totalSec = worklogs.reduce((s,w) => s + w.timeSpentSeconds, 0);
      const users = [...new Set(worklogs.map(w=>w.user))];
      const avgSec = users.length ? totalSec / users.length : 0;

      document.getElementById('dailyTotal').textContent = formatHoursShort(totalSec);
      document.getElementById('dailyIssues').textContent = issues.length;
      document.getElementById('dailyUsers').textContent = users.length;
      document.getElementById('dailyAvg').textContent = formatHoursShort(avgSec);
      document.getElementById('dailyWorklogCount').textContent = worklogs.length + ' entries';

      const userStats = {};
      worklogs.forEach(wl => { if (!userStats[wl.user]) userStats[wl.user] = 0; userStats[wl.user] += wl.timeSpentSeconds; });

      const sortedUsers = Object.keys(userStats).sort((a,b) => userStats[b]-userStats[a]);
      createPieChart('dailyPieChart', sortedUsers, sortedUsers.map(u => userStats[u]/3600));
      renderTeamBars('dailyTeamBars', sortedUsers, sortedUsers.map(u => userStats[u]), totalSec);

      const tbody = document.getElementById('dailyDetail');
      tbody.innerHTML = '';
      worklogs.forEach(wl => {
        tbody.innerHTML += '<tr><td><div class="user-cell"><div class="avatar">'+getInitials(wl.user)+'</div>'+wl.user+'</div></td><td><strong>'+wl.issue+'</strong></td><td style="color:#71717a;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+wl.summary+'</td><td class="time-cell">'+wl.timeSpent+'</td></tr>';
      });
      if (worklogs.length === 0) tbody.innerHTML = '<tr><td colspan="4" class="empty">No worklogs found for this date.</td></tr>';
    }

    // DATE RANGE (7/15 DAYS)
    async function loadDateRange(days) {
      const endDateStr = document.getElementById('days' + days + 'End').value;
      if (!endDateStr) return;
      const endDate = new Date(endDateStr);
      const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
      const startStr = formatDateDB(startDate);
      const endStr = endDateStr;
      document.getElementById('reportPeriod').textContent = formatDateDisplay(startStr) + ' - ' + formatDateDisplay(endStr);

      try {
        const jql = "project = '" + PROJECT + "' AND worklogDate >= '" + startStr + "' AND worklogDate <= '" + endStr + "'" + buildAuthorFilter();
        const data = await fetchJira(jql);
        if (data.error) throw new Error(data.error);
        if (days === 7) { lastRange7Data = data; lastRange7Start = startStr; lastRange7End = endStr; }
        else { lastRange15Data = data; lastRange15Start = startStr; lastRange15End = endStr; }
        renderDateRange(data, startStr, endStr, days);
      } catch (err) { showError(err.message); }
    }

    function renderDateRange(data, startStr, endStr, days) {
      const issues = data.issues || [];
      const worklogs = extractWorklogs(issues, null, startStr, endStr);
      const totalSec = worklogs.reduce((s,w) => s + w.timeSpentSeconds, 0);
      const users = [...new Set(worklogs.map(w=>w.user))];

      document.getElementById('range' + days + 'Total').textContent = formatHoursShort(totalSec);
      document.getElementById('range' + days + 'Issues').textContent = issues.length;
      document.getElementById('range' + days + 'Users').textContent = users.length;

      const dailyMap = {};
      worklogs.forEach(wl => {
        const d = wl.started.split('T')[0];
        if (!dailyMap[d]) dailyMap[d] = { seconds: 0, users: new Set() };
        dailyMap[d].seconds += wl.timeSpentSeconds;
        dailyMap[d].users.add(wl.user);
      });
      document.getElementById('range' + days + 'Days').textContent = Object.keys(dailyMap).length;

      const sortedDates = Object.keys(dailyMap).sort();
      const dayLabels = sortedDates.map(d => formatDateDisplay(d).split(',')[0]);
      const dayData = sortedDates.map(d => dailyMap[d].seconds / 3600);
      createLineChart('dailyTrendChart' + (days === 7 ? '' : '15'), dayLabels, dayData);

      const userStats = {}, userIssues = {}, userDays = {};
      worklogs.forEach(wl => {
        const d = wl.started.split('T')[0];
        if (!userStats[wl.user]) { userStats[wl.user] = 0; userIssues[wl.user] = new Set(); userDays[wl.user] = new Set(); }
        userStats[wl.user] += wl.timeSpentSeconds;
        userIssues[wl.user].add(wl.issue);
        userDays[wl.user].add(d);
      });
      const sortedUsers = Object.keys(userStats).sort((a,b) => userStats[b]-userStats[a]);
      createPieChart('teamPieChart' + days, sortedUsers, sortedUsers.map(u => userStats[u]/3600));
      renderTeamBars('range' + days + 'TeamBars', sortedUsers, sortedUsers.map(u => userStats[u]), totalSec);

      const dailyDiv = document.getElementById('range' + days + 'Daily');
      dailyDiv.innerHTML = '';
      sortedDates.forEach(date => {
        dailyDiv.innerHTML += '<div class="day-card"><div class="day-date">'+formatDateDisplay(date)+'</div><div class="day-stats"><span class="day-hours">'+formatHours(dailyMap[date].seconds)+'</span><span class="day-users">'+dailyMap[date].users.size+' member(s)</span></div></div>';
      });

      const tbody = document.getElementById('range' + days + 'Summary');
      tbody.innerHTML = '';

      // Build date-wise user stats
      const dateUserMap = {};
      worklogs.forEach(wl => {
        const d = wl.started.split('T')[0];
        if (!dateUserMap[d]) dateUserMap[d] = {};
        if (!dateUserMap[d][wl.user]) { dateUserMap[d][wl.user] = { seconds: 0, issues: new Set() }; }
        dateUserMap[d][wl.user].seconds += wl.timeSpentSeconds;
        dateUserMap[d][wl.user].issues.add(wl.issue);
      });

      sortedDates.forEach(date => {
        const usersOnDate = Object.keys(dateUserMap[date]).sort((a,b) => dateUserMap[date][b].seconds - dateUserMap[date][a].seconds);
        usersOnDate.forEach((user, idx) => {
          const stats = dateUserMap[date][user];
          const rowClass = idx === usersOnDate.length - 1 ? 'date-row' : '';
          tbody.innerHTML += '<tr class="'+rowClass+'"><td>'+formatDateDisplay(date)+'</td><td><div class="user-cell"><div class="avatar">'+getInitials(user)+'</div>'+user+'</div></td><td>'+stats.issues.size+'</td><td class="time-cell">'+formatHours(stats.seconds)+'</td></tr>';
        });
      });

      tbody.innerHTML += '<tr class="summary-row"><td colspan="3"><strong>Total</strong></td><td class="time-cell"><strong>'+formatHours(totalSec)+'</strong></td></tr>';
    }

    // CUSTOM RANGE
    async function loadCustomRange() {
      const sprintName = document.getElementById('sprintName').value || 'Custom Sprint';
      const start = document.getElementById('sprintStart').value;
      const end = document.getElementById('sprintEnd').value;
      if (!start || !end) { showError('Please enter both start and end dates'); return; }

      document.getElementById('reportPeriod').textContent = sprintName + ' (' + formatDateDisplay(start) + ' - ' + formatDateDisplay(end) + ')';

      try {
        const jql = "project = '" + PROJECT + "' AND worklogDate >= '" + start + "' AND worklogDate <= '" + end + "'" + buildAuthorFilter();
        const data = await fetchJira(jql);
        if (data.error) throw new Error(data.error);
        lastCustomData = data; lastCustomStart = start; lastCustomEnd = end; lastCustomName = sprintName;
        renderCustomRange(data, sprintName, start, end);
      } catch (err) { showError(err.message); }
    }

    function renderCustomRange(data, sprintName, start, end) {
      const issues = data.issues || [];
      const worklogs = extractWorklogs(issues, null, start, end);
      const totalSec = worklogs.reduce((s,w) => s + w.timeSpentSeconds, 0);
      const users = [...new Set(worklogs.map(w=>w.user))];

      const startDate = new Date(start);
      const endDate = new Date(end);
      const dayCount = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000)) + 1;

      document.getElementById('sprintTotal').textContent = formatHoursShort(totalSec);
      document.getElementById('sprintIssues').textContent = issues.length;
      document.getElementById('sprintUsers').textContent = users.length;
      document.getElementById('sprintDays').textContent = dayCount;
      document.getElementById('sprintWorklogCount').textContent = worklogs.length + ' entries';

      const dailyMap = {};
      worklogs.forEach(wl => {
        const d = wl.started.split('T')[0];
        if (!dailyMap[d]) dailyMap[d] = { seconds: 0 };
        dailyMap[d].seconds += wl.timeSpentSeconds;
      });
      const sortedDates = Object.keys(dailyMap).sort();
      const dayLabels = sortedDates.map(d => formatDateDisplay(d).split(',')[0]);
      const dayData = sortedDates.map(d => dailyMap[d].seconds / 3600);
      createLineChart('sprintTrendChart', dayLabels, dayData);

      const userStats = {};
      worklogs.forEach(wl => { if (!userStats[wl.user]) userStats[wl.user] = 0; userStats[wl.user] += wl.timeSpentSeconds; });
      const sortedUsers = Object.keys(userStats).sort((a,b) => userStats[b]-userStats[a]);
      createPieChart('sprintPieChart', sortedUsers, sortedUsers.map(u => userStats[u]/3600));

      const tbody = document.getElementById('sprintDetail');
      tbody.innerHTML = '';
      worklogs.sort((a,b) => a.started.localeCompare(b.started)).forEach(wl => {
        tbody.innerHTML += '<tr><td><div class="user-cell"><div class="avatar">'+getInitials(wl.user)+'</div>'+wl.user+'</div></td><td><strong>'+wl.issue+'</strong></td><td style="color:#71717a;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+wl.summary+'</td><td class="time-cell">'+wl.timeSpent+'</td><td>'+formatDateDisplay(wl.started.split('T')[0])+'</td></tr>';
      });
      if (worklogs.length === 0) tbody.innerHTML = '<tr><td colspan="5" class="empty">No worklogs found for this range.</td></tr>';
    }

    function renderTeamBars(containerId, users, hours, total) {
      const container = document.getElementById(containerId);
      container.innerHTML = '';
      users.forEach((user, i) => {
        const pct = total ? (hours[i] / total * 100) : 0;
        container.innerHTML += '<div class="team-bar"><div class="team-bar-info"><div class="team-bar-name">'+user+'</div><div class="team-bar-hours">'+formatHours(hours[i])+'</div></div><div class="team-bar-track"><div class="team-bar-fill" style="width:'+Math.max(pct, 10)+'%">'+pct.toFixed(1)+'%</div></div></div>';
      });
    }

    function showError(msg) {
      document.getElementById('error').textContent = msg;
      document.getElementById('error').style.display = 'block';
      setTimeout(() => { document.getElementById('error').style.display = 'none'; }, 5000);
    }

    // Init
    fetchUsers();
    loadDaily();
  </script>
</body>
</html>`;
}

server.listen(PORT, () => {
  console.log(`Dashboard running at http://localhost:${PORT}`);
});