const board = document.getElementById("board");
const boardViewport = document.getElementById("board-viewport");
const notesLayer = document.getElementById("notes-layer");
const linksSvg = document.getElementById("links-svg");
const timelineLinksSvg = document.getElementById("timeline-links-svg");
const timelineGrid = document.getElementById("timeline-grid");
const tickContainer = document.getElementById("timeline-ticks");
const noteTemplate = document.getElementById("note-template");

const addNoteBtn = document.getElementById("add-note-btn");
const addNoteMenu = document.getElementById("add-note-menu");
const settingsBtn = document.getElementById("settings-btn");
const settingsMenu = document.getElementById("settings-menu");
const prerequisiteBtn = document.getElementById("prerequisite-btn");
const prerequisiteMenu = document.getElementById("prerequisite-menu");
const clearLinksBtn = document.getElementById("clear-links-btn");
const projectAdminPageBtn = document.getElementById("project-admin-page-btn");
const finishDateValue = document.getElementById("finish-date-value");
const snapToWeekInput = document.getElementById("snap-to-week-input");
const collapseAllLanesInput = document.getElementById("collapse-all-lanes-input");
const showCriticalPathInput = document.getElementById("show-critical-path-input");
const hideNeutralLinksInput = document.getElementById("hide-neutral-links-input");
const stageDurationValue = document.getElementById("stage-duration-value");
const neutralLinkWidthInput = document.getElementById("neutral-link-width-input");
const zoomXInput = document.getElementById("zoom-x-input");
const zoomYInput = document.getElementById("zoom-y-input");
const noteScaleInput = document.getElementById("note-scale-input");
const neutralLinkWidthBadge = document.getElementById("neutral-link-width-badge");
const zoomXBadge = document.getElementById("zoom-x-badge");
const zoomYBadge = document.getElementById("zoom-y-badge");
const noteScaleBadge = document.getElementById("note-scale-badge");
const saveBtn = document.getElementById("save-btn");
const homeBtn = document.getElementById("home-btn");
const logoutBtn = document.getElementById("logout-btn");
const scheduleToggleBtn = document.getElementById("schedule-toggle-btn");
const schedulePanel = document.getElementById("schedule-panel");
const scheduleTableBody = document.getElementById("schedule-table-body");
const projectNameEl = document.getElementById("project-name");
const statusEl = document.getElementById("status");
const stageStartLine = document.getElementById("stage-start-line");
const stageFinishLine = document.getElementById("stage-finish-line");
const swimLanesLayer = document.getElementById("swim-lanes-layer");
const suggestionModal = document.getElementById("suggestion-modal");
const suggestionForm = document.getElementById("suggestion-form");
const suggestionDisciplineSelect = document.getElementById("suggestion-discipline-select");
const suggestionTaskInput = document.getElementById("suggestion-task-input");
const suggestionMemoInput = document.getElementById("suggestion-memo-input");
const suggestionModalCloseBtn = document.getElementById("suggestion-modal-close");
const suggestionCancelBtn = document.getElementById("suggestion-cancel-btn");
const memoModal = document.getElementById("memo-modal");
const memoModalTitle = document.getElementById("memo-modal-title");
const memoModalBody = document.getElementById("memo-modal-body");
const memoModalCloseBtn = document.getElementById("memo-modal-close");
const memoModalDismissBtn = document.getElementById("memo-modal-dismiss");
const declineModal = document.getElementById("decline-modal");
const declineForm = document.getElementById("decline-form");
const declineReasonInput = document.getElementById("decline-reason-input");
const declineModalCloseBtn = document.getElementById("decline-modal-close");
const declineCancelBtn = document.getElementById("decline-cancel-btn");

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MIN_DURATION_WEEKS = 1;
const MAX_DURATION_WEEKS = 52;
const MIN_STAGE_WEEKS = 1;
const MAX_STAGE_WEEKS = 260;
const MIN_TIMELINE_PADDING_WEEKS = 2;

const authSession = window.TSAuth.requireAuth(["super-admin", "project-admin", "consultant"]);
if (!authSession) {
  throw new Error("Unauthorized");
}
const isConsultant = authSession.role === "consultant";
const isProjectAdmin = authSession.role === "project-admin";
const currentUserKey = window.TSAuth.normalizeEmail(authSession.email);
let consultantLaneIds = [];
let currentProject = null;
let isProjectContributor = false;

const DISCIPLINE_SHORT_NAMES = {
  architect: "Arch",
  landscape: "Land",
  mechanical: "Mech",
  electrical: "Elec",
  structural: "Struct",
  "owner-developer": "Owner",
  "interior-design": "Int",
  civil: "Civil",
  envelope: "Env",
  energy: "Energy",
  geotechnical: "Geo",
  code: "Code",
  acoustic: "Acous",
  commissioning: "Cx",
  elevator: "Elev",
  environmental: "Envir",
  rendering: "Render",
  survey: "Survey",
  sustainability: "Sustain",
  traffic: "Traffic",
  waste: "Waste",
  wind: "Wind",
};
const LANE_COLORS = [
  [237, 202, 190],
  [237, 234, 190],
  [220, 237, 190],
  [190, 237, 217],
  [190, 223, 237],
  [194, 190, 237],
  [237, 190, 232],
  [217, 237, 190],
  [190, 237, 237],
  [237, 210, 190],
];
let SWIM_LANES = [
  { id: "architect", name: "Architect", color: [237, 202, 190] },
  { id: "mechanical", name: "Mechanical", color: [237, 234, 190] },
  { id: "electrical", name: "Electrical", color: [220, 237, 190] },
  { id: "structural", name: "Structural", color: [190, 237, 217] },
  { id: "geotechnical", name: "Geotechnical", color: [190, 223, 237] },
  { id: "code", name: "Code", color: [194, 190, 237] },
];
const LANE_HEIGHT = 260;
const LANE_HEADER_HEIGHT = 120;
const COLLAPSED_NOTE_GAP = 8;
const COLLAPSED_NOTE_PAD_TOP = 8;
const COLLAPSED_NOTE_PAD_BOTTOM = 8;
const COLLAPSED_ROW_X_GAP = 10;
const COLLAPSED_LANE_HEIGHT = 38;

const state = {
  notes: new Map(),
  links: [],
  deliverables: null,
  selectedForLink: null,
  linkPreviewCursor: null,
  selectedNoteId: null,
  stageDurationWeeks: 26,
  finishDateMs: 0,
  zoomX: 1,
  zoomY: 1,
  noteScale: 1,
  snapToWeek: true,
  showCriticalPath: false,
  hideNeutralLinks: false,
  neutralLinkScale: 1,
  collapsedLaneIds: [],
  criticalPathNoteIds: new Set(),
  criticalPathLinkIds: new Set(),
  criticalPathCollapsedSnapshot: null,
};

let dragState = null;
let pendingSuggestionSourceNoteId = null;
let pendingDeclineNoteId = null;

function setStatus(message) {
  statusEl.textContent = message;
}

function updateZoomBadges() {
  if (zoomXBadge) {
    zoomXBadge.textContent = `${Math.round(state.zoomX * 100)}%`;
  }
  if (zoomYBadge) {
    zoomYBadge.textContent = `${Math.round(state.zoomY * 100)}%`;
  }
  if (noteScaleBadge) {
    noteScaleBadge.textContent = `${Math.round(state.noteScale * 100)}%`;
  }
}

