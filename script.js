
/* =========================================
   STUDENT HUB
   Interactive functionality
   ========================================= */

"use strict";

// -----------------------------------------
// Storage helpers
// -----------------------------------------

const STORAGE_KEYS = {
  assignments: "studentHub_assignments",
  sessions: "studentHub_sessions",
  notes: "studentHub_notes",
  focus: "studentHub_focus",
  goal: "studentHub_weeklyGoal"
};

function loadData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : JSON.parse(saved);
  } catch (error) {
    console.error("Could not load saved data:", error);
    return fallback;
  }
}

function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Could not save data:", error);
    alert("Your browser could not save this change. Check your device storage settings.");
    return false;
  }
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// -----------------------------------------
// Application state
// -----------------------------------------

let assignments = loadData(STORAGE_KEYS.assignments, []);
let sessions = loadData(STORAGE_KEYS.sessions, []);
let notes = loadData(STORAGE_KEYS.notes, []);
let dailyFocus = loadData(STORAGE_KEYS.focus, "");
let weeklyGoal = Number(loadData(STORAGE_KEYS.goal, 10)) || 10;

// Guard against unexpected storage values.
if (!Array.isArray(assignments)) assignments = [];
if (!Array.isArray(sessions)) sessions = [];
if (!Array.isArray(notes)) notes = [];

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => Array.from(document.querySelectorAll(selector));

