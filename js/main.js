/* ═══════════════════════════════════════════════
   Life Tracker — main.js
   Modular vanilla JS: storage, goals, earnings,
   reminders, dashboard, navigation, charts, PWA
   ═══════════════════════════════════════════════ */

"use strict";

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
    showToast("Storage error — data may not be saved.", "error");
    return false;
  }
}

/* ── 2. ID & Date Utilities ────────────────────── */

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(num) {
  return (
    "$" +
    Number(num).toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/* ── 3. Toast Notifications ────────────────────── */

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icons = { success: "✓", error: "✗", warning: "⚠", info: "◈" };
  toast.innerHTML = `<span>${icons[type] || icons.info}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    toast.style.transition = "all 0.25s";
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

/* ── 4. Navigation ─────────────────────────────── */

let currentTab = "dashboard";

function initNavigation() {
  // Sidebar buttons
  document.querySelectorAll(".nav-item[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Bottom nav buttons
  document.querySelectorAll(".bottom-nav-item[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // "View all" shortcut links
  document.querySelectorAll("[data-tab]").forEach((el) => {
    if (
      el.classList.contains("text-btn") ||
      el.classList.contains("inline-btn")
    ) {
      el.addEventListener("click", () => switchTab(el.dataset.tab));
    }
  });

  // Export button
  document.getElementById("exportBtn").addEventListener("click", exportData);

  // Set today's date
  const dateEl = document.getElementById("headerDate");
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
}

function switchTab(tabId) {
  if (currentTab === tabId) return;
  currentTab = tabId;

  // Panels
  document
    .querySelectorAll(".tab-panel")
    .forEach((p) => p.classList.remove("active"));
  const panel = document.getElementById(`tab-${tabId}`);
  if (panel) panel.classList.add("active");

  // Sidebar
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tabId);
  });

  // Bottom nav
  document.querySelectorAll(".bottom-nav-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tabId);
  });

  // Refresh the panel
  if (tabId === "dashboard") renderDashboard();
  if (tabId === "goals") renderGoals();
  if (tabId === "earnings") renderEarnings();
  if (tabId === "reminders") renderReminders();
  // AI tab needs no re-render — state is live
}

/* ── 5. GOALS MODULE ───────────────────────────── */

const GOALS_KEY = "lt_goals";
const STREAK_KEY = "lt_streak";
let goalFilter = "all";

function getGoals() {
  return getData(GOALS_KEY) || [];
}
function saveGoals(goals) {
  saveData(GOALS_KEY, goals);
}

function initGoals() {
  document.getElementById("addGoalBtn").addEventListener("click", addGoal);
  document.getElementById("goalTitle").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addGoal();
  });

  // Filter buttons
  document.querySelectorAll(".filter-btn[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      goalFilter = btn.dataset.filter;
      renderGoals();
    });
  });

  renderGoals();
  updateStreak();
}

function addGoal() {
  const title = document.getElementById("goalTitle").value.trim();
  if (!title) {
    showToast("Please enter a goal title.", "warning");
    return;
  }

  const goals = getGoals();
  const goal = {
    id: genId(),
    title,
    desc: document.getElementById("goalDesc").value.trim(),
    category: document.getElementById("goalCategory").value,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  goals.unshift(goal);
  saveGoals(goals);

  document.getElementById("goalTitle").value = "";
  document.getElementById("goalDesc").value = "";

  showToast("Goal added!", "success");
  renderGoals();
  renderDashboard();
}

function toggleGoal(id) {
  const goals = getGoals();
  const goal = goals.find((g) => g.id === id);
  if (!goal) return;
  goal.completed = !goal.completed;
  goal.completedAt = goal.completed ? new Date().toISOString() : null;
  saveGoals(goals);
  updateStreak();
  renderGoals();
  renderDashboard();

  if (goal.completed) showToast("Goal marked complete! 🎉", "success");
}

function deleteGoal(id) {
  const goals = getGoals().filter((g) => g.id !== id);
  saveGoals(goals);
  showToast("Goal removed.", "info");
  renderGoals();
  renderDashboard();
}

function renderGoals() {
  const list = document.getElementById("goalsList");
  if (!list) return;

  let goals = getGoals();
  if (goalFilter === "active") goals = goals.filter((g) => !g.completed);
  if (goalFilter === "done") goals = goals.filter((g) => g.completed);

  if (!goals.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">◎</div>
        <p>${goalFilter === "done" ? "No completed goals yet." : "No goals yet — add your first one above!"}</p>
      </div>`;
    return;
  }

  list.innerHTML = goals
    .map(
      (g) => `
    <div class="goal-item ${g.completed ? "completed" : ""}" id="goal-${g.id}">
      <button class="goal-check" onclick="toggleGoal('${g.id}')" title="${g.completed ? "Mark incomplete" : "Mark complete"}">
        ${g.completed ? "✓" : ""}
      </button>
      <div class="goal-body">
        <div class="goal-title-text">${escHtml(g.title)}</div>
        ${g.desc ? `<div class="goal-desc-text">${escHtml(g.desc)}</div>` : ""}
        <div class="goal-meta">
          <span class="goal-cat-badge cat-${g.category}">${g.category}</span>
          <span class="goal-date">${formatDate(g.createdAt)}</span>
          ${g.completed && g.completedAt ? `<span class="goal-date">✓ ${formatDate(g.completedAt)}</span>` : ""}
        </div>
      </div>
      <div class="item-actions">
        <button class="icon-btn" onclick="deleteGoal('${g.id}')" title="Delete">✕</button>
      </div>
    </div>
  `,
    )
    .join("");
}