function formatFinishDate(ms) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "Not set";
  }

  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function updateProjectSettingDisplays() {
  if (finishDateValue) {
    finishDateValue.textContent = formatFinishDate(state.finishDateMs);
  }

  if (stageDurationValue) {
    const weeks = Math.round(state.stageDurationWeeks) || 0;
    stageDurationValue.textContent = `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
  }
}

function isSuggestedNote(note) {
  return (note?.kind || "task") === "suggested";
}

function normalizeDeclineFeedback(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      id: item?.id || uid("decline"),
      sourceNoteId: item?.sourceNoteId || null,
      laneId: item?.laneId || null,
      laneName: item?.laneName || "",
      taskText: String(item?.taskText || "").trim(),
      memo: String(item?.memo || "").trim(),
      createdAt: item?.createdAt || new Date().toISOString(),
    }))
    .filter((item) => item.memo);
}

function otherLaneOptions(sourceLaneId) {
  return SWIM_LANES.filter((lane) => lane.id !== sourceLaneId);
}

function closeSuggestionModal() {
  if (!suggestionModal) {
    return;
  }
  suggestionModal.hidden = true;
  pendingSuggestionSourceNoteId = null;
  suggestionForm?.reset();
}

function openSuggestionModal(sourceNoteId) {
  const sourceNote = state.notes.get(sourceNoteId);
  if (!sourceNote || !suggestionModal || !suggestionDisciplineSelect) {
    return;
  }

  const options = otherLaneOptions(sourceNote.lane || SWIM_LANES[0].id);
  if (options.length === 0) {
    setStatus("No other disciplines are available on this board.");
    return;
  }

  pendingSuggestionSourceNoteId = sourceNoteId;
  suggestionDisciplineSelect.innerHTML = "";
  options.forEach((lane) => {
    const option = document.createElement("option");
    option.value = lane.id;
    option.textContent = lane.name;
    suggestionDisciplineSelect.appendChild(option);
  });
  if (suggestionTaskInput) {
    suggestionTaskInput.value = "";
  }
  if (suggestionMemoInput) {
    suggestionMemoInput.value = "";
  }
  suggestionModal.hidden = false;
  suggestionTaskInput?.focus();
}

function closeMemoModal() {
  if (!memoModal) {
    return;
  }
  memoModal.hidden = true;
  if (memoModalTitle) {
    memoModalTitle.textContent = "Memo";
  }
  if (memoModalBody) {
    memoModalBody.innerHTML = "";
  }
}

function openMemoModal(title, bodyHtml) {
  if (!memoModal || !memoModalBody) {
    return;
  }
  if (memoModalTitle) {
    memoModalTitle.textContent = title;
  }
  memoModalBody.innerHTML = bodyHtml;
  memoModal.hidden = false;
}

function closeDeclineModal() {
  if (!declineModal) {
    return;
  }
  declineModal.hidden = true;
  pendingDeclineNoteId = null;
  declineForm?.reset();
}

function openDeclineModal(noteId) {
  if (!declineModal) {
    return;
  }
  pendingDeclineNoteId = noteId;
  if (declineReasonInput) {
    declineReasonInput.value = "";
  }
  declineModal.hidden = false;
  declineReasonInput?.focus();
}

function updateNeutralLinkControls() {
  if (hideNeutralLinksInput) {
    hideNeutralLinksInput.checked = state.hideNeutralLinks;
  }
  if (neutralLinkWidthInput) {
    neutralLinkWidthInput.value = String(Math.round(state.neutralLinkScale * 100));
    neutralLinkWidthInput.disabled = state.hideNeutralLinks;
  }
  if (neutralLinkWidthBadge) {
    neutralLinkWidthBadge.textContent = `${Math.round(state.neutralLinkScale * 100)}%`;
  }
}

function applyNeutralLinkStyles() {
  document.documentElement.style.setProperty("--neutral-link-scale", String(state.neutralLinkScale));
  updateNeutralLinkControls();
}

const PROJECTS_KEY = "ts-projects";

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function getProjectIdFromLocation() {
  const url = new URL(window.location.href);
  return url.searchParams.get("projectId") || localStorage.getItem("ts-active-project-id") || "default";
}

function getStorageKey() {
  return `board-state-${getProjectIdFromLocation()}`;
}

function getViewStorageKey() {
  return `board-view-${getProjectIdFromLocation()}-${currentUserKey}`;
}

function loadProjects() {
  return window.TSData?.getProjectsSync ? window.TSData.getProjectsSync() : [];
}

async function saveProjects(projects) {
  if (window.TSData?.saveProjects) {
    await window.TSData.saveProjects(projects);
    return;
  }
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

function hasLaneRestrictedAccess() {
  return isConsultant || isProjectContributor;
}

function canEditNote(note) {
  if (!hasLaneRestrictedAccess()) {
    return true;
  }
  const laneId = note?.lane || SWIM_LANES[0].id;
  return consultantLaneIds.includes(laneId);
}

function defaultAddLaneId() {
  if (!hasLaneRestrictedAccess()) {
    return SWIM_LANES[0].id;
  }
  return consultantLaneIds[0] || SWIM_LANES[0].id;
}

function applyRoleUi() {
  if (!hasLaneRestrictedAccess()) {
    return;
  }

  document.body.classList.add("consultant-mode");
  if (projectNameEl) {
    projectNameEl.setAttribute("contenteditable", "false");
  }

  clearLinksBtn.style.display = "none";
  saveBtn.style.display = "none";
  scheduleToggleBtn.style.display = "none";
  if (projectAdminPageBtn) {
    projectAdminPageBtn.style.display = "none";
  }
}

if (!isProjectAdmin && projectAdminPageBtn) {
  projectAdminPageBtn.style.display = "none";
}

async function configureSwimLanesFromProject() {
  const projectId = getProjectIdFromLocation();
  const project = loadProjects().find((item) => item.id === projectId);
  currentProject = project || null;
  isProjectContributor = false;
  consultantLaneIds = [];

  const team = Array.isArray(project?.team) ? project.team : [];
  const assignedLaneIds = [...new Set(
    team
      .filter((member) => window.TSAuth.normalizeEmail(member.email) === authSession.email)
      .map((member) => slugify(member.discipline))
      .filter(Boolean),
  )];

  if (isProjectAdmin) {
    const admins = Array.isArray(project?.projectAdmins) ? project.projectAdmins : [];
    const canManageProject = admins.some((email) => window.TSAuth.normalizeEmail(email) === authSession.email);
    if (!canManageProject) {
      if (!assignedLaneIds.length) {
        alert("You are not assigned to this project.");
        window.location.href = "project-admin-workspace.html";
        return;
      }
      isProjectContributor = true;
      consultantLaneIds = assignedLaneIds;
    }
  }

  if (isConsultant) {
    consultantLaneIds = assignedLaneIds;

    if (!consultantLaneIds.length) {
      alert("You are not assigned to this project.");
      window.location.href = "consultant-workspace.html";
      return;
    }
  }

  if (!project || !Array.isArray(project.disciplines) || !project.disciplines.length) {
    return;
  }

  SWIM_LANES = project.disciplines.map((name, index) => ({
    id: slugify(name),
    name,
    color: LANE_COLORS[index % LANE_COLORS.length],
  }));
}

function getProjectName() {
  const name = (projectNameEl?.textContent || "").trim();
  return name || "Timeline Notes Board";
}

function setProjectName(name) {
  if (!projectNameEl) {
    return;
  }
  const normalized = (name || "").trim() || "Timeline Notes Board";
  projectNameEl.textContent = normalized;
}

function closeAddNoteMenu() {
  if (!addNoteMenu || !addNoteBtn) {
    return;
  }
  addNoteMenu.hidden = true;
  addNoteMenu.style.display = "none";
  addNoteBtn.setAttribute("aria-expanded", "false");
}

function closeSettingsMenu() {
  if (!settingsMenu || !settingsBtn) {
    return;
  }
  settingsMenu.hidden = true;
  settingsBtn.setAttribute("aria-expanded", "false");
}

function closePrerequisiteMenu() {
  if (!prerequisiteMenu || !prerequisiteBtn) {
    return;
  }
  prerequisiteMenu.hidden = true;
  prerequisiteMenu.style.display = "none";
  prerequisiteBtn.setAttribute("aria-expanded", "false");
}

function openAddNoteMenu() {
  if (!addNoteMenu || !addNoteBtn) {
    return;
  }
  closeSettingsMenu();
  closePrerequisiteMenu();
  addNoteMenu.hidden = false;
  addNoteMenu.style.display = "grid";
  addNoteBtn.setAttribute("aria-expanded", "true");
}

function openSettingsMenu() {
  if (!settingsMenu || !settingsBtn) {
    return;
  }
  closeAddNoteMenu();
  closePrerequisiteMenu();
  settingsMenu.hidden = false;
  settingsBtn.setAttribute("aria-expanded", "true");
}

function openPrerequisiteMenu() {
  if (!prerequisiteMenu || !prerequisiteBtn) {
    return;
  }
  closeSettingsMenu();
  closeAddNoteMenu();
  prerequisiteMenu.hidden = false;
  prerequisiteMenu.style.display = "grid";
  prerequisiteBtn.setAttribute("aria-expanded", "true");
}

function populateAddNoteMenu() {
  if (!addNoteMenu) {
    return;
  }

  addNoteMenu.innerHTML = "";
  const allowedLanes = hasLaneRestrictedAccess()
    ? SWIM_LANES.filter((lane) => consultantLaneIds.includes(lane.id))
    : SWIM_LANES;

  if (allowedLanes.length === 0) {
    const empty = document.createElement("div");
    empty.className = "add-note-menu-empty";
    empty.textContent = "No editable disciplines assigned.";
    addNoteMenu.appendChild(empty);
    addNoteBtn.disabled = true;
    return;
  }

  addNoteBtn.disabled = false;
  allowedLanes.forEach((lane) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "add-note-menu-btn";
    button.textContent = lane.name;
    button.dataset.lane = lane.id;
    button.style.background = `rgba(${lane.color[0]}, ${lane.color[1]}, ${lane.color[2]}, 0.72)`;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      addNewNote(lane.id);
      closeAddNoteMenu();
    });
    addNoteMenu.appendChild(button);
  });
}

function populatePrerequisiteMenu() {
  if (!prerequisiteMenu) {
    return;
  }

  prerequisiteMenu.innerHTML = "";
  const allowedLanes = hasLaneRestrictedAccess()
    ? SWIM_LANES.filter((lane) => consultantLaneIds.includes(lane.id))
    : SWIM_LANES;

  if (allowedLanes.length === 0) {
    const empty = document.createElement("div");
    empty.className = "add-note-menu-empty";
    empty.textContent = "No editable disciplines assigned.";
    prerequisiteMenu.appendChild(empty);
    if (prerequisiteBtn) {
      prerequisiteBtn.disabled = true;
    }
    return;
  }

  if (prerequisiteBtn) {
    prerequisiteBtn.disabled = false;
  }

  allowedLanes.forEach((lane) => {
    const prerequisiteButton = document.createElement("button");
    prerequisiteButton.type = "button";
    prerequisiteButton.className = "add-note-menu-btn add-note-menu-btn-prereq";
    prerequisiteButton.textContent = `${lane.name} Prerequisite`;
    prerequisiteButton.dataset.lane = lane.id;
    prerequisiteButton.style.background = "rgba(255, 255, 255, 0.1)";
    prerequisiteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      addNewNote(lane.id, "prerequisite");
      closePrerequisiteMenu();
    });
    prerequisiteMenu.appendChild(prerequisiteButton);
  });
}

function serializeState() {
  const notesArray = [...state.notes.values()]
    .filter((note) => (note.kind || "task") !== "deliverable")
    .map((note) => ({
      id: note.id,
      x: note.x,
      y: note.y,
      text: note.text,
      durationWeeks: note.durationWeeks,
      kind: note.kind || "task",
      lane: note.lane,
      importedFromCsv: !!note.importedFromCsv,
      importedFileName: note.importedFileName || null,
      requestSourceNoteId: note.requestSourceNoteId || null,
      requestMemo: note.requestMemo || "",
      requestDeclines: normalizeDeclineFeedback(note.requestDeclines),
    }));

  return {
    projectName: getProjectName(),
    notes: notesArray,
    links: state.links,
    stageDurationWeeks: state.stageDurationWeeks,
    finishDateMs: state.finishDateMs,
    deliverables: state.deliverables || currentProject?.deliverables || null,
  };
}

function serializeViewState() {
  return {
    zoomX: state.zoomX,
    zoomY: state.zoomY,
    noteScale: state.noteScale,
    snapToWeek: state.snapToWeek,
    showCriticalPath: state.showCriticalPath,
    hideNeutralLinks: state.hideNeutralLinks,
    neutralLinkScale: state.neutralLinkScale,
    collapsedLaneIds: state.collapsedLaneIds,
  };
}

async function saveState() {
  try {
    const serialized = serializeState();
    if (window.TSData?.saveBoardState) {
      await window.TSData.saveBoardState(getProjectIdFromLocation(), serialized);
    } else {
      localStorage.setItem(getStorageKey(), JSON.stringify(serialized));
    }

    const projectId = getProjectIdFromLocation();
    const projects = loadProjects();
    const project = projects.find((item) => item.id === projectId);
    if (project) {
      project.name = serialized.projectName;
      await saveProjects(projects);
    }
    setStatus("✓ Board saved");
  } catch (err) {
    console.error("Failed to save board:", err);
    setStatus("✗ Failed to save board");
  }
}

function saveViewState() {
  try {
    localStorage.setItem(getViewStorageKey(), JSON.stringify(serializeViewState()));
  } catch (err) {
    console.error("Failed to save board view state:", err);
  }
}

async function loadState() {
  try {
    if (window.TSData?.fetchBoardState) {
      return await window.TSData.fetchBoardState(getProjectIdFromLocation());
    }
    const stored = localStorage.getItem(getStorageKey());
    if (!stored) {
      return null;
    }
    return JSON.parse(stored);
  } catch (err) {
    console.error("Failed to load board:", err);
    return null;
  }
}

function loadViewState() {
  try {
    const stored = localStorage.getItem(getViewStorageKey());
    if (!stored) {
      return null;
    }
    return JSON.parse(stored);
  } catch (err) {
    console.error("Failed to load board view state:", err);
    return null;
  }
}

function applyLoadedState(loaded, loadedView = null) {
  if (!loaded) {
    return;
  }

  setProjectName(loaded.projectName);

  state.stageDurationWeeks = loaded.stageDurationWeeks || 26;
  state.finishDateMs = loaded.finishDateMs || Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  // Backward compatibility for older saves that used a single zoom value and stored view in shared state.
  const fallbackZoom = loaded.zoom || 1;
  const view = loadedView || {};
  state.zoomX = clamp(Number(view.zoomX) || Number(loaded.zoomX) || fallbackZoom, 0.3, 2.5);
  state.zoomY = clamp(Number(view.zoomY) || Number(loaded.zoomY) || fallbackZoom, 0.5, 2.5);
  state.noteScale = clamp(Number(view.noteScale) || Number(loaded.noteScale) || 1, 0.5, 2);
  state.snapToWeek = view.snapToWeek !== undefined
    ? !!view.snapToWeek
    : loaded.snapToWeek !== undefined
      ? !!loaded.snapToWeek
      : true;
  state.showCriticalPath = !!view.showCriticalPath;
  state.hideNeutralLinks = !!view.hideNeutralLinks;
  state.neutralLinkScale = clamp(Number(view.neutralLinkScale) || 1, 0.2, 1);
  state.collapsedLaneIds = Array.isArray(view.collapsedLaneIds)
    ? [...new Set(view.collapsedLaneIds)]
    : Array.isArray(loaded.collapsedLaneIds)
      ? [...new Set(loaded.collapsedLaneIds)]
      : [];
  state.deliverables = loaded.deliverables || currentProject?.deliverables || null;

  if (snapToWeekInput) {
    snapToWeekInput.checked = state.snapToWeek;
  }
  if (showCriticalPathInput) {
    showCriticalPathInput.checked = state.showCriticalPath;
  }
  zoomXInput.value = String(Math.round(state.zoomX * 100));
  zoomYInput.value = String(Math.round(state.zoomY * 100));
  if (noteScaleInput) {
    noteScaleInput.value = String(Math.round(state.noteScale * 100));
  }
  updateProjectSettingDisplays();
  updateZoomBadges();
  applyNeutralLinkStyles();
  updateBoardWidth();
  createTickMarks();

  if (loaded.notes && Array.isArray(loaded.notes)) {
    loaded.notes.forEach((noteData) => {
      if ((noteData.kind || "task") === "deliverable") {
        return;
      }
      createNote({
        x: noteData.x,
        y: noteData.y,
        text: noteData.text,
        durationWeeks: noteData.durationWeeks,
        id: noteData.id,
        kind: noteData.kind || "task",
        lane: noteData.lane || SWIM_LANES[0].id,
        importedFromCsv: !!noteData.importedFromCsv,
        importedFileName: noteData.importedFileName || null,
        requestSourceNoteId: noteData.requestSourceNoteId || null,
        requestMemo: noteData.requestMemo || "",
        requestDeclines: normalizeDeclineFeedback(noteData.requestDeclines),
      });
    });
  }

  if (state.deliverables) {
    createDeliverableNotes(state.deliverables, loaded.finishDateMs);
  }

  if (loaded.links && Array.isArray(loaded.links)) {
    state.links = [...loaded.links];
  }

  refreshLayout();
  renderLinks();
  boardViewport.scrollLeft = 0;
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function boardSize() {
  const laneLayout = computeLaneLayout();
  return {
    width: board.clientWidth,
    height: laneHeaderHeightPx() + laneLayout.totalBodyHeight,
  };
}

function noteScale() {
  return state.noteScale;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function laneHeightPx() {
  return LANE_HEIGHT * state.zoomY;
}

function collapsedNoteHeightPx() {
  return Math.round(42 * noteScale());
}

function collapsedNoteWidthPx(note) {
  return Math.max(156 * noteScale(), note.baseWidth * 1.144 * noteScale());
}

function buildCollapsedLaneRows(laneId, excludedNoteId = null) {
  if (isLaneCollapsed(laneId)) {
    return {
      noteRow: new Map(),
      rowCount: 0,
    };
  }

  const laneNotes = [...state.notes.values()]
    .filter((note) =>
      (note.lane || SWIM_LANES[0].id) === laneId &&
      note.id !== excludedNoteId &&
      !(state.showCriticalPath && state.criticalPathNoteIds.has(note.id)),
    )
    .sort((left, right) => {
      const delta = noteStartX(left) - noteStartX(right);
      if (delta !== 0) {
        return delta;
      }
      return left.id.localeCompare(right.id);
    });

  const rowEnds = [];
  const noteRow = new Map();

  laneNotes.forEach((note) => {
    const startX = noteStartX(note);
    const endX = startX + collapsedNoteWidthPx(note);

    let rowIndex = rowEnds.findIndex((rowEndX) => startX >= rowEndX + COLLAPSED_ROW_X_GAP);
    if (rowIndex === -1) {
      rowIndex = rowEnds.length;
    }

    rowEnds[rowIndex] = Math.max(rowEnds[rowIndex] || -Infinity, endX);
    noteRow.set(note.id, rowIndex);
  });

  return {
    noteRow,
    rowCount: rowEnds.length,
  };
}

function laneHeaderHeightPx() {
  return LANE_HEADER_HEIGHT * state.zoomY;
}

function isLaneCollapsed(laneId) {
  return state.collapsedLaneIds.includes(laneId);
}

function clearSelectionForCollapsedLanes() {
  const selected = state.selectedNoteId ? state.notes.get(state.selectedNoteId) : null;
  if (selected && isLaneCollapsed(selected.lane || SWIM_LANES[0].id)) {
    state.selectedNoteId = null;
    selected.el?.classList.remove("selected");
  }

  const linkSource = state.selectedForLink ? state.notes.get(state.selectedForLink) : null;
  if (linkSource && isLaneCollapsed(linkSource.lane || SWIM_LANES[0].id)) {
    linkSource.el?.classList.remove("link-source");
    state.selectedForLink = null;
    state.linkPreviewCursor = null;
  }
}

function computeCriticalPathSets(rootNoteId) {
  const noteIds = new Set();
  const linkIds = new Set();
  const stack = [rootNoteId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (noteIds.has(currentId)) {
      continue;
    }
    noteIds.add(currentId);

    state.links.forEach((link) => {
      const type = relationshipType(link);

      // Normal FS direction: predecessor (a) -> successor (b).
      if (link.b === currentId) {
        const predecessor = state.notes.get(link.a);
        if (!predecessor) {
          return;
        }
        linkIds.add(link.id);
        if (!noteIds.has(predecessor.id)) {
          stack.push(predecessor.id);
        }
        return;
      }

      // Legacy compatibility for older boards created when FS direction was inverted.
      // Only treat as predecessor if linked task starts no later than the current task.
      if (type === "FS" && link.a === currentId) {
        const maybePredecessor = state.notes.get(link.b);
        const currentNote = state.notes.get(currentId);
        if (!maybePredecessor || !currentNote) {
          return;
        }
        if (noteStartX(maybePredecessor) <= noteStartX(currentNote)) {
          linkIds.add(link.id);
          if (!noteIds.has(maybePredecessor.id)) {
            stack.push(maybePredecessor.id);
          }
        }
      }
    });
  }

  return { noteIds, linkIds };
}

function clearCriticalPathState(restoreCollapsed = true) {
  if (restoreCollapsed && Array.isArray(state.criticalPathCollapsedSnapshot)) {
    state.collapsedLaneIds = [...state.criticalPathCollapsedSnapshot];
  }
  state.criticalPathCollapsedSnapshot = null;
  state.criticalPathNoteIds = new Set();
  state.criticalPathLinkIds = new Set();
}

function updateCriticalPathView() {
  if (!state.showCriticalPath || !state.selectedNoteId) {
    clearCriticalPathState(true);
    return;
  }

  const rootNote = state.notes.get(state.selectedNoteId);
  if (!rootNote) {
    clearCriticalPathState(true);
    return;
  }

  if (!Array.isArray(state.criticalPathCollapsedSnapshot)) {
    state.criticalPathCollapsedSnapshot = [...state.collapsedLaneIds];
  }

  const { noteIds, linkIds } = computeCriticalPathSets(rootNote.id);
  const criticalLaneIds = new Set(
    [...noteIds]
      .map((noteId) => state.notes.get(noteId)?.lane)
      .filter(Boolean),
  );

  state.criticalPathNoteIds = noteIds;
  state.criticalPathLinkIds = linkIds;
  state.collapsedLaneIds = state.criticalPathCollapsedSnapshot.filter((laneId) => !criticalLaneIds.has(laneId));
}

function syncCollapseAllLanesInput() {
  if (!collapseAllLanesInput) {
    return;
  }

  const total = SWIM_LANES.length;
  const collapsedCount = SWIM_LANES.filter((lane) => isLaneCollapsed(lane.id)).length;
  collapseAllLanesInput.checked = total > 0 && collapsedCount === total;
  collapseAllLanesInput.indeterminate = collapsedCount > 0 && collapsedCount < total;
}

function setAllLanesCollapsed(shouldCollapse) {
  state.collapsedLaneIds = shouldCollapse ? SWIM_LANES.map((lane) => lane.id) : [];
  clearSelectionForCollapsedLanes();
  refreshLayout();
  saveViewState();
  setStatus(shouldCollapse ? "All swimlanes collapsed." : "All swimlanes expanded.");
}

function toggleLaneCollapsed(laneId) {
  if (isLaneCollapsed(laneId)) {
    state.collapsedLaneIds = state.collapsedLaneIds.filter((id) => id !== laneId);
    setStatus(`${getLane(laneId).name} expanded.`);
  } else {
    state.collapsedLaneIds = [...state.collapsedLaneIds, laneId];
    setStatus(`${getLane(laneId).name} collapsed.`);
  }

  clearSelectionForCollapsedLanes();
  refreshLayout();
  saveViewState();
}

function getLane(laneId) {
  return SWIM_LANES.find((l) => l.id === laneId) || SWIM_LANES[0];
}

function laneTopY(laneId) {
  return computeLaneLayout().tops.get(laneId) ?? laneHeaderHeightPx();
}

function laneBodyHeightPx(laneId) {
  return computeLaneLayout().heights.get(laneId) ?? laneHeightPx();
}

function computeLaneLayout() {
  const counts = new Map(SWIM_LANES.map((lane) => [lane.id, 0]));
  state.notes.forEach((note) => {
    const laneId = note.lane || SWIM_LANES[0].id;
    counts.set(laneId, (counts.get(laneId) || 0) + 1);
  });

  const expandedHeightByLane = new Map();
  state.notes.forEach((note) => {
    const shouldExpand =
      state.selectedNoteId === note.id ||
      (state.showCriticalPath && state.criticalPathNoteIds.has(note.id));
    if (!shouldExpand) {
      return;
    }
    const laneId = note.lane || SWIM_LANES[0].id;
    const expandedHeight = Math.max(1, note.baseHeight * noteScale()) + 24;
    expandedHeightByLane.set(laneId, Math.max(expandedHeightByLane.get(laneId) || 0, expandedHeight));
  });
  const collapsedHeight = collapsedNoteHeightPx();

  const tops = new Map();
  const heights = new Map();
  let nextTop = laneHeaderHeightPx();

  SWIM_LANES.forEach((lane) => {
    if (isLaneCollapsed(lane.id)) {
      tops.set(lane.id, nextTop);
      heights.set(lane.id, COLLAPSED_LANE_HEIGHT);
      nextTop += COLLAPSED_LANE_HEIGHT;
      return;
    }

    const collapsedRowCount = buildCollapsedLaneRows(lane.id, state.selectedNoteId).rowCount;
    const stackedHeight = collapsedRowCount > 0
      ? COLLAPSED_NOTE_PAD_TOP + COLLAPSED_NOTE_PAD_BOTTOM + collapsedRowCount * collapsedHeight + (collapsedRowCount - 1) * COLLAPSED_NOTE_GAP
      : 0;
    const expandedHeight = expandedHeightByLane.get(lane.id) || 0;
    const height = Math.max(laneHeightPx(), stackedHeight, expandedHeight);

    tops.set(lane.id, nextTop);
    heights.set(lane.id, height);
    nextTop += height;
  });

  return {
    tops,
    heights,
    totalBodyHeight: nextTop - laneHeaderHeightPx(),
  };
}

function laneTimelineY(laneId) {
  const idx = SWIM_LANES.findIndex((l) => l.id === laneId);
  const safeIdx = idx === -1 ? 0 : idx;
  const topPad = 14 * state.zoomY;
  const bottomPad = 26 * state.zoomY;
  const usable = Math.max(1, laneHeaderHeightPx() - topPad - bottomPad);
  const step = SWIM_LANES.length > 1 ? usable / (SWIM_LANES.length - 1) : 0;
  return topPad + safeIdx * step;
}

function firstTimelineY() {
  return laneTimelineY(SWIM_LANES[0].id);
}

function lastTimelineY() {
  return laneTimelineY(SWIM_LANES[SWIM_LANES.length - 1].id);
}

function stageStartMs() {
  return state.finishDateMs - state.stageDurationWeeks * WEEK_MS;
}

function visiblePaddingWeeks() {
  const baseRangeWeeks = state.stageDurationWeeks + MIN_TIMELINE_PADDING_WEEKS * 2;
  if (state.zoomX >= 1) {
    return MIN_TIMELINE_PADDING_WEEKS;
  }

  const zoomedOutRangeWeeks = baseRangeWeeks / state.zoomX;
  const expandedPadding = (zoomedOutRangeWeeks - state.stageDurationWeeks) / 2;
  return Math.max(MIN_TIMELINE_PADDING_WEEKS, expandedPadding);
}

function visibleRangeWeeks() {
  return state.stageDurationWeeks + visiblePaddingWeeks() * 2;
}

function visibleStartMs() {
  return stageStartMs() - visiblePaddingWeeks() * WEEK_MS;
}

function visibleEndMs() {
  return state.finishDateMs + visiblePaddingWeeks() * WEEK_MS;
}

function startOfUtcWeekMonday(ms) {
  const date = new Date(ms);
  const dayOffsetFromMonday = (date.getUTCDay() + 6) % 7;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - dayOffsetFromMonday);
}

function mondayOnOrAfter(ms) {
  const monday = startOfUtcWeekMonday(ms);
  return monday < ms ? monday + WEEK_MS : monday;
}

function mondayOnOrBefore(ms) {
  return startOfUtcWeekMonday(ms);
}

function snapStartToMondayWithinBounds(startX, minStart, maxStart) {
  if (!state.snapToWeek) {
    return clamp(startX, minStart, maxStart);
  }

  const minMs = xToTimestamp(minStart);
  const maxMs = xToTimestamp(maxStart);
  const minMondayMs = mondayOnOrAfter(minMs);
  const maxMondayMs = mondayOnOrBefore(maxMs);

  if (minMondayMs > maxMondayMs) {
    return clamp(startX, minStart, maxStart);
  }

  let snappedMs = startOfUtcWeekMonday(xToTimestamp(startX));
  snappedMs = clamp(snappedMs, minMondayMs, maxMondayMs);
  return clamp(timestampToX(snappedMs), minStart, maxStart);
}

function formatUtcDate(ms, yearFormat = "numeric") {
  return new Date(ms).toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: yearFormat,
  });
}

function xToTimestamp(x) {
  const { width } = boardSize();
  const progress = width === 0 ? 0 : clamp(x / width, 0, 1);
  return visibleStartMs() + progress * (visibleEndMs() - visibleStartMs());
}

function xToDateLabel(x) {
  return formatUtcDate(startOfUtcWeekMonday(xToTimestamp(x)), "numeric");
}

function noteCenter(note) {
  return {
    x: note.x + note.width / 2,
    y: note.y + note.height / 2,
  };
}

function timelineY() {
  return firstTimelineY();
}

function weeksToPixels(weeks) {
  const { width } = boardSize();
  return (width * weeks) / visibleRangeWeeks();
}

function timestampToX(timestamp) {
  const { width } = boardSize();
  const rangeMs = visibleEndMs() - visibleStartMs();
  if (rangeMs <= 0 || width <= 0) {
    return 0;
  }
  const progress = clamp((timestamp - visibleStartMs()) / rangeMs, 0, 1);
  return progress * width;
}

function stageStartX() {
  return timestampToX(stageStartMs());
}

function stageFinishX() {
  return timestampToX(state.finishDateMs);
}

function deliverableLockedX(note) {
  const { width } = boardSize();
  return clamp(stageFinishX() + 18, 0, Math.max(0, width - note.width));
}

function clampNoteDurationToStage(note) {
  if (["prerequisite", "deliverable"].includes(note.kind || "task")) {
    note.durationWeeks = 0;
    return false;
  }
  const maxDurationWeeks = Math.max(MIN_DURATION_WEEKS, Math.floor(state.stageDurationWeeks));
  if (note.durationWeeks > maxDurationWeeks) {
    note.durationWeeks = maxDurationWeeks;
    return true;
  }
  return false;
}

function noteDurationWeeks(note) {
  return ["prerequisite", "deliverable"].includes(note.kind || "task") ? 0 : (note.durationWeeks || MIN_DURATION_WEEKS);
}

function stageStartBounds(noteId, noteDurationPx) {
  const note = state.notes.get(noteId);
  const isPrerequisite = (note?.kind || "task") === "prerequisite";

  let minStart = isPrerequisite ? 0 : stageStartX();
  minStart = Math.max(minStart, predecessorEndBound(noteId));

  let maxStart = isPrerequisite ? stageStartX() - noteDurationPx : stageFinishX() - noteDurationPx;
  maxStart = Math.min(maxStart, successorStartBound(noteId, noteDurationPx));

  if (maxStart < minStart) {
    if (isPrerequisite) {
      minStart = maxStart;
    } else {
      maxStart = minStart;
    }
  }

  return { minStart, maxStart };
}

function updateStageLines() {
  const startX = timestampToX(stageStartMs());
  const finishX = timestampToX(state.finishDateMs);
  if (stageStartLine) {
    stageStartLine.style.left = `${startX}px`;
  }
  if (stageFinishLine) {
    stageFinishLine.style.left = `${finishX}px`;
    stageFinishLine.style.right = "auto";
  }
}

function dateValueToUtcMs(dateValue) {
  if (!dateValue) {
    return null;
  }
  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return Date.UTC(year, month - 1, day);
}

function utcMsToDateValue(ms) {
  const iso = new Date(ms).toISOString();
  return iso.slice(0, 10);
}

function updateBoardWidth() {
  const viewportWidth = boardViewport.clientWidth || window.innerWidth;
  const scaledWidth = Math.max(viewportWidth, Math.round(viewportWidth * state.zoomX * 1.5));
  board.style.width = `${scaledWidth}px`;
  board.style.minHeight = `${laneHeaderHeightPx() + computeLaneLayout().totalBodyHeight}px`;
}

function appendDurationSpan(note, isSelected = false) {
  if ((note.kind || "task") === "prerequisite") {
    return;
  }
  const targetSvg = timelineLinksSvg || linksSvg;
  const axisY = laneTimelineY(note.lane || SWIM_LANES[0].id);
  const { width } = boardSize();
  const startX = noteStartX(note);
  const durationWidth = Math.max(10, weeksToPixels(noteDurationWeeks(note)));
  const spanX1 = clamp(startX, 0, width);
  const spanX2 = clamp(startX + durationWidth, 0, width);

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", spanX1);
  line.setAttribute("y1", axisY);
  line.setAttribute("x2", spanX2);
  line.setAttribute("y2", axisY);
  line.setAttribute("class", isSelected ? "selection-duration-line" : "task-duration-line");
  targetSvg.appendChild(line);

  const leftCap = document.createElementNS("http://www.w3.org/2000/svg", "line");
  leftCap.setAttribute("x1", spanX1);
  leftCap.setAttribute("y1", axisY - 7);
  leftCap.setAttribute("x2", spanX1);
  leftCap.setAttribute("y2", axisY + 7);
  leftCap.setAttribute("class", isSelected ? "selection-duration-cap" : "task-duration-cap");
  targetSvg.appendChild(leftCap);

  const rightCap = document.createElementNS("http://www.w3.org/2000/svg", "line");
  rightCap.setAttribute("x1", spanX2);
  rightCap.setAttribute("y1", axisY - 7);
  rightCap.setAttribute("x2", spanX2);
  rightCap.setAttribute("y2", axisY + 7);
  rightCap.setAttribute("class", isSelected ? "selection-duration-cap" : "task-duration-cap");
  targetSvg.appendChild(rightCap);
}

function noteStartX(note) {
  return note.x;
}

function noteEndX(note) {
  return noteStartX(note) + weeksToPixels(noteDurationWeeks(note));
}

function prerequisiteLockedX(note) {
  return Math.max(0, stageStartX() - note.width - 18);
}

function positionNoteByStart(note, startX) {
  const { width } = boardSize();
  note.x = clamp(startX, 0, Math.max(0, width - note.width));
}

function relationshipType(link) {
  return link.type || "FS";
}

function syncStartLinkedNotes(noteId, startX, visited = new Set()) {
  if (visited.has(noteId)) {
    return;
  }
  visited.add(noteId);

  const note = state.notes.get(noteId);
  if (!note) {
    return;
  }

  positionNoteByStart(note, startX);
  updateNoteElement(note);
  const alignedStart = noteStartX(note);

  state.links.forEach((link) => {
    if (relationshipType(link) !== "SS") {
      return;
    }

    if (link.a === noteId) {
      syncStartLinkedNotes(link.b, alignedStart, visited);
      return;
    }

    if (link.b === noteId) {
      syncStartLinkedNotes(link.a, alignedStart, visited);
    }
  });
}

function enforceAllFinishStartLinks() {
  state.links.forEach((link) => {
    if (relationshipType(link) === "FS") {
      pushLinkedSuccessorsForward(link.a);
    }
  });
}

function predecessorEndBound(noteId) {
  let minStart = 0;
  state.links.forEach((link) => {
    if (relationshipType(link) !== "FS" || link.b !== noteId) {
      return;
    }

    const predecessor = state.notes.get(link.a);
    if (!predecessor) {
      return;
    }

    minStart = Math.max(minStart, noteEndX(predecessor));
  });
  return minStart;
}

function successorStartBound(noteId, noteDurationPx) {
  let maxStart = Infinity;
  state.links.forEach((link) => {
    if (relationshipType(link) !== "FS" || link.a !== noteId) {
      return;
    }

    const successor = state.notes.get(link.b);
    if (!successor) {
      return;
    }

    maxStart = Math.min(maxStart, noteStartX(successor) - noteDurationPx);
  });
  return maxStart;
}

function pushLinkedSuccessorsForward(noteId, visited = new Set()) {
  if (visited.has(noteId)) {
    return;
  }
  visited.add(noteId);

  const source = state.notes.get(noteId);
  if (!source) {
    return;
  }

  const sourceEnd = noteEndX(source);

  state.links.forEach((link) => {
    if (relationshipType(link) !== "FS" || link.a !== noteId) {
      return;
    }

    const successor = state.notes.get(link.b);
    if (!successor) {
      return;
    }

    const successorStart = noteStartX(successor);
    if (successorStart < sourceEnd) {
      positionNoteByStart(successor, sourceEnd);
      updateNoteElement(successor);
    }

    pushLinkedSuccessorsForward(successor.id, visited);
  });
}

function createTickMarks() {
  tickContainer.innerHTML = "";
  if (timelineGrid) {
    timelineGrid.innerHTML = "";
  }
  const { width } = boardSize();
  const topAxisY = firstTimelineY();
  const bottomAxisY = lastTimelineY();
  const labelY = laneHeaderHeightPx() - 12 * state.zoomY;
  const startMs = visibleStartMs();
  const endMs = visibleEndMs();
  const firstWeekStart = startOfUtcWeekMonday(startMs);
  const pxPerWeek = weeksToPixels(1);
  const labelEveryWeeks = Math.max(1, Math.ceil(72 / Math.max(1, pxPerWeek)));

  const axisEl = board.querySelector(".timeline-axis");
  const timelineLayerEl = board.querySelector(".timeline-layer");
  if (timelineLayerEl) {
    timelineLayerEl.style.height = `${laneHeaderHeightPx()}px`;
  }
  if (axisEl) {
    axisEl.innerHTML = "";
    axisEl.style.top = "0px";
    axisEl.style.height = `${laneHeaderHeightPx()}px`;
    SWIM_LANES.forEach((lane) => {
      const axisRow = document.createElement("div");
      axisRow.className = "timeline-axis-row";
      axisRow.style.top = `${laneTimelineY(lane.id)}px`;
      axisEl.appendChild(axisRow);
    });
  }

  let tickIndex = 0;
  for (let weekStart = firstWeekStart; weekStart <= endMs; weekStart += WEEK_MS) {
    const x = timestampToX(weekStart);

    if (timelineGrid) {
      const gridLine = document.createElement("div");
      gridLine.className = "timeline-grid-line";
      gridLine.style.left = `${x}px`;
      timelineGrid.appendChild(gridLine);
    }

    const tick = document.createElement("div");
    tick.className = "tick";
    tick.style.left = `${x}px`;
    tick.style.top = `${topAxisY - 8 * state.zoomY}px`;
    tick.style.height = `${Math.max(8, bottomAxisY - topAxisY + 16 * state.zoomY)}px`;

    tickContainer.appendChild(tick);

    if (tickIndex % labelEveryWeeks !== 0) {
      tickIndex += 1;
      continue;
    }

    const label = document.createElement("div");
    label.className = "tick-label";
    label.style.left = `${x}px`;
    label.style.top = `${labelY}px`;

    label.textContent = formatUtcDate(weekStart, "2-digit");

    tickContainer.appendChild(label);
    tickIndex += 1;
  }

  updateStageLines();
}

function ensureNoteHeaderMeta(noteEl) {
  const topbar = noteEl.querySelector(".note-topbar");
  if (!topbar) {
    return { orderEl: null, dateEl: null };
  }

  let metaEl = noteEl.querySelector(".note-meta");
  if (!metaEl) {
    metaEl = document.createElement("div");
    metaEl.className = "note-meta";
    topbar.insertBefore(metaEl, topbar.firstChild);
  }

  let orderEl = metaEl.querySelector(".note-order");
  if (!orderEl) {
    orderEl = document.createElement("span");
    orderEl.className = "note-order";
    metaEl.appendChild(orderEl);
  }

  let dateEl = metaEl.querySelector(".note-date");
  if (!dateEl) {
    dateEl = noteEl.querySelector(".note-date") || document.createElement("span");
    dateEl.classList.add("note-date");
    metaEl.appendChild(dateEl);
  } else if (dateEl.parentElement !== metaEl) {
    metaEl.appendChild(dateEl);
  }

  return { orderEl, dateEl };
}

function ensureDurationValueEl(noteEl) {
  let durationValue = noteEl.querySelector(".duration-value");
  if (!durationValue) {
    const durationContainer = noteEl.querySelector(".note-duration");
    if (!durationContainer) {
      return null;
    }

    durationValue = document.createElement("div");
    durationValue.className = "duration-value";
    durationContainer.appendChild(durationValue);
  }

  let weeksEl = durationValue.querySelector(".duration-weeks");
  if (!weeksEl) {
    durationValue.textContent = "";
    weeksEl = document.createElement("span");
    weeksEl.className = "duration-weeks";
    durationValue.appendChild(weeksEl);
    durationValue.append(" wk");
  }

  return weeksEl;
}

function noteDisplayName(note) {
  const raw = (note.text || "").trim();
  if (!raw) {
    return "Untitled";
  }
  return raw.split(/\r?\n/)[0];
}

function updateTaskOrderLabels() {
  const orderedNotes = [...state.notes.values()]
    .filter((note) => (note.kind || "task") !== "deliverable")
    .sort((left, right) => {
      const delta = noteStartX(left) - noteStartX(right);
      if (delta !== 0) {
        return delta;
      }
      return left.y - right.y;
    });

  orderedNotes.forEach((note, index) => {
    note.orderNumber = index + 1;
    const { orderEl } = ensureNoteHeaderMeta(note.el);
    if (orderEl) {
      orderEl.textContent = String(index + 1);
    }
    const collapsedOrderEl = note.el?.querySelector(".note-collapsed-order");
    if (collapsedOrderEl) {
      collapsedOrderEl.textContent = String(index + 1);
    }
  });
}

function orderedNotesByStart() {
  return [...state.notes.values()]
    .filter((note) => (note.kind || "task") !== "deliverable")
    .sort((left, right) => {
      const delta = noteStartX(left) - noteStartX(right);
      if (delta !== 0) {
        return delta;
      }
      return left.y - right.y;
    });
}

function predecessorNumbersForNote(noteId) {
  const predecessorNotes = [];
  const seen = new Set();
  state.links.forEach((link) => {
    if (relationshipType(link) !== "FS" || link.b !== noteId || seen.has(link.a)) {
      return;
    }
    const pred = state.notes.get(link.a);
    if (!pred) {
      return;
    }
    seen.add(link.a);
    predecessorNotes.push(pred);
  });

  return predecessorNotes
    .sort((left, right) => (left.orderNumber || 0) - (right.orderNumber || 0))
    .map((note) => String(note.orderNumber || "?"));
}

function parsePredecessorNumbersInput(rawValue) {
  if (!rawValue || !rawValue.trim()) {
    return [];
  }

  return [...new Set(
    rawValue
      .split(/[^0-9]+/)
      .map((item) => Number.parseInt(item, 10))
      .filter((item) => Number.isInteger(item) && item > 0),
  )];
}

function finishStartConflictNoteIds() {
  const conflicts = new Set();
  state.links.forEach((link) => {
    if (relationshipType(link) !== "FS") {
      return;
    }

    const predecessor = state.notes.get(link.a);
    const successor = state.notes.get(link.b);
    if (!predecessor || !successor) {
      return;
    }

    if (noteStartX(successor) + 0.5 < noteEndX(predecessor)) {
      conflicts.add(successor.id);
    }
  });
  return conflicts;
}

function applySchedulePredecessors(noteId, predecessorNumbers) {
  const targetNote = state.notes.get(noteId);
  if (!targetNote) {
    return;
  }

  const noteKind = (targetNote.kind || "task");
  if (noteKind === "prerequisite" || noteKind === "deliverable" || noteKind === "suggested") {
    setStatus("This note type cannot have predecessors.");
    return;
  }

  const orderToNote = new Map(
    orderedNotesByStart().map((note) => [note.orderNumber || 0, note]),
  );

  const newPredecessorIds = predecessorNumbers
    .map((number) => orderToNote.get(number)?.id)
    .filter(Boolean)
    .filter((predId) => predId !== noteId);

  const dedupedPredecessorIds = [...new Set(newPredecessorIds)];

  state.links = state.links.filter(
    (link) => !(relationshipType(link) === "FS" && link.b === noteId),
  );

  dedupedPredecessorIds.forEach((predId) => {
    const exists = state.links.some(
      (link) => relationshipType(link) === "FS" && link.a === predId && link.b === noteId,
    );
    if (!exists) {
      state.links.push({ id: uid("link"), a: predId, b: noteId, type: "FS" });
    }
  });

  enforceAllFinishStartLinks();
  refreshLayout();
  saveState();
}

function renderScheduleTable() {
  if (!scheduleTableBody) {
    return;
  }

  scheduleTableBody.innerHTML = "";
  const orderedNotes = orderedNotesByStart();
  const conflictingNotes = finishStartConflictNoteIds();

  if (orderedNotes.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "schedule-empty";
    cell.textContent = "No tasks available.";
    row.appendChild(cell);
    scheduleTableBody.appendChild(row);
    return;
  }

  orderedNotes.forEach((note) => {
    const row = document.createElement("tr");
    const isPrerequisite = (note.kind || "task") === "prerequisite";
    const isSuggested = isSuggestedNote(note);
    const startMs = isPrerequisite ? null : xToTimestamp(noteStartX(note));
    const endMs = isPrerequisite ? null : xToTimestamp(noteEndX(note));
    const predecessorsValue = predecessorNumbersForNote(note.id).join(", ");
    const cells = [
      `#${note.orderNumber || "?"} ${noteDisplayName(note)}`,
      DISCIPLINE_SHORT_NAMES[note.lane] || getLane(note.lane).name,
      isPrerequisite ? "Before start" : formatUtcDate(startMs, "numeric"),
      isPrerequisite ? "-" : formatUtcDate(endMs, "numeric"),
      isPrerequisite ? "Prerequisite" : `${note.durationWeeks} wk`,
    ];

    cells.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    const predecessorCell = document.createElement("td");
    const predecessorInput = document.createElement("input");
    predecessorInput.type = "text";
    predecessorInput.className = "schedule-predecessor-input";
    predecessorInput.placeholder = isPrerequisite || isSuggested ? "N/A" : "e.g. 10, 12";
    predecessorInput.value = predecessorsValue;
    predecessorInput.disabled = isPrerequisite || isSuggested;

    if (conflictingNotes.has(note.id)) {
      predecessorInput.classList.add("has-conflict");
      predecessorInput.title = "Conflict: this task cannot satisfy all predecessor constraints with current schedule.";
    }

    predecessorInput.addEventListener("change", () => {
      const nextNumbers = parsePredecessorNumbersInput(predecessorInput.value);
      applySchedulePredecessors(note.id, nextNumbers);
      setStatus(`Task #${note.orderNumber || "?"} predecessors updated.`);
    });

    predecessorCell.appendChild(predecessorInput);
    row.appendChild(predecessorCell);

    scheduleTableBody.appendChild(row);
  });
}

