/* ============================================================
   VIDYA STEM – Main Application Controller
   js/app.js  |  v3.0.0
   ============================================================ */

const app = (() => {

  let _currentAuditMeta = null;  // audit in progress

  /* ── View routing ── */
  function switchView(viewId, direction = 'forward') {
    document.querySelectorAll('.view').forEach(v => {
      v.classList.remove('view--active', 'view--prev');
    });
    const el = document.getElementById(viewId);
    if (el) el.classList.add('view--active');
  }

  /* ── Boot ── */
  async function boot() {
    const session = auth.currentUser();
    if (session) {
      const user = auth.currentUserFull();
      if (user) { renderHome(user); return; }
    }
    switchView('login-view');
  }

  /* ── Login handler ── */
  async function handleLogin() {
    const uname = document.getElementById('login-username').value.trim();
    const pwd   = document.getElementById('login-password').value;
    const btn   = document.getElementById('login-btn');

    if (!uname || !pwd) { ui.toast('Enter username and password', 'error'); return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    const result = await auth.login(uname, pwd);
    btn.disabled = false;
    btn.innerHTML = '<span>Sign In</span><i class="fa-solid fa-arrow-right"></i>';

    if (!result.ok) {
      ui.toast(result.error, 'error');
      document.getElementById('login-card').classList.add('shake');
      setTimeout(() => document.getElementById('login-card').classList.remove('shake'), 500);
      return;
    }

    renderHome(result.user);
  }

  /* ── Render home (lab selection) ── */
  function renderHome(user) {
    document.getElementById('home-user-name').textContent  = user.displayName || user.username;
    document.getElementById('home-user-role').textContent  = user.role.toUpperCase();
    document.getElementById('home-avatar').textContent     = user.avatar || user.displayName[0];
    document.getElementById('home-avatar').style.background = user.color || '#2a9d8f';

    const grid = document.getElementById('lab-grid');
    grid.innerHTML = '';

    if (user.role === 'admin' || user.role === 'subadmin') {
      renderAdminHome(user);
      return;
    }

    // School user – show their labs
    const labs = user.labs || {};
    Object.entries(labs).forEach(([labKey, lab]) => {
      const card = document.createElement('div');
      card.className = 'lab-card';
      card.innerHTML = `
        <div class="lab-card-banner lab-banner--${labKey}" style="background:${lab.color}22">
          <i class="fa-solid ${lab.icon}" style="color:${lab.color}"></i>
        </div>
        <div class="lab-card-body">
          <div class="lab-card-title">${lab.name}</div>
          <div class="lab-card-sub">${lab.items.length} items</div>
        </div>
        <div class="lab-card-arrow"><i class="fa-solid fa-chevron-right"></i></div>
      `;
      card.onclick = () => startLabAudit(user, labKey, lab);
      grid.appendChild(card);
    });

    // Show audit history shortcut
    const histBtn = document.getElementById('btn-history');
    if (histBtn) {
      histBtn.style.display = 'flex';
      histBtn.onclick = () => renderHistory(user);
    }

    switchView('home-view');
  }

  /* ── Admin home ── */
  function renderAdminHome(user) {
    switchView('admin-view');
    loadAdminDashboard(user);
  }

  /* ── Start lab audit ── */
  async function startLabAudit(user, labKey, lab) {
    ui.setLoading(true, 'Loading items…');
    try {
      const items = await dataStore.resolveLabItems(lab);
      if (!items.length) { ui.toast('No items found for this lab', 'error'); return; }

      _currentAuditMeta = {
        user:    user.username,
        school:  user.schoolCode || user.displayName,
        lab:     labKey,
        labName: lab.name,
        ts:      Date.now(),
        total:   items.length
      };

      swipeEngine.start(items, lab, async (decisions) => {
        await onAuditComplete(decisions);
      });
    } catch (e) {
      ui.toast('Error loading items: ' + e.message, 'error');
    } finally {
      ui.setLoading(false);
    }
  }

  /* ── Audit complete callback ── */
  async function onAuditComplete(decisions) {
    const meta   = _currentAuditMeta;
    const auditId = dataStore.generateAuditId(meta.user, meta.lab);
    const results = decisions.map(d => ({ code: d.item.code, status: d.status }));

    // Save locally
    dataStore.saveAudit(auditId, meta, decisions);

    // Push to Telegram (non-blocking)
    telegramBot.pushAudit(meta, results).catch(() => {});

    // Show result summary
    renderAuditResult(auditId, meta, results);
  }

  /* ── Audit result screen ── */
  function renderAuditResult(auditId, meta, results) {
    const present = results.filter(r => r.status === 'Well Present').length;
    const broken  = results.filter(r => r.status === 'Broken').length;
    const missing = results.filter(r => r.status === 'Missing').length;
    const total   = results.length;
    const pct     = Math.round((present / total) * 100);

    document.getElementById('result-lab').textContent   = meta.labName;
    document.getElementById('result-date').textContent  = ui.fmtDate(meta.ts);
    document.getElementById('result-pct').textContent   = pct + '%';
    document.getElementById('result-present').textContent = present;
    document.getElementById('result-broken').textContent  = broken;
    document.getElementById('result-missing').textContent = missing;
    document.getElementById('result-total').textContent   = total;

    const list = document.getElementById('result-issues');
    list.innerHTML = '';
    const issues = results.filter(r => r.status !== 'Well Present');
    if (!issues.length) {
      list.innerHTML = '<div class="no-issues"><i class="fa-solid fa-party-horn"></i> All items accounted for!</div>';
    } else {
      issues.forEach(r => {
        const row = document.createElement('div');
        row.className = 'result-issue-row';
        row.innerHTML = `<span class="result-code">${r.code}</span>${ui.statusBadge(r.status)}`;
        list.appendChild(row);
      });
    }

    document.getElementById('btn-export-img').onclick = () => exportMgr.toImage(auditId);
    document.getElementById('btn-export-csv').onclick = () => exportMgr.toExcel(auditId);
    document.getElementById('btn-result-home').onclick = () => {
      const user = auth.currentUserFull();
      if (user) renderHome(user);
    };

    switchView('result-view');
  }

  /* ── History view ── */
  function renderHistory(user) {
    const audits = dataStore.getAuditsByUser(user.username);
    const list   = document.getElementById('history-list');
    list.innerHTML = '';

    document.getElementById('history-back').onclick = () => renderHome(user);

    if (!audits.length) {
      list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-clipboard-list"></i><p>No audits yet</p></div>';
    } else {
      audits.forEach(a => {
        const results = (a.results || []).map(([code, s]) => {
          const map = {W:'Well Present',B:'Broken',M:'Missing'};
          return { code, status: map[s] || s };
        });
        const present = results.filter(r => r.status === 'Well Present').length;
        const total   = results.length;
        const pct     = total ? Math.round((present/total)*100) : 0;

        const row = document.createElement('div');
        row.className = 'history-row';
        row.innerHTML = `
          <div class="history-row-main">
            <div class="history-row-lab">${a.meta.labName}</div>
            <div class="history-row-date">${ui.fmtDate(a.meta.ts)}</div>
          </div>
          <div class="history-row-stats">
            <span class="hpct hpct--${pct>=90?'good':pct>=70?'warn':'bad'}">${pct}%</span>
            <span class="history-export-btns">
              <button class="icon-btn" title="Export PNG" onclick="exportMgr.toImage('${a.id}')"><i class="fa-solid fa-image"></i></button>
              <button class="icon-btn" title="Export CSV" onclick="exportMgr.toExcel('${a.id}')"><i class="fa-solid fa-file-csv"></i></button>
            </span>
          </div>`;
        list.appendChild(row);
      });
    }

    switchView('history-view');
  }

  /* ── Admin dashboard ── */
  function loadAdminDashboard(user) {
    // Load all audits and show per-school summary
    const all = dataStore.getAllAudits();

    // Build school → latest audit map
    const schoolMap = {};
    all.forEach(a => {
      const k = a.meta.school || a.meta.user;
      if (!schoolMap[k]) schoolMap[k] = [];
      schoolMap[k].push(a);
    });

    const grid = document.getElementById('admin-school-grid');
    grid.innerHTML = '';

    const schools = Object.entries(schoolMap);
    if (!schools.length) {
      grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-school"></i><p>No audits submitted yet</p></div>';
    }

    schools.forEach(([school, audits]) => {
      audits.sort((a, b) => b.meta.ts - a.meta.ts);
      const latest = audits[0];
      const results = (latest.results || []).map(([code, s]) => {
        const map = {W:'Well Present',B:'Broken',M:'Missing'};
        return { code, status: map[s]||s };
      });
      const present = results.filter(r => r.status==='Well Present').length;
      const total   = results.length;
      const pct     = total ? Math.round((present/total)*100) : 0;

      const card = document.createElement('div');
      card.className = 'admin-school-card';
      card.innerHTML = `
        <div class="asc-header">
          <div class="asc-avatar">${school[0]}</div>
          <div>
            <div class="asc-name">${school}</div>
            <div class="asc-sub">${audits.length} audit${audits.length>1?'s':''}</div>
          </div>
          <div class="asc-pct asc-pct--${pct>=90?'good':pct>=70?'warn':'bad'}">${pct}%</div>
        </div>
        <div class="asc-last">Last: ${ui.fmtDate(latest.meta.ts)} · ${latest.meta.labName}</div>
      `;
      card.onclick = () => renderAdminSchoolDetail(school, audits, user);
      grid.appendChild(card);
    });

    // Stats
    const totalAudits = all.length;
    document.getElementById('admin-stat-audits').textContent = totalAudits;
    document.getElementById('admin-stat-schools').textContent = schools.length;

    document.getElementById('admin-logout').onclick = () => { auth.logout(); switchView('login-view'); };
  }

  /* ── Admin school detail ── */
  function renderAdminSchoolDetail(school, audits, adminUser) {
    document.getElementById('admin-detail-school').textContent = school;
    document.getElementById('admin-detail-back').onclick = () => switchView('admin-view');

    const list = document.getElementById('admin-detail-list');
    list.innerHTML = '';

    audits.forEach(a => {
      const results = (a.results || []).map(([code, s]) => {
        const map = {W:'Well Present',B:'Broken',M:'Missing'};
        return { code, status: map[s]||s };
      });
      const present = results.filter(r => r.status==='Well Present').length;
      const broken  = results.filter(r => r.status==='Broken').length;
      const missing = results.filter(r => r.status==='Missing').length;
      const total   = results.length;

      const sec = document.createElement('div');
      sec.className = 'admin-audit-section';
      sec.innerHTML = `
        <div class="aas-header">
          <div>
            <div class="aas-lab">${a.meta.labName}</div>
            <div class="aas-date">${ui.fmtDate(a.meta.ts)}</div>
          </div>
          <div class="aas-actions">
            <button class="icon-btn" onclick="exportMgr.toImage('${a.id}')"><i class="fa-solid fa-image"></i></button>
            <button class="icon-btn" onclick="exportMgr.toExcel('${a.id}')"><i class="fa-solid fa-file-csv"></i></button>
          </div>
        </div>
        <div class="aas-stats">
          <span class="aas-stat aas-stat--present">✅ ${present} Present</span>
          <span class="aas-stat aas-stat--broken">🟡 ${broken} Broken</span>
          <span class="aas-stat aas-stat--missing">🔴 ${missing} Missing</span>
        </div>
        <div class="aas-items">
          ${results.map(r => `<div class="aas-item-row">
            <span class="aas-code">${r.code}</span>${ui.statusBadge(r.status)}
          </div>`).join('')}
        </div>
      `;
      list.appendChild(sec);
    });

    switchView('admin-detail-view');
  }

  /* ── Expose to global ── */
  return {
    boot,
    switchView,
    handleLogin,
    renderHome,
    renderHistory,
    loadAdminDashboard
  };

})();

/* ── Init on DOM ready ── */
document.addEventListener('DOMContentLoaded', () => {
  app.boot();

  // Login form
  document.getElementById('login-btn').addEventListener('click', app.handleLogin);
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') app.handleLogin();
  });

  // Toggle password visibility
  document.getElementById('toggle-pwd')?.addEventListener('click', function() {
    const inp = document.getElementById('login-password');
    const isText = inp.type === 'text';
    inp.type = isText ? 'password' : 'text';
    this.querySelector('i').className = `fa-solid fa-eye${isText ? '' : '-slash'}`;
  });

  // Swipe submit
  document.getElementById('sw-submit-btn')?.addEventListener('click', () => swipeEngine.submit());

  // Logout (home)
  document.getElementById('home-logout')?.addEventListener('click', () => {
    auth.logout();
    app.switchView('login-view');
  });

  // Service worker (PWA)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});