function updateStreak() {
  const goals = getGoals();
  const today = todayISO();
  const streakData = getData(STREAK_KEY) || { lastActive: null, count: 0 };
  const doneToday = goals.some(
    (g) => g.completedAt && g.completedAt.slice(0, 10) === today,
  );

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

  const countEl = document.getElementById("streakCount");
  if (countEl) countEl.textContent = streakData.count;
}

/* ── 6. EARNINGS MODULE ────────────────────────── */

const EARNINGS_KEY = "lt_earnings";

function getEarnings() {
  return getData(EARNINGS_KEY) || [];
}
function saveEarnings(e) {
  saveData(EARNINGS_KEY, e);
}

function initEarnings() {
  // Default date to today
  document.getElementById("earningDate").value = todayISO();

  document
    .getElementById("addEarningBtn")
    .addEventListener("click", addEarning);
  document.getElementById("earningAmount").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addEarning();
  });

  renderEarnings();
}

function addEarning() {
  const amount = parseFloat(document.getElementById("earningAmount").value);
  const date = document.getElementById("earningDate").value;
  const source =
    document.getElementById("earningSource").value.trim() || "Income";

  if (isNaN(amount) || amount <= 0) {
    showToast("Please enter a valid amount.", "warning");
    return;
  }
  if (!date) {
    showToast("Please select a date.", "warning");
    return;
  }

  const earnings = getEarnings();
  earnings.unshift({
    id: genId(),
    amount,
    date,
    source,
    createdAt: new Date().toISOString(),
  });
  saveEarnings(earnings);

  document.getElementById("earningAmount").value = "";
  document.getElementById("earningSource").value = "";
  document.getElementById("earningDate").value = todayISO();

  showToast(`${formatCurrency(amount)} entry added!`, "success");
  renderEarnings();
  renderDashboard();
}

function deleteEarning(id) {
  const earnings = getEarnings().filter((e) => e.id !== id);
  saveEarnings(earnings);
  showToast("Entry removed.", "info");
  renderEarnings();
  renderDashboard();
}