function updatePredecessorLabels() {
  state.notes.forEach((note) => {
    const labelEl = note.el?.querySelector(".note-predecessors");
    if (!labelEl) {
      return;
    }

    labelEl.replaceChildren();

    const titleEl = document.createElement("div");
    titleEl.className = "note-predecessors-title";
    titleEl.textContent = "Predecessors:";
    labelEl.appendChild(titleEl);

    const predecessorIds = [];
    const seen = new Set();
    state.links.forEach((link) => {
      if (link.b === note.id && !seen.has(link.a)) {
        seen.add(link.a);
        predecessorIds.push(link.a);
      }
    });

    if (predecessorIds.length === 0) {
      const noneEl = document.createElement("div");
      noneEl.className = "note-predecessor-item";
      noneEl.textContent = "none";
      labelEl.appendChild(noneEl);
      return;
    }

    predecessorIds
      .map((predId) => {
        const pred = state.notes.get(predId);
        if (!pred) {
          return null;
        }
        const order = pred.orderNumber || "?";
        return `#${order} ${noteDisplayName(pred)}`;
      })
      .filter(Boolean)
      .forEach((entry) => {
        const itemEl = document.createElement("div");
        itemEl.className = "note-predecessor-item";
        itemEl.textContent = entry;
        labelEl.appendChild(itemEl);
      });
  });
}

