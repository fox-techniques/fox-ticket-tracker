const TICKETS_KEY = "ftt.tickets";
const SELECTED_KEY = "ftt.selectedId";
const SHOW_ARCHIVED_KEY = "ftt.showArchived";
const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_CONFIG = {
  inprogress: {
    label: "In Progress",
    priority: 0,
    badgeClass: "badge-inprogress",
    cardClass: "status-inprogress",
    bannerClass: "inprogress"
  },
  waiting: {
    label: "Requires Approval",
    priority: 1,
    badgeClass: "badge-waiting",
    cardClass: "status-waiting",
    bannerClass: "waiting"
  },
  completed: {
    label: "Completed",
    priority: 2,
    badgeClass: "badge-completed",
    cardClass: "status-completed",
    bannerClass: "completed"
  },
  canceled: {
    label: "Canceled",
    priority: 3,
    badgeClass: "badge-canceled",
    cardClass: "status-canceled",
    bannerClass: "canceled"
  }
};

const $ = (id) => document.getElementById(id);
const el = {
  status: $("status"),
  showArchivedBtn: $("showArchivedBtn"),
  showArchivedState: $("showArchivedState"),
  ticketCode: $("ticketCode"),
  ticketTitle: $("ticketTitle"),
  ticketSubmitted: $("ticketSubmitted"),
  ticketSubmittedDisplay: $("ticketSubmittedDisplay"),
  ticketCompleted: $("ticketCompleted"),
  ticketCompletedDisplay: $("ticketCompletedDisplay"),
  ticketStatus: $("ticketStatus"),
  ticketDetails: $("ticketDetails"),
  addTicketBtn: $("addTicketBtn"),
  exportCsvBtn: $("exportCsvBtn"),
  clearFormBtn: $("clearFormBtn"),
  queueMeta: $("queueMeta"),
  ticketList: $("ticketList"),
  countInProgress: $("countInProgress"),
  countWaiting: $("countWaiting"),
  countCompleted: $("countCompleted"),
  countCanceled: $("countCanceled"),
  detailsSection: $("detailsSection"),
  detailsEmpty: $("detailsEmpty"),
  detailsPanel: $("detailsPanel"),
  detailsId: $("detailsId"),
  detailsCode: $("detailsCode"),
  detailsTitle: $("detailsTitle"),
  detailsSubmitted: $("detailsSubmitted"),
  detailsSubmittedDisplay: $("detailsSubmittedDisplay"),
  detailsCompleted: $("detailsCompleted"),
  detailsCompletedDisplay: $("detailsCompletedDisplay"),
  detailsStatus: $("detailsStatus"),
  detailsText: $("detailsText"),
  detailsStatusBadge: $("detailsStatusBadge"),
  detailsDayCount: $("detailsDayCount"),
  saveTicketBtn: $("saveTicketBtn"),
  priorityTicketBtn: $("priorityTicketBtn"),
  archiveTicketBtn: $("archiveTicketBtn"),
  detailsMeta: $("detailsMeta"),
  noteCount: $("noteCount"),
  noteText: $("noteText"),
  addNoteBtn: $("addNoteBtn"),
  noteList: $("noteList"),
  bannerText: $("bannerText")
};

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadBool(key, fallback) {
  const value = load(key, fallback);
  return typeof value === "boolean" ? value : fallback;
}