function renderEarnings() {
  const list = document.getElementById("earningsList");
  if (!list) return;

  const earnings = getEarnings();
  const total = earnings.reduce((s, e) => s + Number(e.amount), 0);

  // Update header total
  const badge = document.getElementById("earningsTotalBadge");
  if (badge) badge.textContent = formatCurrency(total);

  const countBadge = document.getElementById("earningsCountBadge");
  if (countBadge)
    countBadge.textContent = `${earnings.length} ${earnings.length === 1 ? "entry" : "entries"}`;

  if (!earnings.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">◇</div>
        <p>No earnings logged yet — add your first entry above!</p>
      </div>`;
    return;
  }

  list.innerHTML = earnings
    .map(
      (e) => `
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
  `,
    )
    .join("");
}

/* ── 7. REMINDERS MODULE ───────────────────────── */

const REMINDERS_KEY = "lt_reminders";
let notifPermission = Notification?.permission || "default";

function getReminders() {
  return getData(REMINDERS_KEY) || [];
}
function saveReminders(r) {
  saveData(REMINDERS_KEY, r);
}

function initReminders() {
  document
    .getElementById("addReminderBtn")
    .addEventListener("click", addReminder);
  document.getElementById("reminderText").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addReminder();
  });

  const notifBtn = document.getElementById("notifPermBtn");
  notifBtn.addEventListener("click", requestNotifPermission);
  updateNotifBtn();

  renderReminders();
  scheduleReminderChecks();
}

function updateNotifBtn() {
  const btn = document.getElementById("notifPermBtn");
  if (!btn) return;
  if (notifPermission === "granted") {
    btn.textContent = "✓ Alerts Active";
    btn.classList.add("notif-granted");
  } else {
    btn.textContent = "Enable Alerts";
    btn.classList.remove("notif-granted");
  }
}

function requestNotifPermission() {
  if (!("Notification" in window)) {
    showToast("Browser notifications not supported.", "warning");
    return;
  }
  if (notifPermission === "granted") {
    showToast("Alerts are already active.", "info");
    return;
  }
  Notification.requestPermission().then((perm) => {
    notifPermission = perm;
    updateNotifBtn();
    if (perm === "granted") {
      showToast("Browser alerts enabled!", "success");
      new Notification("Life Tracker", {
        body: "You will now receive reminder alerts.",
      });
    } else {
      showToast("Permission denied — alerts will not fire.", "warning");
    }
  });
}

function addReminder() {
  const text = document.getElementById("reminderText").value.trim();
  const time = document.getElementById("reminderTime").value;
  const priority = document.getElementById("reminderPriority").value;

  if (!text) {
    showToast("Please enter reminder text.", "warning");
    return;
  }

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

  document.getElementById("reminderText").value = "";
  document.getElementById("reminderTime").value = "";

  showToast("Reminder added!", "success");
  renderReminders();
  renderDashboard();
}

function dismissReminder(id) {
  const reminders = getReminders();
  const r = reminders.find((r) => r.id === id);
  if (!r) return;
  r.done = !r.done;
  saveReminders(reminders);
  renderReminders();
  renderDashboard();
}

function deleteReminder(id) {
  const reminders = getReminders().filter((r) => r.id !== id);
  saveReminders(reminders);
  showToast("Reminder removed.", "info");
  renderReminders();
  renderDashboard();
}

function renderReminders() {
  const list = document.getElementById("remindersList");
  if (!list) return;

  const reminders = getReminders();
  const activeCount = reminders.filter((r) => !r.done).length;

  const countBadge = document.getElementById("remindersCountBadge");
  if (countBadge)
    countBadge.textContent = `${reminders.length} reminder${reminders.length !== 1 ? "s" : ""}`;

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

  list.innerHTML = sorted
    .map(
      (r) => `
    <div class="reminder-item ${r.done ? "done" : ""}">
      <div class="priority-dot ${r.priority}"></div>
      <div class="reminder-body">
        <div class="reminder-text-content">${escHtml(r.text)}</div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:4px;">
          ${r.time ? `<span class="reminder-time">⏰ ${r.time}</span>` : ""}
          <span class="reminder-priority-label priority-label-${r.priority}">${r.priority}</span>
        </div>
      </div>
      <div class="item-actions">
        <button class="reminder-dismiss" onclick="dismissReminder('${r.id}')" title="${r.done ? "Reactivate" : "Dismiss"}">
          ${r.done ? "↺" : "✓"}
        </button>
        <button class="icon-btn" onclick="deleteReminder('${r.id}')" title="Delete">✕</button>
      </div>
    </div>
  `,
    )
    .join("");
}

function scheduleReminderChecks() {
  // Check every minute if a reminder time matches current time
  setInterval(() => {
    if (notifPermission !== "granted") return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    getReminders().forEach((r) => {
      if (!r.done && r.time === currentTime) {
        new Notification("Life Tracker Reminder", {
          body: r.text,
          icon: "assets/icon-192.png",
        });
      }
    });
  }, 60000);
}

/* ── 8. DASHBOARD MODULE ───────────────────────── */

let earningsChart = null;

function renderDashboard() {
  const goals = getGoals();
  const earnings = getEarnings();
  const reminders = getReminders();

  // Summary cards
  const totalEarnings = earnings.reduce((s, e) => s + Number(e.amount), 0);
  const completedGoals = goals.filter((g) => g.completed).length;
  const activeReminders = reminders.filter((r) => !r.done).length;

  setText("dash-total-earnings", formatCurrency(totalEarnings));
  setText(
    "dash-earnings-count",
    `${earnings.length} ${earnings.length === 1 ? "entry" : "entries"}`,
  );
  setText("dash-total-goals", goals.length);
  setText("dash-goals-complete", `${completedGoals} completed`);
  setText("dash-total-reminders", activeReminders);
  setText("dash-reminders-sub", "active");

  // Active goals on dashboard
  renderDashGoals(goals);

  // Earnings chart
  renderEarningsChart(earnings);
}

function renderDashGoals(goals) {
  const list = document.getElementById("dash-goals-list");
  if (!list) return;

  const active = goals.filter((g) => !g.completed).slice(0, 5);

  if (!active.length) {
    const done = goals.filter((g) => g.completed).length;
    list.innerHTML = done
      ? `<div class="empty-state small"><p>All ${done} goal${done > 1 ? "s" : ""} completed! 🎉 <button class="inline-btn" data-tab="goals">Add more →</button></p></div>`
      : `<div class="empty-state small"><p>No goals yet. <button class="inline-btn" data-tab="goals">Add one →</button></p></div>`;

    // Re-attach listener for dynamically created buttons
    list.querySelectorAll("[data-tab]").forEach((el) => {
      el.addEventListener("click", () => switchTab(el.dataset.tab));
    });
    return;
  }

  list.innerHTML = active
    .map(
      (g) => `
    <div class="dash-goal-item">
      <div class="dash-goal-dot ${g.completed ? "done" : ""}"></div>
      <div class="dash-goal-name">${escHtml(g.title)}</div>
      <span class="dash-goal-tag">${g.category}</span>
    </div>
  `,
    )
    .join("");
}

function renderEarningsChart(earnings) {
  const ctx = document.getElementById("earningsChart");
  const emptyMsg = document.getElementById("chartEmpty");
  if (!ctx) return;

  const sorted = [...earnings].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );
  const recent = sorted.slice(-10);

  if (!recent.length) {
    emptyMsg?.classList.remove("hidden");
    ctx.style.display = "none";
    if (earningsChart) {
      earningsChart.destroy();
      earningsChart = null;
    }
    return;
  }

  emptyMsg?.classList.add("hidden");
  ctx.style.display = "block";

  const labels = recent.map((e) => formatDate(e.date));
  const data = recent.map((e) => Number(e.amount));
  const accum = data.reduce((acc, v, i) => {
    acc.push((acc[i - 1] || 0) + v);
    return acc;
  }, []);

  if (earningsChart) earningsChart.destroy();

  earningsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          type: "line",
          label: "Cumulative",
          data: accum,
          borderColor: "#6366F1",
          backgroundColor: "#6366F122",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: "#6366F1",
          yAxisID: "y1",
        },
        {
          type: "bar",
          label: "Amount",
          data,
          backgroundColor: "#10B98133",
          borderColor: "#10B981",
          borderWidth: 1.5,
          borderRadius: 4,
          yAxisID: "y",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1A2235",
          borderColor: "#2A3B54",
          borderWidth: 1,
          titleColor: "#94A3B8",
          bodyColor: "#F1F5F9",
          callbacks: {
            label: (ctx) => {
              const val = formatCurrency(ctx.parsed.y);
              return ` ${ctx.dataset.label}: ${val}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "#1F2D42" },
          ticks: {
            color: "#475569",
            font: { size: 10, family: "Inter" },
            maxRotation: 30,
          },
        },
        y: {
          position: "left",
          grid: { color: "#1F2D42" },
          ticks: {
            color: "#10B981",
            font: { size: 10, family: "JetBrains Mono" },
            callback: (v) => "$" + v,
          },
        },
        y1: {
          position: "right",
          grid: { drawOnChartArea: false },
          ticks: {
            color: "#6366F1",
            font: { size: 10, family: "JetBrains Mono" },
            callback: (v) => "$" + v,
          },
        },
      },
    },
  });

  const label = document.getElementById("chartPeriodLabel");
  if (label) label.textContent = `Last ${recent.length} entries`;
}