function renderSwimLanes() {
  swimLanesLayer.innerHTML = "";
  syncCollapseAllLanesInput();
  const headerPx = laneHeaderHeightPx();
  const laneLayout = computeLaneLayout();
  SWIM_LANES.forEach((lane, idx) => {
    const [r, g, b] = lane.color;
    const collapsed = isLaneCollapsed(lane.id);
    const laneTop = laneLayout.tops.get(lane.id) ?? (headerPx + idx * laneHeightPx());
    const lanePx = laneLayout.heights.get(lane.id) ?? laneHeightPx();
    const div = document.createElement("div");
    div.className = "swim-lane";
    if (collapsed) {
      div.classList.add("collapsed");
    }
    div.style.top = `${laneTop}px`;
    div.style.height = `${lanePx}px`;
    div.style.backgroundColor = `rgba(${r},${g},${b},0.28)`;
    const label = document.createElement("div");
    label.className = "swim-lane-label";
    label.style.color = `rgb(${Math.max(0, r - 60)},${Math.max(0, g - 60)},${Math.max(0, b - 60)})`;

    const nameEl = document.createElement("span");
    nameEl.className = "swim-lane-name";
    nameEl.textContent = lane.name;

    label.appendChild(nameEl);
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "swim-lane-toggle";
    toggleBtn.textContent = collapsed ? "Expand" : "Collapse";
    toggleBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleLaneCollapsed(lane.id);
    });
    label.appendChild(toggleBtn);
    div.appendChild(label);
    swimLanesLayer.appendChild(div);
  });
}

