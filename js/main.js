/* ═══════════════════════════════════════════════
   Life Tracker — main.js
   Modular vanilla JS: storage, goals, earnings,
   reminders, dashboard, navigation, charts, PWA
   ═══════════════════════════════════════════════ */

'use strict';

/* ── 1. Storage Helpers ────────────────────────── */

function getData(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    showToast('Storage error — data may not be saved.', 'error');
    return false;
  }
}

/* ── 2. ID & Date Utilities ────────────────────── */

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(num) {
  return '$' + Number(num).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ── 3. Toast Notifications ────────────────────── */

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✗', warning: '⚠', info: '◈' };
  toast.innerHTML = `<span>${icons[type] || icons.info}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.25s';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

/* ── 4. Navigation ─────────────────────────────── */

let currentTab = 'dashboard';

function initNavigation() {
  // Sidebar buttons
  document.querySelectorAll('.nav-item[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Bottom nav buttons
  document.querySelectorAll('.bottom-nav-item[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // "View all" shortcut links
  document.querySelectorAll('[data-tab]').forEach(el => {
    if (el.classList.contains('text-btn') || el.classList.contains('inline-btn')) {
      el.addEventListener('click', () => switchTab(el.dataset.tab));
    }
  });

  // Export button
  document.getElementById('exportBtn').addEventListener('click', exportData);

  // Set today's date
  const dateEl = document.getElementById('headerDate');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }
}

function switchTab(tabId) {
  if (currentTab === tabId) return;
  currentTab = tabId;

  // Panels
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(`tab-${tabId}`);
  if (panel) panel.classList.add('active');

  // Sidebar
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });

  // Bottom nav
  document.querySelectorAll('.bottom-nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });

  // Refresh the panel
  if (tabId === 'dashboard') renderDashboard();
  if (tabId === 'goals')     renderGoals();
  if (tabId === 'earnings')  renderEarnings();
  if (tabId === 'reminders') renderReminders();
}

/* ── 5. GOALS MODULE ───────────────────────────── */

const GOALS_KEY = 'lt_goals';
const STREAK_KEY = 'lt_streak';
let goalFilter = 'all';

function getGoals() { return getData(GOALS_KEY) || []; }
function saveGoals(goals) { saveData(GOALS_KEY, goals); }

function initGoals() {
  document.getElementById('addGoalBtn').addEventListener('click', addGoal);
  document.getElementById('goalTitle').addEventListener('keydown', e => {
    if (e.key === 'Enter') addGoal();
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      goalFilter = btn.dataset.filter;
      renderGoals();
    });
  });

  renderGoals();
  updateStreak();
}

function addGoal() {
  const title = document.getElementById('goalTitle').value.trim();
  if (!title) { showToast('Please enter a goal title.', 'warning'); return; }

  const goals = getGoals();
  const goal = {
    id: genId(),
    title,
    desc: document.getElementById('goalDesc').value.trim(),
    category: document.getElementById('goalCategory').value,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  goals.unshift(goal);
  saveGoals(goals);

  document.getElementById('goalTitle').value = '';
  document.getElementById('goalDesc').value = '';

  showToast('Goal added!', 'success');
  renderGoals();
  renderDashboard();
}

function toggleGoal(id) {
  const goals = getGoals();
  const goal = goals.find(g => g.id === id);
  if (!goal) return;
  goal.completed = !goal.completed;
  goal.completedAt = goal.completed ? new Date().toISOString() : null;
  saveGoals(goals);
  updateStreak();
  renderGoals();
  renderDashboard();

  if (goal.completed) showToast('Goal marked complete! 🎉', 'success');
}

function deleteGoal(id) {
  const goals = getGoals().filter(g => g.id !== id);
  saveGoals(goals);
  showToast('Goal removed.', 'info');
  renderGoals();
  renderDashboard();
}

function renderGoals() {
  const list = document.getElementById('goalsList');
  if (!list) return;

  let goals = getGoals();
  if (goalFilter === 'active') goals = goals.filter(g => !g.completed);
  if (goalFilter === 'done')   goals = goals.filter(g => g.completed);

  if (!goals.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">◎</div>
        <p>${goalFilter === 'done' ? 'No completed goals yet.' : 'No goals yet — add your first one above!'}</p>
      </div>`;
    return;
  }

  list.innerHTML = goals.map(g => `
    <div class="goal-item ${g.completed ? 'completed' : ''}" id="goal-${g.id}">
      <button class="goal-check" onclick="toggleGoal('${g.id}')" title="${g.completed ? 'Mark incomplete' : 'Mark complete'}">
        ${g.completed ? '✓' : ''}
      </button>
      <div class="goal-body">
        <div class="goal-title-text">${escHtml(g.title)}</div>
        ${g.desc ? `<div class="goal-desc-text">${escHtml(g.desc)}</div>` : ''}
        <div class="goal-meta">
          <span class="goal-cat-badge cat-${g.category}">${g.category}</span>
          <span class="goal-date">${formatDate(g.createdAt)}</span>
          ${g.completed && g.completedAt ? `<span class="goal-date">✓ ${formatDate(g.completedAt)}</span>` : ''}
        </div>
      </div>
      <div class="item-actions">
        <button class="icon-btn" onclick="deleteGoal('${g.id}')" title="Delete">✕</button>
      </div>
    </div>
  `).join('');
}