/* ── 9. Export ─────────────────────────────────── */

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    goals: getGoals(),
    earnings: getEarnings(),
    reminders: getReminders(),
    streak: getData(STREAK_KEY),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lifetrack-export-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Data exported!", "success");
}

/* ── 10. Utility ───────────────────────────────── */

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ── 11. PWA Service Worker ────────────────────── */

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("service-worker.js")
      .then(() => console.log("[SW] Registered"))
      .catch((err) => console.warn("[SW] Registration failed:", err));
  }
}

/* ── 13. AI CHAT MODULE (Google Gemini) ──────────── */

const CHAT_KEY = "lt_chat_history";
const APIKEY_KEY = "lt_gemini_api_key";
const MODEL_KEY = "lt_gemini_model";
let chatHistory = []; // [{role, parts:[{text}]}] Gemini format
let isAiTyping = false;

/* ── All Gemini models, top → lowest ── */
const GEMINI_MODELS = [
  // ─────────────────────────────
  // 🧠 Gemini 2.5 (Flagship)
  // ─────────────────────────────
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    tier: "2.5 · Flagship reasoning",
    badge: "🧠 Smartest",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    tier: "2.5 · Best balance",
    badge: "⚡ Popular",
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    tier: "2.5 · Ultra cheap",
    badge: "💸 Cheapest",
  },
  {
    id: "gemini-2.5-flash-lite-001",
    label: "Gemini 2.5 Flash Lite 001",
    tier: "2.5 · Stable lite",
    badge: "💨 Lite",
  },

  // ─────────────────────────────
  // ⚡ Gemini 2.0 Series
  // ─────────────────────────────
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    tier: "2.0 · Fast general",
    badge: "⚡ Fast",
  },
  {
    id: "gemini-2.0-flash-001",
    label: "Gemini 2.0 Flash 001",
    tier: "2.0 · Stable build",
    badge: "✦ Stable",
  },
  {
    id: "gemini-2.0-flash-lite",
    label: "Gemini 2.0 Flash Lite",
    tier: "2.0 · Lightweight",
    badge: "💨 Lite",
  },
  {
    id: "gemini-2.0-flash-lite-001",
    label: "Gemini 2.0 Flash Lite 001",
    tier: "2.0 · Stable lite",
    badge: "🪶 Tiny",
  },

  // ─────────────────────────────
  // 🧠 Gemini 1.5 Series
  // ─────────────────────────────
  {
    id: "gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    tier: "1.5 · Long context (2M tokens)",
    badge: "📚 Long ctx",
  },
  {
    id: "gemini-1.5-flash",
    label: "Gemini 1.5 Flash",
    tier: "1.5 · Versatile fast",
    badge: "🌀 Solid",
  },
  {
    id: "gemini-1.5-flash-8b",
    label: "Gemini 1.5 Flash 8B",
    tier: "1.5 · Ultra lightweight",
    badge: "🪶 Tiny",
  },

  // ─────────────────────────────
  // 🔥 Latest / Alias models
  // ─────────────────────────────
  {
    id: "gemini-flash-latest",
    label: "Gemini Flash Latest",
    tier: "Auto · Latest Flash",
    badge: "🚀 Latest",
  },
  {
    id: "gemini-flash-lite-latest",
    label: "Gemini Flash Lite Latest",
    tier: "Auto · Latest Lite",
    badge: "⚡ Auto",
  },
  {
    id: "gemini-pro-latest",
    label: "Gemini Pro Latest",
    tier: "Auto · Latest Pro",
    badge: "🧠 Auto",
  },

  // ─────────────────────────────
  // 🖼️ Image Models (Nano Banana / Imagen)
  // ─────────────────────────────
  {
    id: "gemini-2.5-flash-image",
    label: "Nano Banana",
    tier: "Image generation",
    badge: "🖼️ Image",
  },

  {
    id: "gemini-3.1-flash-image",
    label: "Nano Banana 2",
    tier: "Image gen (new)",
    badge: "🖼️ New",
  },
  {
    id: "gemini-3.1-flash-image-preview",
    label: "Nano Banana 2 Preview",
    tier: "Image gen preview",
    badge: "🧪 Preview",
  },

  {
    id: "gemini-3-pro-image",
    label: "Nano Banana Pro",
    tier: "Pro image model",
    badge: "💎 Pro",
  },
  {
    id: "gemini-3-pro-image-preview",
    label: "Nano Banana Pro Preview",
    tier: "Pro image preview",
    badge: "🧪 Preview",
  },

  {
    id: "nano-banana-pro-preview",
    label: "Nano Banana Pro (Alt)",
    tier: "Image system model",
    badge: "🖼️ Alt",
  },

  {
    id: "imagen-4.0-generate-001",
    label: "Imagen 4",
    tier: "Google Imagen model",
    badge: "🎨 Image",
  },
  {
    id: "imagen-4.0-fast-generate-001",
    label: "Imagen 4 Fast",
    tier: "Fast image gen",
    badge: "⚡ Fast",
  },
  {
    id: "imagen-4.0-ultra-generate-001",
    label: "Imagen 4 Ultra",
    tier: "High quality image gen",
    badge: "💎 Ultra",
  },

  // ─────────────────────────────
  // 🎬 Video Models (Veo)
  // ─────────────────────────────
  {
    id: "veo-2.0-generate-001",
    label: "Veo 2",
    tier: "Video generation",
    badge: "🎬 Video",
  },

  {
    id: "veo-3.0-generate-001",
    label: "Veo 3",
    tier: "Video gen latest",
    badge: "🎬 New",
  },
  {
    id: "veo-3.0-fast-generate-001",
    label: "Veo 3 Fast",
    tier: "Fast video gen",
    badge: "⚡ Fast",
  },

  {
    id: "veo-3.1-generate-preview",
    label: "Veo 3.1",
    tier: "Video preview model",
    badge: "🧪 Preview",
  },
  {
    id: "veo-3.1-fast-generate-preview",
    label: "Veo 3.1 Fast",
    tier: "Fast preview video",
    badge: "⚡ Preview",
  },
  {
    id: "veo-3.1-lite-generate-preview",
    label: "Veo 3.1 Lite",
    tier: "Light video model",
    badge: "💨 Lite",
  },

  // ─────────────────────────────
  // 🔊 TTS (Text to Speech)
  // ─────────────────────────────
  {
    id: "gemini-2.5-flash-preview-tts",
    label: "Gemini Flash TTS",
    tier: "Speech generation",
    badge: "🔊 Voice",
  },
  {
    id: "gemini-2.5-pro-preview-tts",
    label: "Gemini Pro TTS",
    tier: "High quality speech",
    badge: "🎙️ Pro Voice",
  },
  {
    id: "gemini-3.1-flash-tts-preview",
    label: "Gemini Flash TTS 3.1",
    tier: "Latest speech model",
    badge: "🔊 New",
  },

  // ─────────────────────────────
  // 🧠 Embeddings
  // ─────────────────────────────
  {
    id: "gemini-embedding-001",
    label: "Embedding 001",
    tier: "Text embeddings",
    badge: "🔎 Search",
  },
  {
    id: "gemini-embedding-2",
    label: "Embedding 2",
    tier: "Improved embeddings",
    badge: "🔎 New",
  },
  {
    id: "gemini-embedding-2-preview",
    label: "Embedding 2 Preview",
    tier: "Preview embeddings",
    badge: "🧪 Preview",
  },

  // ─────────────────────────────
  // 🧪 Agent / Research / Tools
  // ─────────────────────────────
  {
    id: "aqa",
    label: "AQA (Answering Model)",
    tier: "QA + citations",
    badge: "📚 QA",
  },

  {
    id: "deep-research-preview-04-2026",
    label: "Deep Research Preview",
    tier: "Research agent",
    badge: "🧪 Research",
  },
  {
    id: "deep-research-pro-preview-12-2025",
    label: "Deep Research Pro",
    tier: "Advanced research",
    badge: "🧠 Pro",
  },
  {
    id: "deep-research-max-preview-04-2026",
    label: "Deep Research Max",
    tier: "Highest research level",
    badge: "💎 Max",
  },

  {
    id: "antigravity-preview-05-2026",
    label: "Antigravity Agent",
    tier: "Autonomous agent",
    badge: "🤖 Agent",
  },

  {
    id: "gemini-2.5-computer-use-preview-10-2025",
    label: "Computer Use Model",
    tier: "UI automation agent",
    badge: "🖥️ Agent",
  },

  // ─────────────────────────────
  // 🤖 Robotics
  // ─────────────────────────────
  {
    id: "gemini-robotics-er-1.5-preview",
    label: "Robotics ER 1.5",
    tier: "Robotics control",
    badge: "🤖 Robot",
  },
  {
    id: "gemini-robotics-er-1.6-preview",
    label: "Robotics ER 1.6",
    tier: "Advanced robotics",
    badge: "🤖 New",
  },

  // ─────────────────────────────
  // 🧠 Open models (Gemma)
  // ─────────────────────────────
  {
    id: "gemma-4-26b-a4b-it",
    label: "Gemma 4 26B",
    tier: "Open model",
    badge: "🧠 Open",
  },
  {
    id: "gemma-4-31b-it",
    label: "Gemma 4 31B",
    tier: "Large open model",
    badge: "💪 Strong",
  },

  // ─────────────────────────────
  // 🎵 Audio / Media
  // ─────────────────────────────
  {
    id: "lyria-3-clip-preview",
    label: "Lyria 3 Clip",
    tier: "Music/audio generation",
    badge: "🎵 Audio",
  },
  {
    id: "lyria-3-pro-preview",
    label: "Lyria 3 Pro",
    tier: "Advanced music model",
    badge: "🎼 Pro",
  },
];