function renderLinks() {
  linksSvg.innerHTML = "";
  if (timelineLinksSvg) {
    timelineLinksSvg.innerHTML = "";
  }
  document.querySelectorAll(".link-reverse-btn, .link-delete-btn, .link-ss-btn").forEach((btn) => btn.remove());
  updateTaskOrderLabels();
  updatePredecessorLabels();
  renderScheduleTable();

  state.notes.forEach((note) => {
    if (isLaneCollapsed(note.lane || SWIM_LANES[0].id)) {
      return;
    }
    appendDurationSpan(note, false);
  });

  const selectedNote = state.selectedNoteId ? state.notes.get(state.selectedNoteId) : null;
  if (
    selectedNote &&
    (selectedNote.kind || "task") !== "prerequisite" &&
    (selectedNote.kind || "task") !== "deliverable" &&
    !isLaneCollapsed(selectedNote.lane || SWIM_LANES[0].id)
  ) {
    const durationLayer = timelineLinksSvg || linksSvg;
    const x = noteStartX(selectedNote);
    const axisY = laneTimelineY(selectedNote.lane || SWIM_LANES[0].id);
    const noteBottom = selectedNote.y + selectedNote.height;
    const noteTop = selectedNote.y;

    const fromY = noteBottom <= axisY ? noteBottom : noteTop >= axisY ? noteTop : selectedNote.y + selectedNote.height / 2;

    const guide = document.createElementNS("http://www.w3.org/2000/svg", "line");
    guide.setAttribute("x1", x);
    guide.setAttribute("y1", fromY);
    guide.setAttribute("x2", x);
    guide.setAttribute("y2", axisY);
    guide.setAttribute("class", "selection-guide-line");
    durationLayer.appendChild(guide);

    appendDurationSpan(selectedNote, true);
  }

  if (state.selectedForLink && state.linkPreviewCursor) {
    const sourceNote = state.notes.get(state.selectedForLink);
    if (sourceNote) {
      const from = noteCenter(sourceNote);
      const preview = document.createElementNS("http://www.w3.org/2000/svg", "line");
      preview.setAttribute("x1", from.x);
      preview.setAttribute("y1", from.y);
      preview.setAttribute("x2", state.linkPreviewCursor.x);
      preview.setAttribute("y2", state.linkPreviewCursor.y);
      preview.setAttribute("class", "link-preview-line");
      linksSvg.appendChild(preview);
    }
  }

  state.links.forEach((link) => {
    const a = state.notes.get(link.a);
    const b = state.notes.get(link.b);
    if (!a || !b) {
      return;
    }

    if (isLaneCollapsed(a.lane || SWIM_LANES[0].id) || isLaneCollapsed(b.lane || SWIM_LANES[0].id)) {
      return;
    }

    const isConnectedToSelection =
      !!state.selectedNoteId && (link.a === state.selectedNoteId || link.b === state.selectedNoteId);
    const isCriticalLink = state.showCriticalPath && state.criticalPathLinkIds.has(link.id);

    if (state.hideNeutralLinks && !isConnectedToSelection && !isCriticalLink) {
      return;
    }

    const from = noteCenter(a);
    const to = noteCenter(b);
    const mid = {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2,
    };

    const predecessorLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    predecessorLine.setAttribute("x1", from.x);
    predecessorLine.setAttribute("y1", from.y);
    predecessorLine.setAttribute("x2", mid.x);
    predecessorLine.setAttribute("y2", mid.y);
    predecessorLine.setAttribute(
      "class",
      isCriticalLink
        ? "link-line link-critical-predecessor"
        : isConnectedToSelection
          ? "link-line link-predecessor"
          : "link-line link-neutral",
    );

    const successorLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    successorLine.setAttribute("x1", mid.x);
    successorLine.setAttribute("y1", mid.y);
    successorLine.setAttribute("x2", to.x);
    successorLine.setAttribute("y2", to.y);
    successorLine.setAttribute(
      "class",
      isCriticalLink
        ? "link-line link-critical-successor"
        : isConnectedToSelection
          ? "link-line link-successor"
          : "link-line link-neutral",
    );

    linksSvg.appendChild(predecessorLine);
    linksSvg.appendChild(successorLine);

    if (!isConnectedToSelection) {
      return;
    }

    const involvesPrerequisite = (a.kind || "task") === "prerequisite" || (b.kind || "task") === "prerequisite";

    if (!involvesPrerequisite) {
      const reverseBtn = document.createElement("button");
      reverseBtn.className = "link-reverse-btn";
      reverseBtn.title = "Reverse relationship";
      reverseBtn.textContent = "⇄";
      reverseBtn.style.left = `${mid.x - 36}px`;
      reverseBtn.style.top = `${mid.y}px`;
      reverseBtn.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        event.preventDefault();
        reverseLink(link.id);
      });
      board.appendChild(reverseBtn);

      const ssBtn = document.createElement("button");
      ssBtn.className = "link-ss-btn";
      const isStartStart = relationshipType(link) === "SS";
      ssBtn.title = isStartStart ? "Set finish-to-start relationship" : "Set start-to-start relationship";
      ssBtn.textContent = isStartStart ? "FS" : "SS";
      ssBtn.style.left = `${mid.x}px`;
      ssBtn.style.top = `${mid.y}px`;
      ssBtn.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        event.preventDefault();
        if (isStartStart) {
          setLinkFinishToStart(link.id);
        } else {
          setLinkStartToStart(link.id);
        }
      });
      board.appendChild(ssBtn);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "link-delete-btn";
    deleteBtn.title = "Delete relationship";
    deleteBtn.textContent = "X";
    deleteBtn.style.left = `${involvesPrerequisite ? mid.x : mid.x + 36}px`;
    deleteBtn.style.top = `${mid.y}px`;
    deleteBtn.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      event.preventDefault();
      deleteLink(link.id);
    });
    board.appendChild(deleteBtn);
  });
}

function setSelectedNote(noteId) {
  if (state.selectedNoteId === noteId) {
    return;
  }

  const current = state.selectedNoteId ? state.notes.get(state.selectedNoteId) : null;
  current?.el.classList.remove("selected");

  state.selectedNoteId = noteId;
  const next = noteId ? state.notes.get(noteId) : null;
  next?.el.classList.add("selected");

  updateCriticalPathView();
  refreshLayout();
}