function updateStreak() {
  const goals = getGoals();
  const today = todayISO();
  const streakData = getData(STREAK_KEY) || { lastActive: null, count: 0 };
  const doneToday = goals.some(g => g.completedAt && g.completedAt.slice(0, 10) === today);

  if (doneToday) {
    if (streakData.lastActive !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayISO = yesterday.toISOString().slice(0, 10);
      if (streakData.lastActive === yesterdayISO) {
        streakData.count += 1;
      } else if (streakData.lastActive !== today) {
        streakData.count = 1;
      }
      streakData.lastActive = today;
      saveData(STREAK_KEY, streakData);
    }
  }

  const countEl = document.getElementById('streakCount');
  if (countEl) countEl.textContent = streakData.count;
}

/* ── 6. EARNINGS MODULE ────────────────────────── */

const EARNINGS_KEY = 'lt_earnings';

function getEarnings() { return getData(EARNINGS_KEY) || []; }
function saveEarnings(e) { saveData(EARNINGS_KEY, e); }

function initEarnings() {
  // Default date to today
  document.getElementById('earningDate').value = todayISO();

  document.getElementById('addEarningBtn').addEventListener('click', addEarning);
  document.getElementById('earningAmount').addEventListener('keydown', e => {
    if (e.key === 'Enter') addEarning();
  });

  renderEarnings();
}

function addEarning() {
  const amount = parseFloat(document.getElementById('earningAmount').value);
  const date   = document.getElementById('earningDate').value;
  const source = document.getElementById('earningSource').value.trim() || 'Income';

  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid amount.', 'warning');
    return;
  }
  if (!date) {
    showToast('Please select a date.', 'warning');
    return;
  }

  const earnings = getEarnings();
  earnings.unshift({ id: genId(), amount, date, source, createdAt: new Date().toISOString() });
  saveEarnings(earnings);

  document.getElementById('earningAmount').value = '';
  document.getElementById('earningSource').value = '';
  document.getElementById('earningDate').value = todayISO();

  showToast(`${formatCurrency(amount)} entry added!`, 'success');
  renderEarnings();
  renderDashboard();
}

function deleteEarning(id) {
  const earnings = getEarnings().filter(e => e.id !== id);
  saveEarnings(earnings);
  showToast('Entry removed.', 'info');
  renderEarnings();
  renderDashboard();
}