function initAiChat() {
  // Inject the settings bar + model selector into the DOM
  injectChatSettingsBar();

  const sendBtn = document.getElementById("chatSendBtn");
  const input = document.getElementById("chatInput");
  const clearBtn = document.getElementById("clearChatBtn");

  sendBtn.addEventListener("click", sendChatMessage);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  // Auto-resize textarea
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });

  // Suggestion chips
  document.querySelectorAll(".suggestion-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      input.value = chip.dataset.msg;
      input.dispatchEvent(new Event("input"));
      sendChatMessage();
    });
  });

  clearBtn.addEventListener("click", clearChat);

  // Restore persisted chat
  const saved = getData(CHAT_KEY);
  if (saved?.messages?.length) {
    chatHistory = saved.api || [];
    saved.messages.forEach((m) =>
      appendBubble(m.role, m.content, m.time, true),
    );
    hideWelcome();
  }
}

/* Inject API key input + model dropdown above the chat shell */
function injectChatSettingsBar() {
  const panel = document.getElementById("tab-ai");
  if (!panel || document.getElementById("chatSettingsBar")) return;

  const savedKey = getData(APIKEY_KEY) || "";
  const savedModel = getData(MODEL_KEY) || GEMINI_MODELS[0].id;

  const bar = document.createElement("div");
  bar.id = "chatSettingsBar";
  bar.className = "chat-settings-bar";
  bar.innerHTML = `
    <div class="settings-row">
      <div class="settings-field">
        <label class="settings-label">Google Gemini API Key</label>
        <div class="apikey-wrap">
          <input
            type="password"
            id="geminiApiKeyInput"
            class="input-field settings-input"
            placeholder="Paste your key from aistudio.google.com/apikey"
            value="${escHtml(savedKey)}"
            autocomplete="off"
          />
          <button class="apikey-toggle" id="apiKeyToggle" title="Show/hide key">👁</button>
          <button class="btn-primary settings-save-btn" id="saveApiKeyBtn">Save</button>
        </div>
        ${savedKey ? '<span class="key-status key-ok">✓ Key saved</span>' : '<span class="key-status key-missing">No key set</span>'}
      </div>
    </div>
    <div class="settings-row">
      <div class="settings-field">
        <label class="settings-label">Model</label>
        <select id="geminiModelSelect" class="input-field select-field model-select">
          ${GEMINI_MODELS.map(
            (m) => `
            <option value="${m.id}" ${m.id === savedModel ? "selected" : ""}>
              ${m.badge}  ${m.label} — ${m.tier}
            </option>`,
          ).join("")}
        </select>
      </div>
      <div class="model-info-badge" id="modelInfoBadge"></div>
    </div>
  `;

  // Insert before .chat-shell
  const shell = panel.querySelector(".chat-shell");
  panel.insertBefore(bar, shell);

  // Wire up events
  document
    .getElementById("saveApiKeyBtn")
    .addEventListener("click", saveApiKey);
  document.getElementById("apiKeyToggle").addEventListener("click", () => {
    const inp = document.getElementById("geminiApiKeyInput");
    inp.type = inp.type === "password" ? "text" : "password";
  });
  document
    .getElementById("geminiApiKeyInput")
    .addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveApiKey();
    });
  document
    .getElementById("geminiModelSelect")
    .addEventListener("change", (e) => {
      saveData(MODEL_KEY, e.target.value);
      updateModelBadge(e.target.value);
      showToast(
        `Model switched to ${e.target.options[e.target.selectedIndex].text.trim().split("—")[0].trim()}`,
        "info",
      );
    });

  updateModelBadge(savedModel);
}