function updateNoteElement(note) {
  if (!note.el) {
    return;
  }

  const laneCollapsed = isLaneCollapsed(note.lane || SWIM_LANES[0].id);
  note.el.style.display = laneCollapsed ? "none" : "";
  if (laneCollapsed) {
    return;
  }

  const inCriticalPath = state.showCriticalPath && state.criticalPathNoteIds.has(note.id);
  note.el.classList.toggle("critical-path-note", inCriticalPath);

  const editable = canEditNote(note);
  const isPrerequisite = (note.kind || "task") === "prerequisite";
  const isDeliverable = (note.kind || "task") === "deliverable";
  const isSuggested = isSuggestedNote(note);
  const contentEl = note.el.querySelector(".note-content");
  const deleteBtnEl = note.el.querySelector(".note-delete");
  const durationEl = note.el.querySelector(".note-duration");
  const linkBtnEl = note.el.querySelector(".note-link");
  const requestBtnEl = note.el.querySelector(".note-request");
  const memoBtnEl = note.el.querySelector(".note-memo-link");
  const reviewActionsEl = note.el.querySelector(".note-review-actions");
  const feedbackIndicatorEl = note.el.querySelector(".note-feedback-indicator");
  const topbarEl = note.el.querySelector(".note-topbar");
  const collapsedRowEl = note.el.querySelector(".note-collapsed-row");

  note.el.classList.toggle("prerequisite-note", isPrerequisite);
  note.el.classList.toggle("deliverable-note", isDeliverable);
  note.el.classList.toggle("suggested-note", isSuggested);

  if (contentEl) {
    contentEl.setAttribute("contenteditable", editable && !isDeliverable ? "true" : "false");
  }
  if (topbarEl) {
    topbarEl.style.display = isDeliverable ? "none" : "";
  }
  if (collapsedRowEl) {
    collapsedRowEl.style.display = isDeliverable ? "none" : "";
  }
  if (deleteBtnEl) {
    deleteBtnEl.style.display = editable && !isDeliverable && !isSuggested ? "" : "none";
  }
  if (durationEl) {
    durationEl.style.display = editable && !isPrerequisite && !isDeliverable ? "" : "none";
  }
  if (linkBtnEl) {
    linkBtnEl.style.display = editable && !isPrerequisite && !isDeliverable && !isSuggested ? "" : "none";
  }
  if (requestBtnEl) {
    requestBtnEl.style.display = editable && !isPrerequisite && !isDeliverable && !isSuggested ? "" : "none";
  }
  if (memoBtnEl) {
    memoBtnEl.style.display = isSuggested ? "" : "none";
    memoBtnEl.classList.toggle("has-memo", !!String(note.requestMemo || "").trim());
    memoBtnEl.classList.toggle("no-memo", !String(note.requestMemo || "").trim());
  }
  if (reviewActionsEl) {
    reviewActionsEl.style.display = isSuggested && editable ? "flex" : "none";
  }
  if (feedbackIndicatorEl) {
    feedbackIndicatorEl.style.display = normalizeDeclineFeedback(note.requestDeclines).length ? "inline-flex" : "none";
  }

  const predecessorEl = note.el.querySelector(".note-predecessors");
  if (predecessorEl) {
    predecessorEl.style.display = isPrerequisite || isDeliverable || isSuggested ? "none" : "";
  }

  const isExpanded = isDeliverable || state.selectedNoteId === note.id || inCriticalPath;
  note.el.classList.toggle("collapsed", !isExpanded);

  const collapsedOrderEl = note.el.querySelector(".note-collapsed-order");
  const collapsedTextEl = note.el.querySelector(".note-collapsed-text");
  const collapsedDurationEl = note.el.querySelector(".note-collapsed-duration");

  if (collapsedOrderEl) {
    collapsedOrderEl.textContent = String(note.orderNumber || "?");
  }
  if (collapsedTextEl) {
    collapsedTextEl.textContent = noteDisplayName(note);
  }
  if (collapsedDurationEl) {
    collapsedDurationEl.textContent = isPrerequisite ? "PRE" : isDeliverable ? "" : `${note.durationWeeks} wk`;
  }

  const scale = noteScale();
  if (isExpanded) {
    note.width = Math.max(1, note.baseWidth * scale);
    note.height = Math.max(1, note.baseHeight * scale);
    note.el.style.width = `${note.baseWidth}px`;
    note.el.style.height = `${note.baseHeight}px`;
    note.el.style.transform = `scale(${scale})`;
  } else {
    const collapsedScale = noteScale();
    const collapsedBaseWidth = Math.max(156, note.baseWidth * 1.144);
    const collapsedBaseHeight = 42;
    note.width = collapsedBaseWidth * collapsedScale;
    note.height = collapsedBaseHeight * collapsedScale;
    note.el.style.width = `${collapsedBaseWidth}px`;
    note.el.style.height = `${collapsedBaseHeight}px`;
    note.el.style.transform = `scale(${collapsedScale})`;
  }

  const { dateEl } = ensureNoteHeaderMeta(note.el);
  const weeksEl = ensureDurationValueEl(note.el);

  note.el.style.transformOrigin = "top left";
  if (isPrerequisite) {
    note.x = prerequisiteLockedX(note);
  } else if (isDeliverable) {
    note.x = deliverableLockedX(note);
  }
  note.el.style.left = `${note.x}px`;
  note.el.style.top = `${note.y}px`;
  if (dateEl) {
    if (isPrerequisite) {
      dateEl.textContent = "Before start";
    } else if (isDeliverable) {
      dateEl.textContent = "At finish";
    } else if (isSuggested) {
      dateEl.textContent = `Requested for ${getLane(note.lane).name}`;
    } else {
      dateEl.textContent = xToDateLabel(noteStartX(note));
    }
  }
  if (weeksEl) {
    weeksEl.textContent = String(note.durationWeeks);
  }

  const lane = getLane(note.lane);
  const [r, g, b] = lane.color;
  if (isPrerequisite) {
    note.el.style.background = "linear-gradient(165deg, #d9f0ff 0%, #b8dcff 100%)";
    note.el.style.borderColor = "#000";
  } else if (isDeliverable) {
    note.el.style.background = "linear-gradient(165deg, #fffdfd 0%, #fff1f1 100%)";
    note.el.style.borderColor = "#b91c1c";
  } else if (isSuggested) {
    note.el.style.background = "linear-gradient(165deg, #ffd8d8 0%, #f87171 100%)";
    note.el.style.borderColor = "#b91c1c";
  } else {
    note.el.style.background = `linear-gradient(165deg, rgba(255,255,255,0.5) 0%, rgba(${r},${g},${b},0.92) 100%)`;
    note.el.style.borderColor = `rgba(${Math.max(0, r - 30)},${Math.max(0, g - 30)},${Math.max(0, b - 30)},0.7)`;
  }
}

function snapshotNoteStartTimestamps() {
  const snapshot = new Map();
  state.notes.forEach((note) => {
    snapshot.set(note.id, xToTimestamp(noteStartX(note)));
  });
  return snapshot;
}

function applyHorizontalZoom(nextZoom, options = {}) {
  const oldWidth = board.clientWidth || 1;
  const oldScrollLeft = boardViewport.scrollLeft;
  const noteStartTimestamps = snapshotNoteStartTimestamps();
  const clampedZoom = clamp(nextZoom, 0.3, 2.5);

  state.zoomX = clampedZoom;
  zoomXInput.value = String(Math.round(clampedZoom * 100));
  updateZoomBadges();

  let mouseXInViewport = null;
  let worldX = null;
  if (typeof options.anchorClientX === "number") {
    const viewportRect = boardViewport.getBoundingClientRect();
    mouseXInViewport = clamp(options.anchorClientX - viewportRect.left, 0, boardViewport.clientWidth);
    worldX = oldScrollLeft + mouseXInViewport;
  }

  updateBoardWidth();
  refreshLayout({ noteStartTimestamps });

  if (worldX !== null && mouseXInViewport !== null) {
    const newWidth = board.clientWidth || 1;
    const scale = newWidth / oldWidth;
    const targetScrollLeft = worldX * scale - mouseXInViewport;
    const maxScrollLeft = Math.max(0, newWidth - boardViewport.clientWidth);
    boardViewport.scrollLeft = clamp(targetScrollLeft, 0, maxScrollLeft);
  }

  saveViewState();
}

function applyVerticalZoom(nextZoom) {
  const noteStartTimestamps = snapshotNoteStartTimestamps();
  const clampedZoom = clamp(nextZoom, 0.5, 2.5);

  state.zoomY = clampedZoom;
  zoomYInput.value = String(Math.round(clampedZoom * 100));
  updateZoomBadges();

  updateBoardWidth();
  refreshLayout({ noteStartTimestamps });
  saveViewState();
}

function refreshLayout(options = {}) {
  updateCriticalPathView();
  const noteStartTimestamps = options.noteStartTimestamps || null;
  const selectedId = state.selectedNoteId;

  // First pass: normalize start positions and compute note dimensions for current mode.
  state.notes.forEach((note) => {
    clampNoteDurationToStage(note);

    if (noteStartTimestamps?.has(note.id) && !["prerequisite", "deliverable"].includes(note.kind || "task")) {
      positionNoteByStart(note, timestampToX(noteStartTimestamps.get(note.id)));
    }

    const noteDurationPx = weeksToPixels(noteDurationWeeks(note));
    const bounds = stageStartBounds(note.id, noteDurationPx);
    let nextStart = noteStartX(note);
    if (state.snapToWeek) {
      nextStart = snapStartToMondayWithinBounds(nextStart, bounds.minStart, bounds.maxStart);
    }
    positionNoteByStart(note, clamp(nextStart, bounds.minStart, bounds.maxStart));

    if ((note.kind || "task") === "prerequisite") {
      note.x = prerequisiteLockedX(note);
    } else if ((note.kind || "task") === "deliverable") {
      note.x = deliverableLockedX(note);
    }

    updateNoteElement(note);
  });

  // Second pass: stack collapsed notes by lane using row-packing by horizontal overlap.
  const collapsedHeight = collapsedNoteHeightPx();
  SWIM_LANES.forEach((lane) => {
    const laneTop = laneTopY(lane.id);
    const packed = buildCollapsedLaneRows(lane.id, selectedId);
    packed.noteRow.forEach((rowIndex, noteId) => {
      const note = state.notes.get(noteId);
      if (!note) {
        return;
      }
      note.y = laneTop + COLLAPSED_NOTE_PAD_TOP + rowIndex * (collapsedHeight + COLLAPSED_NOTE_GAP);
    });
  });

  // Final pass: clamp and paint all notes with final coordinates.
  const laneLayout = computeLaneLayout();
  const { width } = boardSize();
  state.notes.forEach((note) => {
    note.x = (note.kind || "task") === "prerequisite"
      ? prerequisiteLockedX(note)
      : (note.kind || "task") === "deliverable"
        ? deliverableLockedX(note)
      : clamp(note.x, 0, Math.max(0, width - note.width));

    if (note.id === selectedId) {
      const laneId = note.lane || SWIM_LANES[0].id;
      const lTop = laneLayout.tops.get(laneId) ?? laneTopY(laneId);
      const laneHeight = laneLayout.heights.get(laneId) ?? laneBodyHeightPx(laneId);
      note.y = clamp(note.y, lTop, Math.max(lTop, lTop + laneHeight - note.height));
    }

    updateNoteElement(note);
  });

  renderSwimLanes();
  createTickMarks();
  renderLinks();
}

function removeLinksForNote(noteId) {
  state.links = state.links.filter((link) => link.a !== noteId && link.b !== noteId);
}

function reverseLink(linkId) {
  const link = state.links.find((l) => l.id === linkId);
  if (link) {
    if (isPrerequisiteNoteId(link.a)) {
      setStatus("Cannot reverse: prerequisite tasks must remain predecessors.");
      return;
    }
    [link.a, link.b] = [link.b, link.a];
    if (relationshipType(link) === "SS") {
      const source = state.notes.get(link.a);
      if (source) {
        syncStartLinkedNotes(link.a, noteStartX(source));
      }
    }
    enforceAllFinishStartLinks();
    renderLinks();
    saveState();
    setStatus("Link reversed.");
  }
}

function setLinkStartToStart(linkId) {
  const link = state.links.find((l) => l.id === linkId);
  if (!link) {
    return;
  }

  link.type = "SS";
  const source = state.notes.get(link.a);
  if (source) {
    syncStartLinkedNotes(link.a, noteStartX(source));
  }
  enforceAllFinishStartLinks();
  renderLinks();
  saveState();
  setStatus("Relationship updated: start-to-start.");
}

function setLinkFinishToStart(linkId) {
  const link = state.links.find((l) => l.id === linkId);
  if (!link) {
    return;
  }

  link.type = "FS";
  enforceAllFinishStartLinks();
  renderLinks();
  saveState();
  setStatus("Relationship updated: finish-to-start.");
}

function deleteLink(linkId) {
  const before = state.links.length;
  state.links = state.links.filter((link) => link.id !== linkId);
  if (state.links.length !== before) {
    renderLinks();
    saveState();
    setStatus("Relationship deleted.");
  }
}

function deleteNote(noteId, options = {}) {
  const { skipSave = false, skipStatus = false, skipCascade = false } = options;
  const note = state.notes.get(noteId);
  if (!note) {
    return;
  }

  note.el.remove();
  state.notes.delete(noteId);
  removeLinksForNote(noteId);

  if (state.selectedForLink === noteId) {
    state.selectedForLink = null;
    state.linkPreviewCursor = null;
  }

  if (state.selectedNoteId === noteId) {
    state.selectedNoteId = null;
  }

  if (!skipCascade) {
    [...state.notes.values()]
      .filter((item) => isSuggestedNote(item) && item.requestSourceNoteId === noteId)
      .forEach((item) => deleteNote(item.id, { skipSave: true, skipStatus: true, skipCascade: true }));
  }

  renderLinks();
  if (!skipSave) {
    saveState();
  }
  if (!skipStatus) {
    setStatus("Note deleted.");
  }
}

function isPrerequisiteNoteId(noteId) {
  const note = state.notes.get(noteId);
  return !!note && (note.kind || "task") === "prerequisite";
}

function isSuggestedNoteId(noteId) {
  return isSuggestedNote(state.notes.get(noteId));
}

function showSuggestionMemo(note) {
  const memo = String(note?.requestMemo || "").trim();
  openMemoModal(
    "Suggested Task Memo",
    `<p>${memo ? escapeHtml(memo).replace(/\n/g, "<br>") : "No memo provided."}</p>`,
  );
}

function showDeclineFeedback(note) {
  const feedbackItems = normalizeDeclineFeedback(note?.requestDeclines);
  if (!feedbackItems.length) {
    openMemoModal("Decline Feedback", "<p>No decline feedback has been recorded for this task.</p>");
    return;
  }

  const body = feedbackItems
    .map((item) => {
      const laneName = item.laneName || getLane(item.laneId || SWIM_LANES[0].id).name;
      const taskText = item.taskText || "Suggested task";
      const rescindButton = canEditNote(note)
        ? `<div class="board-feedback-actions"><button class="board-feedback-rescind-btn" type="button" data-note-id="${escapeHtml(note.id)}" data-feedback-id="${escapeHtml(item.id)}">Recind Request</button></div>`
        : "";
      return `<section class="board-feedback-entry"><h3>${escapeHtml(laneName)}: ${escapeHtml(taskText)}</h3><p>${escapeHtml(item.memo).replace(/\n/g, "<br>")}</p>${rescindButton}</section>`;
    })
    .join("");

  openMemoModal("Decline Feedback", body);
}

function rescindDeclinedRequest(noteId, feedbackId) {
  const note = state.notes.get(noteId);
  if (!note) {
    return;
  }

  const nextFeedback = normalizeDeclineFeedback(note.requestDeclines).filter((item) => item.id !== feedbackId);
  note.requestDeclines = nextFeedback;
  updateNoteElement(note);
  saveState();

  if (nextFeedback.length === 0) {
    closeMemoModal();
    setStatus("Declined request rescinded.");
    return;
  }

  showDeclineFeedback(note);
  setStatus("Declined request rescinded.");
}