function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value) {
  const safe = normalizeDateString(value);
  if (!safe) return "—";
  const [year, month, day] = safe.split("-").map(Number);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function pluralize(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function escapeCsv(value) {
  return `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
}

function normalizeDateString(value) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  const [year, month, day] = raw.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }
  return raw;
}

function readDateInput(input, label, { required = false } = {}) {
  const raw = String(input.value || "").trim();
  if (!raw) {
    if (!required) return "";
    alert(`${label} is required.`);
    input.focus();
    return null;
  }

  const parsed = normalizeDateString(raw);
  if (!parsed) {
    alert(`${label} must be a valid date.`);
    input.focus();
    return null;
  }

  return parsed;
}

function dateStringToUtcMs(value) {
  const safe = normalizeDateString(value);
  if (!safe) return null;
  const [year, month, day] = safe.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function normalizeStatus(value) {
  return Object.hasOwn(STATUS_CONFIG, value) ? value : "inprogress";
}

function normalizeNotes(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id ? item.id : `note-${Date.now()}-${index}`,
      text: String(item.text ?? "").trim(),
      createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now()
    }))
    .filter((note) => note.text);
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTicket(ticket) {
  const now = Date.now();
  return {
    id: typeof ticket?.id === "string" && ticket.id ? ticket.id : createId("ticket"),
    ticketCode: String(ticket?.ticketCode ?? "").trim(),
    highPriority: Boolean(ticket?.highPriority),
    title: String(ticket?.title ?? "").trim() || "Untitled Ticket",
    submittedDate: normalizeDateString(ticket?.submittedDate) || todayInputValue(),
    completedDate: normalizeDateString(ticket?.completedDate),
    status: normalizeStatus(ticket?.status),
    details: String(ticket?.details ?? "").trim(),
    archived: Boolean(ticket?.archived),
    createdAt: typeof ticket?.createdAt === "number" ? ticket.createdAt : now,
    updatedAt: typeof ticket?.updatedAt === "number" ? ticket.updatedAt : now,
    notes: normalizeNotes(ticket?.notes)
  };
}

function getTickets() {
  return load(TICKETS_KEY, []).map(normalizeTicket);
}

function saveTickets(tickets) {
  save(TICKETS_KEY, tickets.map(normalizeTicket));
}

function getSelectedId() {
  const selectedId = load(SELECTED_KEY, "");
  return typeof selectedId === "string" ? selectedId : "";
}

function setSelectedId(ticketId) {
  if (ticketId) {
    save(SELECTED_KEY, ticketId);
  } else {
    localStorage.removeItem(SELECTED_KEY);
  }
}

function isShowArchivedEnabled() {
  return loadBool(SHOW_ARCHIVED_KEY, false);
}

function setShowArchivedEnabled(value) {
  save(SHOW_ARCHIVED_KEY, Boolean(value));
}

function getStatusConfig(status) {
  return STATUS_CONFIG[normalizeStatus(status)];
}

function isTerminalStatus(status) {
  const safe = normalizeStatus(status);
  return safe === "completed" || safe === "canceled";
}

function getTicketElapsedDays(ticket) {
  const submittedMs = dateStringToUtcMs(ticket.submittedDate);
  if (submittedMs === null) return 0;

  const status = normalizeStatus(ticket.status);
  const endDate = isTerminalStatus(status) && normalizeDateString(ticket.completedDate)
    ? ticket.completedDate
    : todayInputValue();
  const endMs = dateStringToUtcMs(endDate);
  if (endMs === null) return 0;

  return Math.max(0, Math.floor((endMs - submittedMs) / DAY_MS));
}

function getDayCountClass(status) {
  return `day-count-${normalizeStatus(status)}`;
}

function getTicketBadgeClass(ticket) {
  return ticket.highPriority ? "badge-priority" : getStatusConfig(ticket.status).badgeClass;
}

function getTicketDayCountClass(ticket) {
  return ticket.highPriority ? "day-count-priority" : getDayCountClass(ticket.status);
}

function getDateDisplayElement(input) {
  return $(`${input.id}Display`);
}

function syncDateDisplay(input) {
  const display = getDateDisplayElement(input);
  if (!display) return;
  const safe = normalizeDateString(input.value);
  display.textContent = safe ? formatDisplayDate(safe) : "dd/mm/yyyy";
  display.classList.toggle("is-placeholder", !safe);
}

function syncAllDateDisplays() {
  [
    el.ticketSubmitted,
    el.ticketCompleted,
    el.detailsSubmitted,
    el.detailsCompleted
  ].forEach(syncDateDisplay);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function compareTickets(a, b) {
  if (a.archived !== b.archived) {
    return a.archived ? 1 : -1;
  }

  const statusDiff = getStatusConfig(a.status).priority - getStatusConfig(b.status).priority;
  if (statusDiff !== 0) return statusDiff;

  if (a.submittedDate !== b.submittedDate) {
    return a.submittedDate < b.submittedDate ? 1 : -1;
  }

  if (a.updatedAt !== b.updatedAt) {
    return b.updatedAt - a.updatedAt;
  }

  return a.title.localeCompare(b.title);
}

function getVisibleTickets(tickets, showArchived) {
  return tickets
    .filter((ticket) => showArchived || !ticket.archived)
    .sort(compareTickets);
}

function getCounts(tickets) {
  return tickets.reduce((counts, ticket) => {
    counts[ticket.status] += 1;
    return counts;
  }, {
    inprogress: 0,
    waiting: 0,
    completed: 0,
    canceled: 0
  });
}

function getSelectedTicket(tickets, showArchived) {
  const selectedId = getSelectedId();
  const visibleTickets = getVisibleTickets(tickets, showArchived);
  const selected = tickets.find((ticket) => ticket.id === selectedId);

  if (selected && (showArchived || !selected.archived)) {
    return selected;
  }

  const fallback = visibleTickets[0] ?? null;
  setSelectedId(fallback?.id ?? "");
  return fallback;
}

function clearCreateForm() {
  el.ticketCode.value = "";
  el.ticketTitle.value = "";
  el.ticketSubmitted.value = todayInputValue();
  el.ticketCompleted.value = "";
  el.ticketStatus.value = "inprogress";
  el.ticketDetails.value = "";
  syncAllDateDisplays();
}

function syncCreateCompletedDate() {
  if (isTerminalStatus(el.ticketStatus.value) && !el.ticketCompleted.value) {
    el.ticketCompleted.value = todayInputValue();
  }
}

function syncDetailsCompletedDate() {
  if (isTerminalStatus(el.detailsStatus.value) && !el.detailsCompleted.value) {
    el.detailsCompleted.value = todayInputValue();
  }
}

function validateTicketDates(submittedDate, completedDate) {
  if (submittedDate && completedDate && completedDate < submittedDate) {
    alert("Date completed cannot be earlier than date submitted.");
    return false;
  }
  return true;
}

function buildTicketFromCreateForm() {
  const ticketCode = el.ticketCode.value.trim();
  if (!ticketCode) {
    alert("Ticket ID is required.");
    el.ticketCode.focus();
    return null;
  }

  const title = el.ticketTitle.value.trim();
  if (!title) {
    alert("Please enter a ticket title.");
    el.ticketTitle.focus();
    return null;
  }

  const submittedDate = readDateInput(el.ticketSubmitted, "Date submitted", { required: true });
  if (submittedDate === null) return null;
  const status = normalizeStatus(el.ticketStatus.value);
  const completedDate = readDateInput(el.ticketCompleted, "Date completed");
  if (completedDate === null) return null;
  const safeCompletedDate = completedDate || (isTerminalStatus(status) ? todayInputValue() : "");

  if (!validateTicketDates(submittedDate, safeCompletedDate)) {
    return null;
  }

  return normalizeTicket({
    id: createId("ticket"),
    ticketCode,
    highPriority: false,
    title,
    submittedDate,
    completedDate: safeCompletedDate,
    status,
    details: el.ticketDetails.value.trim(),
    archived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    notes: []
  });
}

function updateDetailsBadge(status) {
  const config = getStatusConfig(status);
  el.detailsStatusBadge.className = `badge ${config.badgeClass}`;
  el.detailsStatusBadge.textContent = config.label;
  el.detailsDayCount.className = `day-count ${getDayCountClass(status)}`;
}

function getSelectedDetailsPriority() {
  const ticketId = el.detailsId.value;
  if (!ticketId) return false;
  const ticket = getTickets().find((item) => item.id === ticketId);
  return Boolean(ticket?.highPriority);
}

function updateDetailsPriorityVisual({ status, highPriority }) {
  const ticket = {
    status,
    highPriority
  };
  el.detailsStatusBadge.className = `badge ${getTicketBadgeClass(ticket)}`;
  el.detailsStatusBadge.textContent = getStatusConfig(status).label;
  el.detailsDayCount.className = `day-count ${getTicketDayCountClass(ticket)}`;
  el.priorityTicketBtn.textContent = highPriority ? "Clear High Priority" : "Mark High Priority";
}

function renderDayCount(days) {
  return `<span class="day-count-value">${days}</span><span class="day-count-label">days</span>`;
}

function renderDetails(ticket) {
  if (!ticket) {
    el.detailsEmpty.classList.remove("hidden");
    el.detailsPanel.classList.add("hidden");
    el.detailsStatusBadge.className = "badge badge-muted";
    el.detailsStatusBadge.textContent = "Select a ticket";
    el.detailsDayCount.className = "day-count day-count-muted";
    el.detailsDayCount.innerHTML = renderDayCount(0);
    return;
  }

  el.detailsEmpty.classList.add("hidden");
  el.detailsPanel.classList.remove("hidden");

  el.detailsId.value = ticket.id;
  el.detailsCode.value = ticket.ticketCode;
  el.detailsTitle.value = ticket.title;
  el.detailsSubmitted.value = ticket.submittedDate;
  el.detailsCompleted.value = ticket.completedDate;
  el.detailsStatus.value = ticket.status;
  el.detailsText.value = ticket.details;
  updateDetailsBadge(ticket.status);
  updateDetailsPriorityVisual({
    status: ticket.status,
    highPriority: ticket.highPriority
  });
  el.detailsDayCount.innerHTML = renderDayCount(getTicketElapsedDays(ticket));

  const archivedText = ticket.archived ? "Yes" : "No";
  el.detailsMeta.textContent = [
    `Ticket ID ${ticket.ticketCode || "—"}`,
    `High Priority ${ticket.highPriority ? "Yes" : "No"}`,
    `Submitted ${formatDisplayDate(ticket.submittedDate)}`,
    `Completed ${formatDisplayDate(ticket.completedDate)}`,
    `Last updated ${formatDateTime(ticket.updatedAt)}`,
    `Archived ${archivedText}`
  ].join(" • ");

  el.archiveTicketBtn.textContent = ticket.archived ? "Restore Ticket" : "Archive Ticket";

  const notes = [...ticket.notes].sort((a, b) => b.createdAt - a.createdAt);
  el.noteCount.textContent = pluralize(notes.length, "note");
  el.noteList.innerHTML = notes.length
    ? notes.map((note) => `
        <div class="note-card">
          <div class="note-meta">${escapeHtml(formatDateTime(note.createdAt))}</div>
          <div class="note-text">${escapeHtml(note.text)}</div>
        </div>
      `).join("")
    : '<div class="empty-queue">No updates yet for this ticket.</div>';
}

function buildTicketCard(ticket, selectedId) {
  const config = getStatusConfig(ticket.status);
  const preview = ticket.details
    ? escapeHtml(ticket.details)
    : "No details added yet.";
  const previewClass = ticket.details ? "ticket-preview" : "ticket-preview is-empty";
  const archivedLabel = ticket.archived ? " • Archived" : "";
  const elapsedDays = getTicketElapsedDays(ticket);
  const codeHtml = ticket.ticketCode
    ? `<div class="ticket-code">${escapeHtml(ticket.ticketCode)}</div>`
    : "";

  return `
    <article class="ticket-card ${config.cardClass} ${ticket.id === selectedId ? "is-selected" : ""} ${ticket.archived ? "is-archived" : ""}" data-ticket-id="${ticket.id}">
      <div class="ticket-top">
        <div class="ticket-main">
          ${codeHtml}
          <div class="ticket-title">${escapeHtml(ticket.title)}</div>
          <div class="ticket-meta">
            <span>Submitted: ${escapeHtml(formatDisplayDate(ticket.submittedDate))}</span>
            <span>Completed: ${escapeHtml(formatDisplayDate(ticket.completedDate))}</span>
            <span>${pluralize(ticket.notes.length, "note")}${archivedLabel}</span>
          </div>
        </div>
        <div class="status-stack">
          <span class="badge ${getTicketBadgeClass(ticket)}">${config.label}</span>
          <div class="day-count ${getTicketDayCountClass(ticket)}" title="${escapeHtml(pluralize(elapsedDays, "day"))}">
            ${renderDayCount(elapsedDays)}
          </div>
        </div>
      </div>
      <div class="${previewClass}">${preview}</div>
      <div class="ticket-actions">
        <button class="${ticket.archived ? "btn-ok" : "btn-info"}" type="button" data-act="archive" data-id="${ticket.id}">
          ${ticket.archived ? "Restore" : "Archive"}
        </button>
        <button class="btn-danger" type="button" data-act="delete" data-id="${ticket.id}">Delete</button>
      </div>
    </article>
  `;
}

function buildBannerHtml(tickets) {
  const activeTickets = tickets.filter((ticket) => !ticket.archived);
  const highPriorityCount = activeTickets.filter((ticket) => ticket.highPriority).length;
  const waitingCount = activeTickets.filter((ticket) => ticket.status === "waiting").length;
  const inProgressCount = activeTickets.filter((ticket) => ticket.status === "inprogress").length;
  const completedCount = activeTickets.filter((ticket) => ticket.status === "completed").length;
  const canceledCount = activeTickets.filter((ticket) => ticket.status === "canceled").length;

  return [
    `<span class="proj priority">High Prio: ${highPriorityCount}</span>`,
    `<span class="proj waiting">Requires Approval: ${waitingCount}</span>`,
    `<span class="proj inprogress">In Progress: ${inProgressCount}</span>`,
    `<span class="proj completed">Completed: ${completedCount}</span>`,
    `<span class="proj canceled">Canceled: ${canceledCount}</span>`
  ].join('<span class="sep">◆</span>');
}

function render() {
  const tickets = getTickets();
  const showArchived = isShowArchivedEnabled();
  const activeTickets = tickets.filter((ticket) => !ticket.archived);
  const visibleTickets = getVisibleTickets(tickets, showArchived);
  const selectedTicket = getSelectedTicket(tickets, showArchived);
  const counts = getCounts(activeTickets);

  el.countInProgress.textContent = String(counts.inprogress);
  el.countWaiting.textContent = String(counts.waiting);
  el.countCompleted.textContent = String(counts.completed);
  el.countCanceled.textContent = String(counts.canceled);

  const archivedCount = tickets.length - activeTickets.length;
  if (!tickets.length) {
    el.status.textContent = "No tickets yet";
  } else {
    el.status.textContent = `${pluralize(activeTickets.length, "ticket")} in queue • ${pluralize(archivedCount, "archived ticket")}`;
  }

  el.showArchivedBtn.classList.toggle("is-on", showArchived);
  el.showArchivedBtn.classList.toggle("is-off", !showArchived);
  el.showArchivedBtn.setAttribute("aria-pressed", String(showArchived));
  el.showArchivedState.textContent = showArchived ? "Visible" : "Hidden";
  el.queueMeta.textContent = `${pluralize(visibleTickets.length, "ticket")} shown • ${pluralize(archivedCount, "archived ticket")}`;

  el.ticketList.innerHTML = visibleTickets.length
    ? visibleTickets.map((ticket) => buildTicketCard(ticket, selectedTicket?.id ?? "")).join("")
    : '<div class="empty-queue">No tickets match this view. Add a ticket or show archived tickets.</div>';

  renderDetails(selectedTicket);
  el.bannerText.innerHTML = buildBannerHtml(tickets);
  syncAllDateDisplays();
}

function addTicket() {
  const ticket = buildTicketFromCreateForm();
  if (!ticket) return;

  const tickets = getTickets();
  tickets.push(ticket);
  saveTickets(tickets);
  setSelectedId(ticket.id);
  clearCreateForm();
  render();
}

let detailsFocusTimer = null;

function exportTicketsCsv() {
  const tickets = getVisibleTickets(getTickets(), isShowArchivedEnabled());
  if (!tickets.length) {
    alert("There are no tickets to export in the current view.");
    return;
  }

  const rows = [
    [
      "Title",
      "Ticket ID",
      "High Priority",
      "Status",
      "Days",
      "Date Submitted",
      "Date Completed",
      "Archived",
      "Details",
      "Note Count",
      "Notes",
      "Created At",
      "Updated At"
    ]
  ];

  for (const ticket of tickets) {
    rows.push([
      ticket.title,
      ticket.ticketCode,
      ticket.highPriority ? "Yes" : "No",
      getStatusConfig(ticket.status).label,
      String(getTicketElapsedDays(ticket)),
      formatDisplayDate(ticket.submittedDate),
      formatDisplayDate(ticket.completedDate),
      ticket.archived ? "Yes" : "No",
      ticket.details,
      String(ticket.notes.length),
      ticket.notes.map((note) => `[${formatDateTime(note.createdAt)}] ${note.text}`).join(" || "),
      formatDateTime(ticket.createdAt),
      formatDateTime(ticket.updatedAt)
    ]);
  }

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  downloadFile(`fox-ticket-tracker_${formatDisplayDate(todayInputValue())}.csv`, csv, "text/csv");
}

function spotlightDetailsSection(shouldScroll) {
  if (!el.detailsSection) return;

  el.detailsSection.classList.remove("details-focus");
  void el.detailsSection.offsetWidth;
  el.detailsSection.classList.add("details-focus");

  if (detailsFocusTimer) {
    window.clearTimeout(detailsFocusTimer);
  }

  detailsFocusTimer = window.setTimeout(() => {
    el.detailsSection.classList.remove("details-focus");
  }, 900);

  if (shouldScroll) {
    el.detailsSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function openTicketDetails(ticketId, { shouldScroll = false } = {}) {
  if (!ticketId) return;
  setSelectedId(ticketId);
  render();
  window.requestAnimationFrame(() => {
    spotlightDetailsSection(shouldScroll);
  });
}

function deleteTicket(ticketId) {
  const tickets = getTickets();
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket) return;

  const confirmed = confirm(`Are you sure you want to delete "${ticket.title}"? This cannot be undone.`);
  if (!confirmed) return;

  saveTickets(tickets.filter((item) => item.id !== ticketId));
  render();
}

function saveSelectedTicket() {
  const ticketId = el.detailsId.value;
  if (!ticketId) return;

  const ticketCode = el.detailsCode.value.trim();
  if (!ticketCode) {
    alert("Ticket ID is required.");
    el.detailsCode.focus();
    return;
  }

  const title = el.detailsTitle.value.trim();
  if (!title) {
    alert("Ticket title cannot be empty.");
    el.detailsTitle.focus();
    return;
  }

  const submittedDate = readDateInput(el.detailsSubmitted, "Date submitted", { required: true });
  if (submittedDate === null) return;
  const status = normalizeStatus(el.detailsStatus.value);
  const completedDate = readDateInput(el.detailsCompleted, "Date completed");
  if (completedDate === null) return;
  const safeCompletedDate = completedDate || (isTerminalStatus(status) ? todayInputValue() : "");

  if (!validateTicketDates(submittedDate, safeCompletedDate)) {
    return;
  }

  const tickets = getTickets().map((ticket) => {
    if (ticket.id !== ticketId) return ticket;
    return normalizeTicket({
      ...ticket,
      ticketCode,
      title,
      submittedDate,
      completedDate: safeCompletedDate,
      status,
      details: el.detailsText.value.trim(),
      updatedAt: Date.now()
    });
  });

  saveTickets(tickets);
  render();
}

function toggleTicketArchive(ticketId) {
  const tickets = getTickets().map((ticket) => {
    if (ticket.id !== ticketId) return ticket;
    return normalizeTicket({
      ...ticket,
      archived: !ticket.archived,
      updatedAt: Date.now()
    });
  });

  saveTickets(tickets);
  render();
}

function toggleTicketPriority(ticketId) {
  const tickets = getTickets().map((ticket) => {
    if (ticket.id !== ticketId) return ticket;
    return normalizeTicket({
      ...ticket,
      highPriority: !ticket.highPriority,
      updatedAt: Date.now()
    });
  });

  saveTickets(tickets);
  render();
}

function addNoteToSelectedTicket() {
  const ticketId = el.detailsId.value;
  const noteText = el.noteText.value.trim();
  if (!ticketId) return;
  if (!noteText) {
    alert("Enter a note before adding it.");
    el.noteText.focus();
    return;
  }

  const nextNote = {
    id: createId("note"),
    text: noteText,
    createdAt: Date.now()
  };

  const tickets = getTickets().map((ticket) => {
    if (ticket.id !== ticketId) return ticket;
    return normalizeTicket({
      ...ticket,
      notes: [...ticket.notes, nextNote],
      updatedAt: Date.now()
    });
  });

  saveTickets(tickets);
  el.noteText.value = "";
  render();
}

el.addTicketBtn.addEventListener("click", addTicket);
el.exportCsvBtn.addEventListener("click", exportTicketsCsv);
el.clearFormBtn.addEventListener("click", clearCreateForm);
el.ticketStatus.addEventListener("change", syncCreateCompletedDate);
el.detailsStatus.addEventListener("change", () => {
  syncDetailsCompletedDate();
  updateDetailsPriorityVisual({
    status: el.detailsStatus.value,
    highPriority: getSelectedDetailsPriority()
  });
});

const dateInputs = [
  el.ticketSubmitted,
  el.ticketCompleted,
  el.detailsSubmitted,
  el.detailsCompleted
];

dateInputs.forEach((input) => {
  input.addEventListener("change", () => syncDateDisplay(input));
  input.addEventListener("input", () => syncDateDisplay(input));
  input.addEventListener("click", () => input.showPicker?.());
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      input.showPicker?.();
    }
  });
});

el.priorityTicketBtn.addEventListener("click", () => {
  if (el.detailsId.value) {
    toggleTicketPriority(el.detailsId.value);
  }
});

el.showArchivedBtn.addEventListener("click", () => {
  setShowArchivedEnabled(!isShowArchivedEnabled());
  render();
});
el.saveTicketBtn.addEventListener("click", saveSelectedTicket);
el.archiveTicketBtn.addEventListener("click", () => {
  if (el.detailsId.value) {
    toggleTicketArchive(el.detailsId.value);
  }
});
el.addNoteBtn.addEventListener("click", addNoteToSelectedTicket);

el.ticketList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button) {
    const ticketId = button.dataset.id;
    if (!ticketId) return;

    if (button.dataset.act === "archive") {
      toggleTicketArchive(ticketId);
    }

    if (button.dataset.act === "delete") {
      deleteTicket(ticketId);
    }
    return;
  }

  const card = event.target.closest(".ticket-card");
  if (!card) return;
  openTicketDetails(card.dataset.ticketId || "");
});

el.noteText.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    addNoteToSelectedTicket();
  }
});

clearCreateForm();
render();