function saveApiKey() {
  const key = document.getElementById("geminiApiKeyInput").value.trim();
  if (!key) {
    showToast("Please paste your API key first.", "warning");
    return;
  }
  saveData(APIKEY_KEY, key);
  // Update status indicator
  const bar = document.getElementById("chatSettingsBar");
  const existing = bar.querySelector(".key-status");
  if (existing) {
    existing.className = "key-status key-ok";
    existing.textContent = "✓ Key saved";
  }
  showToast("API key saved!", "success");
}

function updateModelBadge(modelId) {
  const m = GEMINI_MODELS.find((x) => x.id === modelId);
  const el = document.getElementById("modelInfoBadge");
  if (!el || !m) return;
  el.innerHTML = `<span class="badge-pill">${m.badge}</span><span class="badge-tier">${m.tier}</span>`;
}

function getActiveKey() {
  return getData(APIKEY_KEY) || "";
}
function getActiveModel() {
  return getData(MODEL_KEY) || GEMINI_MODELS[0].id;
}

/* Build the system prompt with live user data */
function buildSystemPrompt() {
  const goals = getGoals();
  const earnings = getEarnings();
  const reminders = getReminders();
  const streak = getData(STREAK_KEY) || { count: 0 };
  const totalEarnings = earnings.reduce((s, e) => s + Number(e.amount), 0);
  const doneGoals = goals.filter((g) => g.completed).length;

  return `You are an empathetic, smart personal AI coach inside a Life Tracker app called LifeTrack. You have full, real-time context of the user's personal data shown below. Use it naturally in your responses — give specific, actionable, personalised advice rather than generic tips.

Be warm but concise. Use markdown lightly (bold for emphasis, bullet lists when helpful). Never be preachy.

═══ USER'S CURRENT DATA ═══

GOALS (${goals.length} total, ${doneGoals} completed, ${goals.length - doneGoals} active):
${
  goals.length
    ? goals
        .map(
          (g) =>
            `• [${g.completed ? "DONE" : "ACTIVE"}] "${g.title}" — Category: ${g.category}${g.desc ? ` | Note: ${g.desc}` : ""}${g.completedAt ? ` | Completed: ${g.completedAt.slice(0, 10)}` : ` | Added: ${g.createdAt.slice(0, 10)}`}`,
        )
        .join("\n")
    : "• No goals added yet."
}

EARNINGS (${earnings.length} entries, total: $${totalEarnings.toFixed(2)}):
${
  earnings.length
    ? earnings
        .slice(0, 15)
        .map(
          (e) =>
            `• $${Number(e.amount).toFixed(2)} from "${e.source}" on ${e.date}`,
        )
        .join("\n") +
      (earnings.length > 15
        ? `\n• ... and ${earnings.length - 15} more entries`
        : "")
    : "• No earnings logged yet."
}

REMINDERS (${reminders.length} total, ${reminders.filter((r) => !r.done).length} active):
${
  reminders.length
    ? reminders
        .map(
          (r) =>
            `• [${r.done ? "DONE" : r.priority.toUpperCase()}] "${r.text}"${r.time ? ` at ${r.time}` : ""}`,
        )
        .join("\n")
    : "• No reminders added yet."
}

STREAK: ${streak.count} day${streak.count !== 1 ? "s" : ""} active streak

Today's date: ${new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
═══════════════════════════`;
}