function createSuggestedNoteFromRequest(sourceNoteId, targetLaneId, taskText, memo) {
  const sourceNote = state.notes.get(sourceNoteId);
  if (!sourceNote) {
    return;
  }

  const laneId = getLane(targetLaneId).id;
  const laneTop = laneTopY(laneId);
  const laneHeight = laneBodyHeightPx(laneId);
  const suggestedX = Math.max(stageStartX(), noteStartX(sourceNote) - 220 * state.zoomX);

  createNote({
    x: suggestedX,
    y: laneTop + laneHeight / 2 - 94 * noteScale(),
    text: taskText,
    kind: "suggested",
    lane: laneId,
    requestSourceNoteId: sourceNoteId,
    requestMemo: memo,
    requestDeclines: [],
  });

  closeSuggestionModal();
  saveState();
  setStatus(`${getLane(laneId).name} suggestion created.`);
}

function acceptSuggestedNote(noteId) {
  const note = state.notes.get(noteId);
  if (!note || !isSuggestedNote(note)) {
    return;
  }

  note.kind = "task";
  note.requestMemo = "";
  const sourceNoteId = note.requestSourceNoteId;
  note.requestSourceNoteId = null;
  note.requestDeclines = normalizeDeclineFeedback(note.requestDeclines);
  note.durationWeeks = clamp(Number(note.durationWeeks) || 1, MIN_DURATION_WEEKS, MAX_DURATION_WEEKS);

  if (sourceNoteId && state.notes.has(sourceNoteId)) {
    const exists = state.links.some((link) => relationshipType(link) === "FS" && link.a === note.id && link.b === sourceNoteId);
    if (!exists) {
      state.links.push({ id: uid("link"), a: note.id, b: sourceNoteId, type: "FS" });
    }
  }

  enforceAllFinishStartLinks();
  refreshLayout();
  saveState();
  setStatus("Suggested task accepted.");
}

function declineSuggestedNote(noteId, memo) {
  const note = state.notes.get(noteId);
  if (!note || !isSuggestedNote(note)) {
    return;
  }

  const sourceNote = note.requestSourceNoteId ? state.notes.get(note.requestSourceNoteId) : null;
  if (sourceNote) {
    sourceNote.requestDeclines = normalizeDeclineFeedback(sourceNote.requestDeclines);
    sourceNote.requestDeclines.push({
      id: uid("decline"),
      sourceNoteId: note.id,
      laneId: note.lane,
      laneName: getLane(note.lane).name,
      taskText: note.text,
      memo,
      createdAt: new Date().toISOString(),
    });
    updateNoteElement(sourceNote);
  }

  deleteNote(noteId, { skipSave: true, skipStatus: true, skipCascade: true });
  closeDeclineModal();
  saveState();
  setStatus("Suggested task declined.");
}

function beginLinkSelection(noteId, noteEl, event) {
  if (!state.selectedForLink) {
    const selectedNote = state.notes.get(noteId);
    if (selectedNote && !canEditNote(selectedNote)) {
      setStatus("Start links from a task in your assigned discipline.");
      return;
    }

    const noteKind = selectedNote && (selectedNote.kind || "task");
    if (noteKind === "prerequisite") {
      setStatus("Prerequisite tasks can only be predecessors. Select the dependent task first.");
      return;
    }

    if (noteKind === "deliverable") {
      setStatus("Deliverables cannot be linked.");
      return;
    }

    if (noteKind === "suggested") {
      setStatus("Accept the suggested task before linking it.");
      return;
    }

    // The first note is the successor/task being defined.
    state.selectedForLink = noteId;
    if (event && typeof event.clientX === "number") {
      const boardRect = board.getBoundingClientRect();
      state.linkPreviewCursor = {
        x: clamp(event.clientX - boardRect.left, 0, board.clientWidth),
        y: clamp(event.clientY - boardRect.top, 0, board.clientHeight),
      };
    } else {
      state.linkPreviewCursor = noteCenter(state.notes.get(noteId));
    }
    noteEl?.classList.add("link-source");
    setStatus("Task selected. Click the predecessor note.");
    renderLinks();
    return;
  }

  const successorId = state.selectedForLink;
  const predecessorId = noteId;

  const selectedEl = state.notes.get(successorId)?.el;
  selectedEl?.classList.remove("link-source");
  state.selectedForLink = null;
  state.linkPreviewCursor = null;

  if (successorId === predecessorId) {
    setStatus("Select a different predecessor note.");
    return;
  }

  if (isPrerequisiteNoteId(successorId)) {
    setStatus("Prerequisite tasks can only be predecessors.");
    return;
  }

  if (isSuggestedNoteId(successorId) || isSuggestedNoteId(predecessorId)) {
    setStatus("Accept the suggested task before linking it.");
    return;
  }

  const exists = state.links.some(
    (link) =>
      (link.a === predecessorId && link.b === successorId) ||
      (link.a === successorId && link.b === predecessorId),
  );

  if (exists) {
    setStatus("That relationship already exists.");
    return;
  }

  // FS relationship: predecessor -> successor
  state.links.push({ id: uid("link"), a: predecessorId, b: successorId, type: "FS" });
  enforceAllFinishStartLinks();
  renderLinks();
  saveState();
  setStatus("Relationship created.");
}

function createNote({
  x,
  y,
  text,
  durationWeeks = MIN_DURATION_WEEKS,
  id = null,
  kind = "task",
  lane = SWIM_LANES[0].id,
  importedFromCsv = false,
  importedFileName = null,
  requestSourceNoteId = null,
  requestMemo = "",
  requestDeclines = [],
}) {
  const node = noteTemplate.content.firstElementChild.cloneNode(true);
  const content = node.querySelector(".note-content");
  const deleteBtn = node.querySelector(".note-delete");
  const linkBtn = node.querySelector(".note-link");
  const requestBtn = node.querySelector(".note-request");
  const memoBtn = node.querySelector(".note-memo-link");
  const acceptBtn = node.querySelector(".note-accept-btn");
  const declineBtn = node.querySelector(".note-decline-btn");
  const feedbackBtn = node.querySelector(".note-feedback-indicator");
  const increaseBtn = node.querySelector(".duration-up");
  const decreaseBtn = node.querySelector(".duration-down");

  const noteId = id || uid("note");
  const maxDurationWeeks = Math.max(MIN_DURATION_WEEKS, Math.min(MAX_DURATION_WEEKS, Math.floor(state.stageDurationWeeks)));
  const noteKind = kind || "task";
  const note = {
    id: noteId,
    x,
    y,
    width: 210,
    height: noteKind === "deliverable" ? 78 : 150,
    baseWidth: 210,
    baseHeight: noteKind === "deliverable" ? 78 : 150,
    text: text || "",
    durationWeeks: ["prerequisite", "deliverable"].includes(noteKind) ? 0 : clamp(durationWeeks, MIN_DURATION_WEEKS, maxDurationWeeks),
    kind: noteKind,
    lane: getLane(lane).id,
    importedFromCsv: !!importedFromCsv,
    importedFileName: importedFileName || null,
    requestSourceNoteId: requestSourceNoteId || null,
    requestMemo: String(requestMemo || "").trim(),
    requestDeclines: normalizeDeclineFeedback(requestDeclines),
    el: node,
  };

  node.classList.toggle("prerequisite-note", note.kind === "prerequisite");
  node.classList.toggle("deliverable-note", note.kind === "deliverable");
  node.classList.toggle("suggested-note", note.kind === "suggested");

  content.textContent = note.text || "New idea...";

  content.addEventListener("input", () => {
    if (!canEditNote(note) || note.kind === "deliverable") {
      content.textContent = note.text || "New idea...";
      return;
    }
    note.text = content.textContent.trim();
    saveState();
  });

  deleteBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!canEditNote(note) || note.kind === "deliverable") {
      setStatus("Cannot delete this note.");
      return;
    }
    deleteNote(noteId);
    saveState();
  });

  linkBtn.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (!canEditNote(note)) {
      setStatus("Start links from a task in your assigned discipline.");
      return;
    }
    setSelectedNote(noteId);
    beginLinkSelection(noteId, node, event);
  });

  if (requestBtn) {
    requestBtn.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      event.preventDefault();
      if (!canEditNote(note)) {
        setStatus("Suggest tasks from a note in your assigned discipline.");
        return;
      }
      if (isSuggestedNote(note) || ["prerequisite", "deliverable"].includes(note.kind || "task")) {
        setStatus("This note cannot request a predecessor suggestion.");
        return;
      }
      setSelectedNote(noteId);
      openSuggestionModal(noteId);
    });
  }

  if (memoBtn) {
    memoBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      showSuggestionMemo(note);
    });
  }

  if (acceptBtn) {
    acceptBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!canEditNote(note)) {
        setStatus("You can only review suggestions in your assigned discipline.");
        return;
      }
      acceptSuggestedNote(noteId);
    });
  }

  if (declineBtn) {
    declineBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!canEditNote(note)) {
        setStatus("You can only review suggestions in your assigned discipline.");
        return;
      }
      openDeclineModal(noteId);
    });
  }

  if (feedbackBtn) {
    feedbackBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      showDeclineFeedback(note);
    });
  }

  increaseBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!canEditNote(note)) {
      setStatus("You can only edit notes in your assigned discipline.");
      return;
    }
    setSelectedNote(noteId);
    if (note.kind === "prerequisite") {
      return;
    }
    const maxDurationWeeks = Math.max(MIN_DURATION_WEEKS, Math.min(MAX_DURATION_WEEKS, Math.floor(state.stageDurationWeeks)));
    note.durationWeeks = clamp(note.durationWeeks + 1, MIN_DURATION_WEEKS, maxDurationWeeks);
    updateNoteElement(note);
    syncStartLinkedNotes(noteId, noteStartX(note));
    enforceAllFinishStartLinks();
    renderLinks();
    saveState();
  });

  decreaseBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!canEditNote(note)) {
      setStatus("You can only edit notes in your assigned discipline.");
      return;
    }
    setSelectedNote(noteId);
    if (note.kind === "prerequisite") {
      return;
    }
    note.durationWeeks = clamp(note.durationWeeks - 1, MIN_DURATION_WEEKS, MAX_DURATION_WEEKS);
    updateNoteElement(note);
    syncStartLinkedNotes(noteId, noteStartX(note));
    enforceAllFinishStartLinks();
    renderLinks();
    saveState();
  });

  node.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".note-delete, .note-request, .note-memo-link, .note-accept-btn, .note-decline-btn, .note-feedback-indicator")) {
      return;
    }

    if (event.target.closest(".duration-btn")) {
      if (!canEditNote(note)) {
        setStatus("You can only edit notes in your assigned discipline.");
        return;
      }
      setSelectedNote(noteId);
      return;
    }

    if (event.target.closest(".note-link")) {
      if (!canEditNote(note)) {
        setStatus("Start links from a task in your assigned discipline.");
        return;
      }
      setSelectedNote(noteId);
      return;
    }

    if (state.selectedForLink && state.selectedForLink !== noteId && !event.target.closest(".note-link")) {
      setSelectedNote(noteId);
      beginLinkSelection(noteId, node, event);
      return;
    }

    if (event.target.closest(".note-content")) {
      if (!canEditNote(note)) {
        setSelectedNote(noteId);
        return;
      }
      setSelectedNote(noteId);
      return;
    }

    if (!canEditNote(note)) {
      setSelectedNote(noteId);
      return;
    }

    if (note.kind === "prerequisite" || note.kind === "deliverable") {
      setSelectedNote(noteId);
      return;
    }

    setSelectedNote(noteId);

    event.preventDefault();
    const rect = node.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();

    dragState = {
      id: noteId,
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      boardLeft: boardRect.left,
      boardTop: boardRect.top,
    };

    node.classList.add("dragging");
    node.setPointerCapture(event.pointerId);
  });

  node.addEventListener("pointerup", (event) => {
    node.classList.remove("dragging");
    if (node.hasPointerCapture(event.pointerId)) {
      node.releasePointerCapture(event.pointerId);
    }
  });

  notesLayer.appendChild(node);
  state.notes.set(noteId, note);

  requestAnimationFrame(() => {
    const measuredWidth = node.offsetWidth;
    const measuredHeight = node.offsetHeight;
    const canUseMeasuredSize =
      measuredWidth > 0 &&
      measuredHeight > 0 &&
      !node.classList.contains("collapsed") &&
      node.style.display !== "none";

    // Keep intrinsic expanded size stable; collapsed/hidden sizes should not become the base dimensions.
    if (canUseMeasuredSize) {
      note.baseWidth = measuredWidth;
      note.baseHeight = measuredHeight;
    }
    note.width = note.baseWidth * noteScale();
    note.height = note.baseHeight * noteScale();

    const { width } = boardSize();
    note.x = clamp(note.x, 0, Math.max(0, width - note.width));
    const rafLaneId = note.lane || SWIM_LANES[0].id;
    const rafLaneTop = laneTopY(rafLaneId);
    const rafLaneHeight = laneBodyHeightPx(rafLaneId);
    note.y = clamp(note.y, rafLaneTop, Math.max(rafLaneTop, rafLaneTop + rafLaneHeight - note.height));

    updateNoteElement(note);
    renderLinks();
  });
}