function renderEarnings() {
  const list = document.getElementById('earningsList');
  if (!list) return;

  const earnings = getEarnings();
  const total = earnings.reduce((s, e) => s + Number(e.amount), 0);

  // Update header total
  const badge = document.getElementById('earningsTotalBadge');
  if (badge) badge.textContent = formatCurrency(total);

  const countBadge = document.getElementById('earningsCountBadge');
  if (countBadge) countBadge.textContent = `${earnings.length} ${earnings.length === 1 ? 'entry' : 'entries'}`;

  if (!earnings.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">◇</div>
        <p>No earnings logged yet — add your first entry above!</p>
      </div>`;
    return;
  }

  list.innerHTML = earnings.map(e => `
    <div class="earning-item">
      <div class="earning-icon">$</div>
      <div class="earning-body">
        <div class="earning-source">${escHtml(e.source)}</div>
        <div class="earning-date">${formatDate(e.date)}</div>
      </div>
      <div class="earning-amount">${formatCurrency(e.amount)}</div>
      <div class="item-actions">
        <button class="icon-btn" onclick="deleteEarning('${e.id}')" title="Delete">✕</button>
      </div>
    </div>
  `).join('');
}

/* ── 7. REMINDERS MODULE ───────────────────────── */

const REMINDERS_KEY = 'lt_reminders';
let notifPermission = Notification?.permission || 'default';

function getReminders() { return getData(REMINDERS_KEY) || []; }
function saveReminders(r) { saveData(REMINDERS_KEY, r); }

function initReminders() {
  document.getElementById('addReminderBtn').addEventListener('click', addReminder);
  document.getElementById('reminderText').addEventListener('keydown', e => {
    if (e.key === 'Enter') addReminder();
  });

  const notifBtn = document.getElementById('notifPermBtn');
  notifBtn.addEventListener('click', requestNotifPermission);
  updateNotifBtn();

  renderReminders();
  scheduleReminderChecks();
}

function updateNotifBtn() {
  const btn = document.getElementById('notifPermBtn');
  if (!btn) return;
  if (notifPermission === 'granted') {
    btn.textContent = '✓ Alerts Active';
    btn.classList.add('notif-granted');
  } else {
    btn.textContent = 'Enable Alerts';
    btn.classList.remove('notif-granted');
  }
}

function requestNotifPermission() {
  if (!('Notification' in window)) {
    showToast('Browser notifications not supported.', 'warning');
    return;
  }
  if (notifPermission === 'granted') {
    showToast('Alerts are already active.', 'info');
    return;
  }
  Notification.requestPermission().then(perm => {
    notifPermission = perm;
    updateNotifBtn();
    if (perm === 'granted') {
      showToast('Browser alerts enabled!', 'success');
      new Notification('Life Tracker', { body: 'You will now receive reminder alerts.' });
    } else {
      showToast('Permission denied — alerts will not fire.', 'warning');
    }
  });
}

function addReminder() {
  const text     = document.getElementById('reminderText').value.trim();
  const time     = document.getElementById('reminderTime').value;
  const priority = document.getElementById('reminderPriority').value;

  if (!text) { showToast('Please enter reminder text.', 'warning'); return; }

  const reminders = getReminders();
  reminders.unshift({
    id: genId(),
    text,
    time: time || null,
    priority,
    done: false,
    createdAt: new Date().toISOString(),
  });
  saveReminders(reminders);

  document.getElementById('reminderText').value = '';
  document.getElementById('reminderTime').value = '';

  showToast('Reminder added!', 'success');
  renderReminders();
  renderDashboard();
}

function dismissReminder(id) {
  const reminders = getReminders();
  const r = reminders.find(r => r.id === id);
  if (!r) return;
  r.done = !r.done;
  saveReminders(reminders);
  renderReminders();
  renderDashboard();
}

function deleteReminder(id) {
  const reminders = getReminders().filter(r => r.id !== id);
  saveReminders(reminders);
  showToast('Reminder removed.', 'info');
  renderReminders();
  renderDashboard();
}

function renderReminders() {
  const list = document.getElementById('remindersList');
  if (!list) return;

  const reminders = getReminders();
  const activeCount = reminders.filter(r => !r.done).length;

  const countBadge = document.getElementById('remindersCountBadge');
  if (countBadge) countBadge.textContent = `${reminders.length} reminder${reminders.length !== 1 ? 's' : ''}`;

  if (!reminders.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">◉</div>
        <p>No reminders yet — add your first one above!</p>
      </div>`;
    return;
  }

  // Sort: active first, then by priority, then by time
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...reminders].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  list.innerHTML = sorted.map(r => `
    <div class="reminder-item ${r.done ? 'done' : ''}">
      <div class="priority-dot ${r.priority}"></div>
      <div class="reminder-body">
        <div class="reminder-text-content">${escHtml(r.text)}</div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:4px;">
          ${r.time ? `<span class="reminder-time">⏰ ${r.time}</span>` : ''}
          <span class="reminder-priority-label priority-label-${r.priority}">${r.priority}</span>
        </div>
      </div>
      <div class="item-actions">
        <button class="reminder-dismiss" onclick="dismissReminder('${r.id}')" title="${r.done ? 'Reactivate' : 'Dismiss'}">
          ${r.done ? '↺' : '✓'}
        </button>
        <button class="icon-btn" onclick="deleteReminder('${r.id}')" title="Delete">✕</button>
      </div>
    </div>
  `).join('');
}

function scheduleReminderChecks() {
  // Check every minute if a reminder time matches current time
  setInterval(() => {
    if (notifPermission !== 'granted') return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    getReminders().forEach(r => {
      if (!r.done && r.time === currentTime) {
        new Notification('Life Tracker Reminder', {
          body: r.text,
          icon: 'assets/icon-192.png',
        });
      }
    });
  }, 60000);
}

/* ── 8. DASHBOARD MODULE ───────────────────────── */

let earningsChart = null;