async function sendChatMessage() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  const apiKey = getActiveKey();
  const modelId = getActiveModel();

  if (!text || isAiTyping) return;

  if (!apiKey) {
    showToast("Paste your Gemini API key above and click Save.", "warning");
    appendBubble(
      "ai",
      "⚠️ **No API key set.** Paste your Google Gemini API key in the field above and click **Save**. Get one free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).",
      nowTime(),
      false,
      true,
    );
    hideWelcome();
    return;
  }

  hideWelcome();
  const time = nowTime();
  appendBubble("user", text, time);

  // Gemini message format: {role, parts:[{text}]}
  chatHistory.push({ role: "user", parts: [{ text }] });

  input.value = "";
  input.style.height = "auto";

  isAiTyping = true;
  toggleSendBtn(true);
  const typingEl = showTyping();

  try {
    // Gemini REST endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemPrompt() }] },
        contents: chatHistory,
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      }),
    });

    typingEl.remove();

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err?.error?.message || `API error ${response.status}`;
      throw new Error(msg);
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.output ||
      "No response received.";

    chatHistory.push({ role: "model", parts: [{ text: reply }] });
    appendBubble("ai", reply, nowTime());
    persistChat();
  } catch (err) {
    typingEl?.remove();
    appendBubble(
      "ai",
      `**Error:** ${err.message || "Something went wrong."}`,
      nowTime(),
      false,
      true,
    );
    showToast("Gemini request failed — check your API key or model.", "error");
    chatHistory.pop();
  } finally {
    isAiTyping = false;
    toggleSendBtn(false);
  }
}