function createDeliverableNotes(deliverables, finishDateMs) {
  if (!deliverables) {
    return;
  }

  state.deliverables = deliverables;

  [...state.notes.values()]
    .filter((note) => (note.kind || "task") === "deliverable")
    .forEach((note) => {
      note.el?.remove();
      state.notes.delete(note.id);
      removeLinksForNote(note.id);
      if (state.selectedNoteId === note.id) {
        state.selectedNoteId = null;
      }
      if (state.selectedForLink === note.id) {
        state.selectedForLink = null;
        state.linkPreviewCursor = null;
      }
    });

  const deliverableX = timestampToX(finishDateMs || state.finishDateMs) + 18;
  const deliverableYForLane = (laneId) => laneTopY(laneId) + 26;

  if (deliverables.type === "common") {
    SWIM_LANES.forEach((lane) => {
      createNote({
        x: deliverableX,
        y: deliverableYForLane(lane.id),
        text: deliverables.name || "Final Deliverable",
        durationWeeks: 0,
        kind: "deliverable",
        lane: lane.id,
      });
    });
  } else if (deliverables.type === "individual") {
    Object.entries(deliverables.deliverables || {}).forEach(([discipline, data]) => {
      if (data.type === "deliverable" && data.name) {
        const lane = SWIM_LANES.find((l) => l.name === discipline) || SWIM_LANES[0];
        createNote({
          x: deliverableX,
          y: deliverableYForLane(lane.id),
          text: data.name,
          durationWeeks: 0,
          kind: "deliverable",
          lane: lane.id,
        });
      }
    });
  }
}

function addNewNote(laneId = SWIM_LANES[0].id, kind = "task") {
  const targetLaneId = laneId || defaultAddLaneId();
  const lTop = laneTopY(targetLaneId);
  const laneHeight = laneBodyHeightPx(targetLaneId);
  const visibleCenterX = boardViewport.scrollLeft + boardViewport.clientWidth * 0.5;
  const defaultX = kind === "prerequisite"
    ? Math.max(0, stageStartX() - 250)
    : visibleCenterX - 110;
  createNote({
    x: defaultX,
    y: lTop + laneHeight / 2 - 94 * noteScale(),
    text: "",
    kind,
    lane: targetLaneId,
  });
  closeAddNoteMenu();
  closePrerequisiteMenu();
  setStatus(
    kind === "prerequisite"
      ? `${getLane(targetLaneId).name} prerequisite created. Complete it before stage start.`
      : `${getLane(targetLaneId).name} note created. Drag it anywhere on the board.`,
  );
}

document.addEventListener("pointermove", (event) => {
  if (state.selectedForLink) {
    const boardRect = board.getBoundingClientRect();
    state.linkPreviewCursor = {
      x: clamp(event.clientX - boardRect.left, 0, board.clientWidth),
      y: clamp(event.clientY - boardRect.top, 0, board.clientHeight),
    };

    if (!dragState) {
      renderLinks();
    }
  }

  if (!dragState) {
    return;
  }

  const note = state.notes.get(dragState.id);
  if (!note) {
    dragState = null;
    return;
  }

  const { width, height } = boardSize();
  let x = event.clientX - dragState.boardLeft - dragState.dx;
  const y = event.clientY - dragState.boardTop - dragState.dy;

  const currentDurationPx = weeksToPixels(noteDurationWeeks(note));
  const rawStart = x;
  const bounds = stageStartBounds(note.id, currentDurationPx);
  const clampedStart = snapStartToMondayWithinBounds(rawStart, bounds.minStart, bounds.maxStart);
  x = clampedStart;

  note.x = clamp(x, 0, Math.max(0, width - note.width));
  const noteLaneId = note.lane || SWIM_LANES[0].id;
  const lTop = laneTopY(noteLaneId);
  const laneHeight = laneBodyHeightPx(noteLaneId);
  note.y = clamp(y, lTop, Math.max(lTop, lTop + laneHeight - note.height));

  syncStartLinkedNotes(note.id, noteStartX(note));
  enforceAllFinishStartLinks();
  renderLinks();
});

document.addEventListener("pointerup", () => {
  if (dragState) {
    saveState();
  }
  dragState = null;
});

if (addNoteBtn && addNoteMenu) {
  addNoteBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (addNoteMenu.hidden) {
      openAddNoteMenu();
    } else {
      closeAddNoteMenu();
    }
  });

  addNoteMenu.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
}

if (settingsBtn && settingsMenu) {
  settingsBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (settingsMenu.hidden) {
      openSettingsMenu();
    } else {
      closeSettingsMenu();
    }
  });

  settingsMenu.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
}

if (suggestionModal) {
  suggestionModal.addEventListener("pointerdown", (event) => {
    if (event.target === suggestionModal) {
      closeSuggestionModal();
    }
  });
}

suggestionModalCloseBtn?.addEventListener("click", closeSuggestionModal);
suggestionCancelBtn?.addEventListener("click", closeSuggestionModal);

if (suggestionForm) {
  suggestionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const sourceNoteId = pendingSuggestionSourceNoteId;
    const laneId = suggestionDisciplineSelect?.value;
    const taskText = String(suggestionTaskInput?.value || "").trim();
    const memo = String(suggestionMemoInput?.value || "").trim();

    if (!sourceNoteId || !laneId || !taskText) {
      setStatus("Complete the suggestion form before submitting.");
      return;
    }

    createSuggestedNoteFromRequest(sourceNoteId, laneId, taskText, memo);
  });
}

if (memoModal) {
  memoModal.addEventListener("pointerdown", (event) => {
    if (event.target === memoModal) {
      closeMemoModal();
    }
  });
}

memoModalBody?.addEventListener("click", (event) => {
  const rescindBtn = event.target.closest(".board-feedback-rescind-btn");
  if (!rescindBtn) {
    return;
  }

  const noteId = rescindBtn.getAttribute("data-note-id");
  const feedbackId = rescindBtn.getAttribute("data-feedback-id");
  if (!noteId || !feedbackId) {
    return;
  }

  rescindDeclinedRequest(noteId, feedbackId);
});

memoModalCloseBtn?.addEventListener("click", closeMemoModal);
memoModalDismissBtn?.addEventListener("click", closeMemoModal);

if (declineModal) {
  declineModal.addEventListener("pointerdown", (event) => {
    if (event.target === declineModal) {
      closeDeclineModal();
    }
  });
}

declineModalCloseBtn?.addEventListener("click", closeDeclineModal);
declineCancelBtn?.addEventListener("click", closeDeclineModal);

if (declineForm) {
  declineForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const noteId = pendingDeclineNoteId;
    const memo = String(declineReasonInput?.value || "").trim();
    if (!noteId || !memo) {
      setStatus("Provide an explanation before declining this suggestion.");
      return;
    }
    declineSuggestedNote(noteId, memo);
  });
}

if (prerequisiteBtn && prerequisiteMenu) {
  prerequisiteBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (prerequisiteMenu.hidden) {
      openPrerequisiteMenu();
    } else {
      closePrerequisiteMenu();
    }
  });

  prerequisiteMenu.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
}

clearLinksBtn.addEventListener("click", () => {
  const confirmed = window.confirm("This will clear all predecessor links. Are you should you want to continue?");
  if (!confirmed) {
    return;
  }

  state.links = [];
  if (state.selectedForLink) {
    const selected = state.notes.get(state.selectedForLink)?.el;
    selected?.classList.remove("link-source");
    state.selectedForLink = null;
    state.linkPreviewCursor = null;
  }
  renderLinks();
  saveState();
  closeSettingsMenu();
  setStatus("All relationships removed.");
});

if (projectAdminPageBtn) {
  projectAdminPageBtn.addEventListener("click", () => {
    closeSettingsMenu();
    window.location.href = "project-admin-workspace.html";
  });
}

saveBtn.addEventListener("click", () => {
  saveState();
});

if (homeBtn) {
  homeBtn.addEventListener("click", () => {
    window.location.href = window.TSAuth.routeForRole(authSession.role);
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    window.TSAuth.logout();
    window.location.href = "login.html";
  });
}

if (scheduleToggleBtn && schedulePanel) {
  scheduleToggleBtn.addEventListener("click", () => {
    const nextHidden = !schedulePanel.hidden;
    schedulePanel.hidden = nextHidden;
    scheduleToggleBtn.setAttribute("aria-expanded", String(!nextHidden));
    scheduleToggleBtn.textContent = nextHidden ? "Show Takt Schedule" : "Hide Takt Schedule";
  });
}

if (projectNameEl) {
  projectNameEl.addEventListener("blur", () => {
    setProjectName(projectNameEl.textContent);
    saveState();
  });

  projectNameEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      projectNameEl.blur();
    }
  });
}

board.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".link-reverse-btn, .link-delete-btn, .link-ss-btn")) {
    return;
  }

  if (!event.target.closest(".add-note-wrap")) {
    closeSettingsMenu();
    closeAddNoteMenu();
    closePrerequisiteMenu();
  }

  if (!event.target.closest(".note") && state.selectedForLink) {
    const selected = state.notes.get(state.selectedForLink)?.el;
    selected?.classList.remove("link-source");
    state.selectedForLink = null;
    state.linkPreviewCursor = null;
    renderLinks();
  }

  if (!event.target.closest(".note")) {
    setSelectedNote(null);
  }
});

if (snapToWeekInput) {
  snapToWeekInput.addEventListener("change", () => {
    state.snapToWeek = !!snapToWeekInput.checked;
    const noteStartTimestamps = snapshotNoteStartTimestamps();
    refreshLayout({ noteStartTimestamps });
    saveViewState();
    setStatus(state.snapToWeek ? "Snapping enabled." : "Snapping disabled.");
  });
}

if (collapseAllLanesInput) {
  collapseAllLanesInput.addEventListener("change", () => {
    setAllLanesCollapsed(!!collapseAllLanesInput.checked);
  });
}

if (showCriticalPathInput) {
  showCriticalPathInput.addEventListener("change", () => {
    state.showCriticalPath = !!showCriticalPathInput.checked;
    updateCriticalPathView();
    refreshLayout();
    saveViewState();
    setStatus(state.showCriticalPath ? "Critical path mode enabled." : "Critical path mode disabled.");
  });
}

if (hideNeutralLinksInput) {
  hideNeutralLinksInput.addEventListener("change", () => {
    state.hideNeutralLinks = !!hideNeutralLinksInput.checked;
    applyNeutralLinkStyles();
    renderLinks();
    saveViewState();
    setStatus(state.hideNeutralLinks ? "Grey links hidden." : "Grey links shown.");
  });
}

zoomXInput.addEventListener("input", () => {
  const zoomPercent = Number(zoomXInput.value);
  applyHorizontalZoom(zoomPercent / 100);
  setStatus(`Horizontal zoom: ${Math.round(state.zoomX * 100)}%`);
});

zoomYInput.addEventListener("input", () => {
  const zoomPercent = Number(zoomYInput.value);
  applyVerticalZoom(zoomPercent / 100);
  setStatus(`Vertical zoom: ${Math.round(state.zoomY * 100)}%`);
});

if (neutralLinkWidthInput) {
  neutralLinkWidthInput.addEventListener("input", () => {
    state.neutralLinkScale = clamp(Number(neutralLinkWidthInput.value) / 100, 0.2, 1);
    applyNeutralLinkStyles();
    renderLinks();
    saveViewState();
    setStatus(`Grey line thickness: ${Math.round(state.neutralLinkScale * 100)}%`);
  });
}

if (noteScaleInput) {
  noteScaleInput.addEventListener("input", () => {
    state.noteScale = clamp(Number(noteScaleInput.value) / 100, 0.5, 2);
    updateZoomBadges();
    refreshLayout();
    saveViewState();
    setStatus(`Note scale: ${Math.round(state.noteScale * 100)}%`);
  });
}

boardViewport.addEventListener(
  "wheel",
  (event) => {
    if (!event.shiftKey) {
      return;
    }
    event.preventDefault();
    const zoomStep = event.deltaY < 0 ? 1.1 : 0.9;
    applyHorizontalZoom(state.zoomX * zoomStep, { anchorClientX: event.clientX });
    setStatus(`Horizontal zoom: ${Math.round(state.zoomX * 100)}%`);
  },
  { passive: false },
);

window.addEventListener("resize", () => {
  const noteStartTimestamps = snapshotNoteStartTimestamps();
  updateBoardWidth();
  refreshLayout({ noteStartTimestamps });
});

async function initializeBoard() {
  if (window.TSData?.initialize) {
    await window.TSData.initialize();
  }

  await configureSwimLanesFromProject();
  populateAddNoteMenu();
  populatePrerequisiteMenu();
  applyRoleUi();

  const savedState = await loadState();
  if (savedState) {
    applyLoadedState(savedState, loadViewState());
    setStatus("Board loaded from save.");
    return;
  }

  state.finishDateMs = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  updateProjectSettingDisplays();
  zoomXInput.value = "100";
  zoomYInput.value = "100";
  if (noteScaleInput) {
    noteScaleInput.value = "100";
  }
  updateZoomBadges();
  applyNeutralLinkStyles();
  syncCollapseAllLanesInput();
  updateBoardWidth();

  createTickMarks();
  setStatus("Ready. Add your first note.");

  const starterLanes = SWIM_LANES.slice(0, 3);
  const firstLane = starterLanes[0] || SWIM_LANES[0];
  const secondLane = starterLanes[1] || firstLane;
  const thirdLane = starterLanes[2] || secondLane;

  createNote({ x: 120, y: laneTopY(firstLane.id) + 36, text: "Kickoff", durationWeeks: 2, lane: firstLane.id });
  createNote({ x: 390, y: laneTopY(secondLane.id) + 36, text: "Design review", durationWeeks: 4, lane: secondLane.id });
  createNote({ x: 700, y: laneTopY(thirdLane.id) + 36, text: "Release", durationWeeks: 3, lane: thirdLane.id });
  setSelectedNote([...state.notes.keys()][0]);
  state.links.push(
    { id: uid("link"), a: [...state.notes.keys()][0], b: [...state.notes.keys()][1], type: "FS" },
    { id: uid("link"), a: [...state.notes.keys()][1], b: [...state.notes.keys()][2], type: "FS" },
  );
  renderLinks();
  saveState();
}

initializeBoard();