function renderDashboard() {
  const goals    = getGoals();
  const earnings = getEarnings();
  const reminders = getReminders();

  // Summary cards
  const totalEarnings = earnings.reduce((s, e) => s + Number(e.amount), 0);
  const completedGoals = goals.filter(g => g.completed).length;
  const activeReminders = reminders.filter(r => !r.done).length;

  setText('dash-total-earnings', formatCurrency(totalEarnings));
  setText('dash-earnings-count', `${earnings.length} ${earnings.length === 1 ? 'entry' : 'entries'}`);
  setText('dash-total-goals', goals.length);
  setText('dash-goals-complete', `${completedGoals} completed`);
  setText('dash-total-reminders', activeReminders);
  setText('dash-reminders-sub', 'active');

  // Active goals on dashboard
  renderDashGoals(goals);

  // Earnings chart
  renderEarningsChart(earnings);
}

function renderDashGoals(goals) {
  const list = document.getElementById('dash-goals-list');
  if (!list) return;

  const active = goals.filter(g => !g.completed).slice(0, 5);

  if (!active.length) {
    const done = goals.filter(g => g.completed).length;
    list.innerHTML = done
      ? `<div class="empty-state small"><p>All ${done} goal${done > 1 ? 's' : ''} completed! 🎉 <button class="inline-btn" data-tab="goals">Add more →</button></p></div>`
      : `<div class="empty-state small"><p>No goals yet. <button class="inline-btn" data-tab="goals">Add one →</button></p></div>`;

    // Re-attach listener for dynamically created buttons
    list.querySelectorAll('[data-tab]').forEach(el => {
      el.addEventListener('click', () => switchTab(el.dataset.tab));
    });
    return;
  }

  list.innerHTML = active.map(g => `
    <div class="dash-goal-item">
      <div class="dash-goal-dot ${g.completed ? 'done' : ''}"></div>
      <div class="dash-goal-name">${escHtml(g.title)}</div>
      <span class="dash-goal-tag">${g.category}</span>
    </div>
  `).join('');
}

function renderEarningsChart(earnings) {
  const ctx = document.getElementById('earningsChart');
  const emptyMsg = document.getElementById('chartEmpty');
  if (!ctx) return;

  const sorted = [...earnings].sort((a, b) => new Date(a.date) - new Date(b.date));
  const recent = sorted.slice(-10);

  if (!recent.length) {
    emptyMsg?.classList.remove('hidden');
    ctx.style.display = 'none';
    if (earningsChart) { earningsChart.destroy(); earningsChart = null; }
    return;
  }

  emptyMsg?.classList.add('hidden');
  ctx.style.display = 'block';

  const labels = recent.map(e => formatDate(e.date));
  const data   = recent.map(e => Number(e.amount));
  const accum  = data.reduce((acc, v, i) => { acc.push((acc[i-1] || 0) + v); return acc; }, []);

  if (earningsChart) earningsChart.destroy();

  earningsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'line',
          label: 'Cumulative',
          data: accum,
          borderColor: '#6366F1',
          backgroundColor: '#6366F122',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#6366F1',
          yAxisID: 'y1',
        },
        {
          type: 'bar',
          label: 'Amount',
          data,
          backgroundColor: '#10B98133',
          borderColor: '#10B981',
          borderWidth: 1.5,
          borderRadius: 4,
          yAxisID: 'y',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1A2235',
          borderColor: '#2A3B54',
          borderWidth: 1,
          titleColor: '#94A3B8',
          bodyColor: '#F1F5F9',
          callbacks: {
            label: ctx => {
              const val = formatCurrency(ctx.parsed.y);
              return ` ${ctx.dataset.label}: ${val}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#1F2D42' },
          ticks: { color: '#475569', font: { size: 10, family: 'Inter' }, maxRotation: 30 },
        },
        y: {
          position: 'left',
          grid: { color: '#1F2D42' },
          ticks: { color: '#10B981', font: { size: 10, family: 'JetBrains Mono' }, callback: v => '$' + v },
        },
        y1: {
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#6366F1', font: { size: 10, family: 'JetBrains Mono' }, callback: v => '$' + v },
        }
      }
    }
  });

  const label = document.getElementById('chartPeriodLabel');
  if (label) label.textContent = `Last ${recent.length} entries`;
}

/* ── 9. Export ─────────────────────────────────── */

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    goals:      getGoals(),
    earnings:   getEarnings(),
    reminders:  getReminders(),
    streak:     getData(STREAK_KEY),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `lifetrack-export-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported!', 'success');
}

/* ── 10. Utility ───────────────────────────────── */

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ── 11. PWA Service Worker ────────────────────── */

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(() => console.log('[SW] Registered'))
      .catch(err => console.warn('[SW] Registration failed:', err));
  }
}

/* ── 12. Boot ──────────────────────────────────── */

function init() {
  initNavigation();
  initGoals();
  initEarnings();
  initReminders();
  renderDashboard();
  registerServiceWorker();
}

document.addEventListener('DOMContentLoaded', init);