function appendBubble(
  role,
  content,
  time,
  skipPersist = false,
  isError = false,
) {
  const messages = document.getElementById("chatMessages");
  const isUser = role === "user";

  const wrap = document.createElement("div");
  wrap.className = `chat-msg ${isUser ? "user" : "ai"}`;

  const rendered = isUser ? escHtml(content) : renderMarkdown(content);

  wrap.innerHTML = `
    <div class="msg-avatar">${isUser ? "✦" : "✦"}</div>
    <div class="msg-wrap">
      <div class="msg-bubble${isError ? " error-bubble" : ""}">${rendered}</div>
      <span class="msg-time">${time}</span>
    </div>`;

  messages.appendChild(wrap);
  messages.scrollTop = messages.scrollHeight;

  if (!skipPersist) persistChat();
}

function showTyping() {
  const messages = document.getElementById("chatMessages");
  const el = document.createElement("div");
  el.className = "chat-msg ai";
  el.id = "typingIndicator";
  el.innerHTML = `
    <div class="msg-avatar">✦</div>
    <div class="msg-bubble">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>`;
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
  return el;
}

function hideWelcome() {
  const welcome = document.querySelector(".chat-welcome");
  if (welcome) welcome.style.display = "none";
}

function toggleSendBtn(disabled) {
  const btn = document.getElementById("chatSendBtn");
  const icon = document.getElementById("chatSendIcon");
  btn.disabled = disabled;
  icon.textContent = disabled ? "…" : "↑";
}

function clearChat() {
  chatHistory = [];
  saveData(CHAT_KEY, null);
  const messages = document.getElementById("chatMessages");
  messages.innerHTML = `
    <div class="chat-welcome">
      <div class="chat-welcome-icon">✦</div>
      <h3>Your personal AI coach</h3>
      <p>I have full context of your goals, earnings, and reminders. Ask me anything about your progress, get advice, or just think out loud.</p>
      <div class="chat-suggestions" id="chatSuggestions">
        <button class="suggestion-chip" data-msg="Give me a summary of my life tracker data">Summarise my data</button>
        <button class="suggestion-chip" data-msg="How am I doing with my goals? Any advice?">Goals advice</button>
        <button class="suggestion-chip" data-msg="Analyse my earnings and suggest ways to increase income">Earnings analysis</button>
        <button class="suggestion-chip" data-msg="What should I prioritise today based on my reminders?">Today's priorities</button>
      </div>
    </div>`;

  messages.querySelectorAll(".suggestion-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const input = document.getElementById("chatInput");
      input.value = chip.dataset.msg;
      input.dispatchEvent(new Event("input"));
      sendChatMessage();
    });
  });

  showToast("Chat cleared.", "info");
}

function persistChat() {
  const messages = document.getElementById("chatMessages");
  const bubbles = [...messages.querySelectorAll(".chat-msg")];
  const saved = bubbles.map((b) => ({
    role: b.classList.contains("user") ? "user" : "ai",
    content: b.querySelector(".msg-bubble").textContent,
    time: b.querySelector(".msg-time")?.textContent || "",
  }));
  saveData(CHAT_KEY, { messages: saved, api: chatHistory });
}

/* Lightweight markdown → HTML (bold, italic, code, bullets, line breaks) */
function renderMarkdown(text) {
  return escHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^[-•]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^(?!<)/, "<p>")
    .replace(/(?<!>)$/, "</p>");
}

function nowTime() {
  return new Date().toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function init() {
  initNavigation();
  initGoals();
  initEarnings();
  initReminders();
  initAiChat();
  renderDashboard();
  registerServiceWorker();
}

document.addEventListener("DOMContentLoaded", init);