// -----------------------------------------
// Safe HTML helpers
// -----------------------------------------

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function formatDate(dateString) {
  if (!dateString) return "No date set";

  const date = new Date(dateString + "T00:00:00");

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function todayString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDuration(minutes) {
  const value = Number(minutes) || 0;
  const hours = Math.floor(value / 60);
  const remainingMinutes = value % 60;

  if (hours && remainingMinutes) {
    return `${hours} hr ${remainingMinutes} min`;
  }

  if (hours) return `${hours} hr`;

  return `${remainingMinutes} min`;
}

// -----------------------------------------
// Navigation
// -----------------------------------------

function showSection(sectionId) {
  const target = document.getElementById(sectionId);

  if (!target || !target.classList.contains("page-section")) {
    return;
  }

  $$(".page-section").forEach((section) => {
    const isActive = section.id === sectionId;

    section.classList.toggle("active", isActive);
    section.hidden = !isActive;
  });

  $$(".nav-link").forEach((button) => {
    const isActive = button.dataset.section === sectionId;

    button.classList.toggle("active", isActive);

    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  const activeButton = $(`.nav-link[data-section="${sectionId}"]`);
  const title = activeButton
    ? activeButton.textContent.trim()
    : sectionId;

  $("#pageTitle").textContent = title;

  closeMobileMenu();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$(".nav-link").forEach((button) => {
  button.addEventListener("click", () => {
    showSection(button.dataset.section);
  });
});

$$("[data-go]").forEach((button) => {
  button.addEventListener("click", () => {
    showSection(button.dataset.go);
  });
});

const sidebar = $("#sidebar");
const menuToggle = $("#menuToggle");

function closeMobileMenu() {
  if (!sidebar || !menuToggle) return;

  sidebar.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
}

if (menuToggle && sidebar) {
  menuToggle.addEventListener("click", () => {
    const isOpen = sidebar.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (event) => {
    const clickedInsideSidebar = sidebar.contains(event.target);
    const clickedToggle = menuToggle.contains(event.target);

    if (!clickedInsideSidebar && !clickedToggle) {
      closeMobileMenu();
    }
  });
}

// -----------------------------------------
// Assignment tracker
// -----------------------------------------

const assignmentForm = $("#assignmentForm");

if (assignmentForm) {
  assignmentForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = $("#assignmentTitle").value.trim();
    const subject = $("#assignmentSubject").value.trim();
    const dueDate = $("#assignmentDueDate").value;
    const priority = $("#assignmentPriority").value;

    if (!title || !subject || !dueDate) {
      alert("Please complete all assignment fields.");
      return;
    }

    if (dueDate < todayString()) {
      const proceed = confirm(
        "This due date is in the past. Would you like to add it anyway?"
      );

      if (!proceed) return;
    }

    const assignment = {
      id: makeId(),
      title,
      subject,
      dueDate,
      priority,
      completed: false,
      createdAt: new Date().toISOString()
    };

    assignments.unshift(assignment);

    if (!saveData(STORAGE_KEYS.assignments, assignments)) {
      assignments.shift();
      return;
    }

    assignmentForm.reset();

    renderAssignments();
    renderDashboard();
    renderProgress();

    showMessage("assignmentTitle", "Assignment added successfully!");
  });
}

function showMessage(inputId, message) {
  const input = document.getElementById(inputId);

  if (!input) return;

  const parent = input.closest("form");
  if (!parent) return;

  let messageElement = parent.querySelector(".temporary-message");

  if (!messageElement) {
    messageElement = document.createElement("p");
    messageElement.className = "temporary-message form-message";
    messageElement.setAttribute("role", "status");
    parent.appendChild(messageElement);
  }

  messageElement.textContent = message;
}

function getAssignmentStatus(assignment) {
  if (assignment.completed) return "completed";

  return "pending";
}

function renderAssignments() {
  const list = $("#assignmentList");
  if (!list) return;

  const searchTerm = ($("#assignmentSearch")?.value || "")
    .trim()
    .toLowerCase();

  const filter = $("#assignmentFilter")?.value || "all";

  const filtered = assignments
    .filter((assignment) => {
      const matchesSearch =
        String(assignment.title || "").toLowerCase().includes(searchTerm) ||
        String(assignment.subject || "").toLowerCase().includes(searchTerm);

      if (!matchesSearch) return false;

      if (filter === "pending") return !assignment.completed;
      if (filter === "completed") return assignment.completed;
      if (filter === "high") {
        return assignment.priority === "high" && !assignment.completed;
      }

      return true;
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) {
        return Number(a.completed) - Number(b.completed);
      }

      return String(a.dueDate || "").localeCompare(String(b.dueDate || ""));
    });

  if (filtered.length === 0) {
    list.innerHTML = `
      <p class="empty-state">
        ${assignments.length === 0
          ? "No assignments yet. Add your first one above!"
          : "No assignments match your search or filter."}
      </p>
    `;

    return;
  }

  list.innerHTML = filtered.map((assignment) => {
    const completed = Boolean(assignment.completed);
    const priority = ["high", "medium", "low"].includes(assignment.priority)
      ? assignment.priority
      : "medium";

    return `
      <article class="assignment-item ${completed ? "is-completed" : ""}">
        <div class="item-details">
          <h3>${escapeHTML(assignment.title)}</h3>
          <p>${escapeHTML(assignment.subject)}</p>
          <p>📅 Due: ${escapeHTML(formatDate(assignment.dueDate))}</p>
          <p>
            <span class="priority-badge ${priority}">
              ${escapeHTML(priority)} priority
            </span>
            <span class="status-badge ${getAssignmentStatus(assignment)}">
              ${completed ? "Completed" : "Pending"}
            </span>
          </p>
        </div>

        <div class="item-actions">
          <button
            type="button"
            data-action="toggle-assignment"
            data-id="${escapeHTML(assignment.id)}"
          >${completed ? "Undo" : "✓ Complete"}</button>

          <button
            type="button"
            class="delete-button"
            data-action="delete-assignment"
            data-id="${escapeHTML(assignment.id)}"
          >Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

const assignmentSearch = $("#assignmentSearch");
const assignmentFilter = $("#assignmentFilter");

if (assignmentSearch) {
  assignmentSearch.addEventListener("input", renderAssignments);
}

if (assignmentFilter) {
  assignmentFilter.addEventListener("change", renderAssignments);
}

const assignmentList = $("#assignmentList");

if (assignmentList) {
  assignmentList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;
    const index = assignments.findIndex((item) => item.id === id);

    if (index === -1) return;

    if (action === "toggle-assignment") {
      const oldValue = assignments[index].completed;
      assignments[index].completed = !oldValue;

      if (!saveData(STORAGE_KEYS.assignments, assignments)) {
        assignments[index].completed = oldValue;
        return;
      }
    }

    if (action === "delete-assignment") {
      const item = assignments[index];

      if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) {
        return;
      }

      assignments.splice(index, 1);

      if (!saveData(STORAGE_KEYS.assignments, assignments)) {
        assignments.splice(index, 0, item);
        return;
      }
    }

    renderAssignments();
    renderDashboard();
    renderProgress();
  });
}

// -----------------------------------------
// Dashboard
// -----------------------------------------

function renderDashboard() {
  $("#totalAssignments").textContent = assignments.length;

  $("#pendingAssignments").textContent =
    assignments.filter((item) => !item.completed).length;

  $("#completedAssignments").textContent =
    assignments.filter((item) => item.completed).length;

  $("#totalSessions").textContent = sessions.length;

  const upcomingList = $("#upcomingList");
  if (!upcomingList) return;

  const upcoming = assignments
    .filter((item) => !item.completed)
    .sort((a, b) =>
      String(a.dueDate || "").localeCompare(String(b.dueDate || ""))
    )
    .slice(0, 5);

  if (upcoming.length === 0) {
    upcomingList.innerHTML = `
      <p class="empty-state">
        You're all caught up! Add an assignment whenever you're ready.
      </p>
    `;

    return;
  }

  upcomingList.innerHTML = upcoming.map((item) => `
    <article class="list-item">
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.subject)}</p>
      <p>📅 ${escapeHTML(formatDate(item.dueDate))}</p>
    </article>
  `).join("");
}

// -----------------------------------------
// Daily focus
// -----------------------------------------

const focusForm = $("#focusForm");
const dailyFocusInput = $("#dailyFocus");

if (dailyFocusInput) {
  dailyFocusInput.value = String(dailyFocus || "");
}

if (focusForm) {
  focusForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const previousFocus = dailyFocus;
    dailyFocus = dailyFocusInput.value.trim();

    if (!saveData(STORAGE_KEYS.focus, dailyFocus)) {
      dailyFocus = previousFocus;
      dailyFocusInput.value = dailyFocus;
      return;
    }

    const message = $("#focusMessage");

    if (message) {
      message.textContent = "Your daily focus has been saved. 💜";
    }
  });
}

// -----------------------------------------
// Study planner
// -----------------------------------------

const sessionForm = $("#sessionForm");

if (sessionForm) {
  sessionForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = $("#sessionTitle").value.trim();
    const date = $("#sessionDate").value;
    const time = $("#sessionTime").value;
    const duration = Number($("#sessionDuration").value);

    if (!title || !date || !time || !duration) {
      alert("Please complete all study session fields.");
      return;
    }

    const session = {
      id: makeId(),
      title,
      date,
      time,
      duration,
      createdAt: new Date().toISOString()
    };

    sessions.push(session);

    if (!saveData(STORAGE_KEYS.sessions, sessions)) {
      sessions.pop();
      return;
    }

    sessionForm.reset();
    $("#sessionDuration").value = "60";

    renderSessions();
    renderDashboard();
    renderProgress();

    showMessage("sessionTitle", "Study session added!");
  });
}

function renderSessions() {
  const list = $("#sessionList");
  if (!list) return;

  const sorted = [...sessions].sort((a, b) => {
    const first = `${a.date || ""}T${a.time || "00:00"}`;
    const second = `${b.date || ""}T${b.time || "00:00"}`;

    return first.localeCompare(second);
  });

  if (sorted.length === 0) {
    list.innerHTML = `
      <p class="empty-state">
        No study sessions planned yet. Create your first session above!
      </p>
    `;

    return;
  }

  list.innerHTML = sorted.map((session) => `
    <article class="session-item">
      <div class="item-details">
        <h3>${escapeHTML(session.title)}</h3>
        <p>📅 ${escapeHTML(formatDate(session.date))}</p>
        <p>🕒 ${escapeHTML(session.time || "Time not set")}</p>
        <p>⏱️ ${escapeHTML(formatDuration(session.duration))}</p>
      </div>

      <div class="item-actions">
        <button
          type="button"
          class="delete-button"
          data-action="delete-session"
          data-id="${escapeHTML(session.id)}"
        >Delete</button>
      </div>
    </article>
  `).join("");
}

const sessionList = $("#sessionList");

if (sessionList) {
  sessionList.addEventListener("click", (event) => {
    const button = event.target.closest(
      'button[data-action="delete-session"]'
    );

    if (!button) return;

    const index = sessions.findIndex(
      (item) => item.id === button.dataset.id
    );

    if (index === -1) return;

    const removed = sessions.splice(index, 1)[0];

    if (!saveData(STORAGE_KEYS.sessions, sessions)) {
      sessions.splice(index, 0, removed);
      return;
    }

    renderSessions();
    renderDashboard();
    renderProgress();
  });
}

// -----------------------------------------
// Notes
// -----------------------------------------

const noteForm = $("#noteForm");

if (noteForm) {
  noteForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = $("#noteTitle").value.trim();
    const content = $("#noteContent").value.trim();

    if (!title || !content) {
      alert("Please enter a title and some note content.");
      return;
    }

    const note = {
      id: makeId(),
      title,
      content,
      createdAt: new Date().toISOString()
    };

    notes.unshift(note);

    if (!saveData(STORAGE_KEYS.notes, notes)) {
      notes.shift();
      return;
    }

    noteForm.reset();
    renderNotes();

    showMessage("noteTitle", "Your note has been saved!");
  });
}

function renderNotes() {
  const list = $("#notesList");
  if (!list) return;

  if (notes.length === 0) {
    list.innerHTML = `
      <p class="empty-state">You haven't saved any notes yet.</p>
    `;

    return;
  }

  list.innerHTML = notes.map((note) => `
    <article class="note-card">
      <h3>${escapeHTML(note.title)}</h3>
      <p>${escapeHTML(note.content)}</p>
      <p>Created: ${escapeHTML(
        new Date(note.createdAt).toLocaleDateString()
      )}</p>

      <div class="item-actions">
        <button
          type="button"
          data-action="copy-note"
          data-id="${escapeHTML(note.id)}"
        >Copy</button>

        <button
          type="button"
          class="delete-button"
          data-action="delete-note"
          data-id="${escapeHTML(note.id)}"
        >Delete</button>
      </div>
    </article>
  `).join("");
}

const notesList = $("#notesList");

if (notesList) {
  notesList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const note = notes.find((item) => item.id === button.dataset.id);
    if (!note) return;

    if (button.dataset.action === "delete-note") {
      if (!confirm(`Delete the note "${note.title}"?`)) return;

      const index = notes.findIndex((item) => item.id === note.id);
      notes.splice(index, 1);

      if (!saveData(STORAGE_KEYS.notes, notes)) {
        notes.splice(index, 0, note);
        return;
      }

      renderNotes();
    }

    if (button.dataset.action === "copy-note") {
      const text = `${note.title}\n\n${note.content}`;

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          alert("Note copied to clipboard!");
        } else {
          const temporary = document.createElement("textarea");
          temporary.value = text;
          temporary.style.position = "fixed";
          temporary.style.opacity = "0";
          document.body.appendChild(temporary);
          temporary.select();

          const copied = document.execCommand("copy");
          temporary.remove();

          alert(
            copied
              ? "Note copied to clipboard!"
              : "Copy wasn't available. Please select and copy the note manually."
          );
        }
      } catch (error) {
        alert("Couldn't copy the note. Please try again.");
      }
    }
  });
}


/* =========================================
   STUDY GROUPS
   Create, search, join and save groups
   ========================================= */

const STUDY_GROUPS_KEY = "studentHub_groups";
let studyGroups = loadData(STUDY_GROUPS_KEY, []);

if (!Array.isArray(studyGroups)) {
  studyGroups = [];
}

const studyGroupForm = $("#studyGroupForm");
const studyGroupSearch = $("#groupSearch");
const studyGroupsList = $("#studyGroupsList");

// Display saved groups and filter search results.
function renderStudyGroups() {
  if (!studyGroupsList) return;

  const searchTerm = (studyGroupSearch?.value || "")
    .trim()
    .toLowerCase();

  const filteredGroups = studyGroups.filter((group) => {
    const name = String(group.name || "").toLowerCase();
    const subject = String(group.subject || "").toLowerCase();
    const description = String(group.description || "").toLowerCase();

    return (
      name.includes(searchTerm) ||
      subject.includes(searchTerm) ||
      description.includes(searchTerm)
    );
  });

  if (filteredGroups.length === 0) {
    studyGroupsList.innerHTML = `
      <p class="empty-state">
        ${studyGroups.length === 0
          ? "No study groups yet. Create your first group above! 💜"
          : "No groups match your search. Try another subject or name."}
      </p>
    `;
    return;
  }

  studyGroupsList.innerHTML = filteredGroups.map((group) => `
    <article class="list-item">
      <h3>${escapeHTML(group.name)}</h3>
      <p><strong>Subject:</strong> ${escapeHTML(group.subject)}</p>
      <p><strong>Format:</strong> ${escapeHTML(group.format)}</p>
      <p>${escapeHTML(group.description)}</p>
      <p>
        <strong>Members:</strong>
        ${group.joined ? "You have joined this group" : "You haven't joined yet"}
      </p>
      <div class="item-actions">
        <button
          type="button"
          data-group-action="toggle-membership"
          data-id="${escapeHTML(group.id)}"
        >${group.joined ? "Leave Group" : "Join Group"}</button>
      </div>
    </article>
  `).join("");
}

// Create and save a new group.
if (studyGroupForm) {
  studyGroupForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = $("#groupName").value.trim();
    const subject = $("#groupSubject").value.trim();
    const format = $("#groupFormat").value;
    const description = $("#groupDescription").value.trim();

    if (!name || !subject || !description) {
      alert("Please complete the group name, subject and description.");
      return;
    }

    const newGroup = {
      id: makeId(),
      name,
      subject,
      format,
      description,
      joined: false,
      createdAt: new Date().toISOString()
    };

    studyGroups.unshift(newGroup);

    if (!saveData(STUDY_GROUPS_KEY, studyGroups)) {
      studyGroups.shift();
      return;
    }

    studyGroupForm.reset();

    if (studyGroupSearch) {
      studyGroupSearch.value = "";
    }

    renderStudyGroups();
    showMessage("groupName", "Your study group was created! 💜");
  });
}

// Search by group name, subject or description.
if (studyGroupSearch) {
  studyGroupSearch.addEventListener("input", renderStudyGroups);
}

// Join or leave a group.
if (studyGroupsList) {
  studyGroupsList.addEventListener("click", (event) => {
    const button = event.target.closest(
      'button[data-group-action="toggle-membership"]'
    );

    if (!button) return;

    const group = studyGroups.find(
      (item) => item.id === button.dataset.id
    );

    if (!group) return;

    const previousValue = Boolean(group.joined);
    group.joined = !previousValue;

    if (!saveData(STUDY_GROUPS_KEY, studyGroups)) {
      group.joined = previousValue;
      return;
    }

    renderStudyGroups();
  });
}

// Show saved groups when Student Hub loads.
renderStudyGroups();

// -----------------------------------------
// Progress and weekly goal
// -----------------------------------------

const goalForm = $("#goalForm");
const weeklyGoalInput = $("#weeklyGoal");

if (weeklyGoalInput) {
  weeklyGoalInput.value = weeklyGoal;
}

if (goalForm) {
  goalForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const newGoal = Number(weeklyGoalInput.value);

    if (!Number.isFinite(newGoal) || newGoal < 1 || newGoal > 168) {
      alert("Please choose a weekly goal between 1 and 168 hours.");
      return;
    }

    const previousGoal = weeklyGoal;
    weeklyGoal = newGoal;

    if (!saveData(STORAGE_KEYS.goal, weeklyGoal)) {
      weeklyGoal = previousGoal;
      weeklyGoalInput.value = previousGoal;
      return;
    }

    renderProgress();
    showMessage("weeklyGoal", "Your weekly goal has been saved!");
  });
}

function renderProgress() {
  const completed = assignments.filter((item) => item.completed).length;

  const rate = assignments.length
    ? Math.round((completed / assignments.length) * 100)
    : 0;

  const totalMinutes = sessions.reduce((sum, session) => {
    return sum + (Number(session.duration) || 0);
  }, 0);

  $("#progressCompleted").textContent = completed;
  $("#completionRate").textContent = `${rate}%`;
  $("#studyMinutes").textContent = formatDuration(totalMinutes);

  const hoursPlanned = totalMinutes / 60;
  const goalPercentage = weeklyGoal > 0
    ? Math.min(100, Math.round((hoursPlanned / weeklyGoal) * 100))
    : 0;

  const fill = $("#goalProgressFill");
  const bar = $("#goalProgressBar");
  const text = $("#goalProgressText");

  if (fill) fill.style.width = `${goalPercentage}%`;

  if (bar) bar.setAttribute("aria-valuenow", String(goalPercentage));

  if (text) {
    text.textContent =
      `${hoursPlanned.toFixed(1)} planned study hours out of ` +
      `${weeklyGoal} hours (${goalPercentage}%).`;
  }
}


/* =========================================
   SCHEDULED ASSIGNMENT AND STUDY REMINDERS
   ========================================= */

const SENT_REMINDERS_KEY = "studentHub_sentReminders";

let reminderTimer = null;

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function sendScheduledNotification(title, body, tag) {
  if (!("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;

  try {
    new Notification(title, {
      body,
      tag
    });

    return true;
  } catch (error) {
    console.error("Reminder notification failed:", error);
    return false;
  }
}

function checkScheduledReminders() {
  if (
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  const preferences = loadData("studentHub_notifications", {
    assignments: true,
    studySessions: true,
    progress: false
  });

  const sentReminders = loadData(SENT_REMINDERS_KEY, {});
  const now = new Date();
  const today = getLocalDateString(now);
  let changed = false;

  // Assignment reminders: 9 AM the day before and on the due date.
  if (preferences.assignments !== false) {
    assignments.forEach((assignment) => {
      if (assignment.completed || !assignment.dueDate) return;

      [1, 0].forEach((daysBefore) => {
        const reminderDate = new Date(
          `${assignment.dueDate}T00:00:00`
        );

        if (Number.isNaN(reminderDate.getTime())) return;

        reminderDate.setDate(
          reminderDate.getDate() - daysBefore
        );

        const reminderDay = getLocalDateString(reminderDate);
        const reminderKey =
          `assignment:${assignment.id}:${daysBefore}`;

        if (reminderDay !== today) return;
        if (now.getHours() < 9) return;
        if (sentReminders[reminderKey]) return;

        const message = daysBefore === 1
          ? `"${assignment.title}" is due tomorrow.`
          : `"${assignment.title}" is due today!`;

        const sent = sendScheduledNotification(
          "Student Hub — Assignment Reminder 📚",
          message,
          reminderKey
        );

        if (sent) {
          sentReminders[reminderKey] = new Date().toISOString();
          changed = true;
        }
      });
    });
  }

  // Study-session reminders: within five minutes after start time.
  if (preferences.studySessions !== false) {
    sessions.forEach((session) => {
      if (!session.date || !session.time) return;

      const startTime = new Date(
        `${session.date}T${session.time}:00`
      );

      if (Number.isNaN(startTime.getTime())) return;

      const elapsed = now.getTime() - startTime.getTime();

      if (elapsed < 0 || elapsed > 5 * 60 * 1000) return;

      const reminderKey =
        `session:${session.id}:${session.date}:${session.time}`;

      if (sentReminders[reminderKey]) return;

      const sent = sendScheduledNotification(
        "Student Hub — Study Time! ⏰",
        `Your study session "${session.title}" is starting now.`,
        reminderKey
      );

      if (sent) {
        sentReminders[reminderKey] = new Date().toISOString();
        changed = true;
      }
    });
  }

  if (changed) {
    saveData(SENT_REMINDERS_KEY, sentReminders);
  }
}

function startReminderChecks() {
  if (reminderTimer !== null) {
    clearInterval(reminderTimer);
  }

  // Check immediately, then every 30 seconds while the page is open.
  checkScheduledReminders();

  reminderTimer = setInterval(
    checkScheduledReminders,
    30 * 1000
  );
}

// -----------------------------------------
// Application initialisation
// -----------------------------------------


/* =========================================
   SETTINGS: Profile, Theme and Reminders
   ========================================= */

const PROFILE_KEY = "studentHub_profile";
const THEME_KEY = "studentHub_theme";
const NOTIFICATIONS_KEY = "studentHub_notifications";

const profileForm = $("#profileForm");
const themeSelect = $("#themeSelect");
const saveNotificationsButton = $("#saveNotifications");

function applyTheme(theme) {
  const selectedTheme = theme === "dark" ? "dark" : "light";

  document.body.classList.toggle(
    "dark-mode",
    selectedTheme === "dark"
  );

  if (themeSelect) {
    themeSelect.value = selectedTheme;
  }

  saveData(THEME_KEY, selectedTheme);
}

function loadSettings() {
  const profile = loadData(PROFILE_KEY, {});
  const notifications = loadData(NOTIFICATIONS_KEY, {
    assignments: true,
    studySessions: true,
    progress: false
  });

  $("#studentName").value = profile.name || "";
  $("#studentCourse").value = profile.course || "";
  $("#studentYear").value = profile.year || "";

  $("#assignmentNotifications").checked =
    notifications.assignments !== false;

  $("#studyNotifications").checked =
    notifications.studySessions !== false;

  $("#progressNotifications").checked =
    notifications.progress === true;

  const profileName = $(".profile strong");
  const profileDescription = $(".profile p");

  if (profileName) {
    profileName.textContent = profile.name || "My Student Space";
  }

  if (profileDescription) {
    profileDescription.textContent =
      profile.course || "Future in progress";
  }

  const savedTheme = loadData(THEME_KEY, "light");
  applyTheme(savedTheme);
}

if (profileForm) {
  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const profile = {
      name: $("#studentName").value.trim(),
      course: $("#studentCourse").value.trim(),
      year: $("#studentYear").value
    };

    if (!saveData(PROFILE_KEY, profile)) return;

    const profileName = $(".profile strong");
    const profileDescription = $(".profile p");

    if (profileName) {
      profileName.textContent = profile.name || "My Student Space";
    }

    if (profileDescription) {
      profileDescription.textContent =
        profile.course || "Future in progress";
    }

    $("#profileMessage").textContent = "Profile saved successfully! 💜";
  });
}

if (themeSelect) {
  themeSelect.addEventListener("change", () => {
    applyTheme(themeSelect.value);
  });
}

if (saveNotificationsButton) {
  saveNotificationsButton.addEventListener("click", () => {
    const preferences = {
      assignments: $("#assignmentNotifications").checked,
      studySessions: $("#studyNotifications").checked,
      progress: $("#progressNotifications").checked
    };

    if (!saveData(NOTIFICATIONS_KEY, preferences)) return;

    $("#notificationMessage").textContent =
      "Reminder preferences saved! 💜";
  });
}

/* =========================================
   BROWSER NOTIFICATIONS
   ========================================= */

const enableNotificationsButton = $("#enableNotifications");
const testNotificationButton = $("#testNotification");

if (enableNotificationsButton) {
  enableNotificationsButton.addEventListener("click", async () => {
    if (!("Notification" in window)) {
      alert("Your browser does not support notifications.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        alert("Notifications enabled successfully! 💜");
      } else if (permission === "denied") {
        alert(
          "Notifications are blocked. Please allow them in your browser settings."
        );
      } else {
        alert("Notification permission was not granted yet.");
      }
    } catch (error) {
      console.error("Could not enable notifications:", error);
      alert("We couldn't enable notifications. Please try again.");
    }
  });
}

if (testNotificationButton) {
  testNotificationButton.addEventListener("click", () => {
    if (!("Notification" in window)) {
      alert("Your browser does not support notifications.");
      return;
    }

    if (Notification.permission !== "granted") {
      alert("Please click Enable Browser Notifications first. 💜");
      return;
    }

    try {
      new Notification("Student Hub 🔔", {
        body: "It's working! Your study journey is getting smarter. 💜"
      });
    } catch (error) {
      console.error("Could not send test notification:", error);
      alert("The test notification could not be displayed.");
    }
  });
}



function initialiseStudentHub() {
  const yearElement = $("#currentYear");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Load saved profile, theme and reminder preferences
  loadSettings();

  const assignmentDate = $("#assignmentDueDate");
  const sessionDate = $("#sessionDate");

  if (assignmentDate) assignmentDate.min = todayString();
  if (sessionDate) sessionDate.min = todayString();

  renderAssignments();
  renderDashboard();
  renderSessions();
  renderNotes();
  renderProgress();

  if (dailyFocusInput) {
    dailyFocusInput.value = String(dailyFocus || "");
  }
   
startReminderChecks();
   
  showSection("dashboard");

  console.log("Student Hub initialised successfully.");
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initialiseStudentHub,
    { once: true }
  );
} else {
  initialiseStudentHub();
}
