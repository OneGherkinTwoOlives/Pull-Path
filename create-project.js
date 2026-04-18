const PROJECTS_KEY = "ts-projects";
const CREATE_PROJECT_VERSION = "20260405";
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const authSession = window.TSAuth.requireAuth(["super-admin", "project-admin"]);
if (!authSession) {
  throw new Error("Unauthorized");
}
const isSuperAdmin = authSession.role === "super-admin";
const isProjectAdmin = authSession.role === "project-admin";
const DISCIPLINES = [
  "Architect",
  "Landscape",
  "Mechanical",
  "Electrical",
  "Structural",
  "Owner/Developer",
  "Interior Design",
  "Civil",
  "Envelope",
  "Energy",
  "Geotechnical",
  "Code",
  "Acoustic",
  "Commissioning",
  "Elevator",
  "Environmental",
  "Rendering",
  "Survey",
  "Sustainability",
  "Traffic",
  "Waste",
  "Wind",
];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function uid() {
  return `project-${Math.random().toString(36).slice(2, 10)}`;
}

function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveProjects(projects) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

function getProjectIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("projectId");
}

const EDIT_PROJECT_ID = getProjectIdFromUrl();
let importedTasks = [];
let importedCsvFileName = "";

function normalizeStoredProjectAdmins(project) {
  const admins = Array.isArray(project?.projectAdmins) ? project.projectAdmins.filter(Boolean) : [];
  if (admins.length > 0) {
    return admins;
  }
  if (project?.createdByEmail) {
    return [project.createdByEmail];
  }
  return [];
}

function defaultWorkspaceRoute() {
  return window.TSAuth.routeForRole(authSession.role);
}

function userCanManageProject(project) {
  if (isSuperAdmin) {
    return true;
  }

  if (!project) {
    return false;
  }

  const admins = normalizeStoredProjectAdmins(project);
  return admins.some((email) => window.TSAuth.normalizeEmail(email) === authSession.email);
}

function applyRoleUi() {
  const backLink = document.getElementById("create-project-back-link");
  if (backLink) {
    backLink.href = defaultWorkspaceRoute();
  }

  if (isProjectAdmin && !EDIT_PROJECT_ID) {
    alert("Project administrators can only manage projects already assigned to them.");
    window.location.href = defaultWorkspaceRoute();
  }
}

function ensureLatestCreateProjectPage() {
  const url = new URL(window.location.href);
  const currentVersion = url.searchParams.get("v");
  if (currentVersion === CREATE_PROJECT_VERSION) {
    return;
  }

  url.searchParams.set("v", CREATE_PROJECT_VERSION);
  window.location.replace(url.toString());
}

ensureLatestCreateProjectPage();

function selectedDisciplines() {
  return [...document.querySelectorAll(".discipline-checkbox:checked")].map((el) => el.value);
}

function disciplineOptionsHtml(selectedValue = "") {
  const disciplineNames = [...selectedDisciplines()];
  if (selectedValue && !disciplineNames.includes(selectedValue)) {
    disciplineNames.push(selectedValue);
  }

  return disciplineNames
    .map((name) => `<option value="${name}" ${name === selectedValue ? "selected" : ""}>${name}</option>`)
    .join("");
}

function refreshTeamDisciplineOptions() {
  document.querySelectorAll(".team-discipline").forEach((select) => {
    const current = select.value;
    select.innerHTML = disciplineOptionsHtml(current);
  });
}

function parseAndRenderTeamEmails(presetTeam = null) {
  const raw = document.getElementById("team-email-input").value;
  const emails = raw
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

  const container = document.getElementById("team-rows");

  // Preserve discipline selections already made
  const saved = Object.fromEntries(
    (Array.isArray(presetTeam) ? presetTeam : [])
      .filter((member) => member?.email)
      .map((member) => [member.email, member.discipline || ""]),
  );
  container.querySelectorAll(".email-row").forEach((row) => {
    saved[row.dataset.email] = row.querySelector(".team-discipline").value;
  });

  container.innerHTML = "";
  emails.forEach((email) => {
    const disc = saved[email] || "";
    const row = document.createElement("div");
    row.className = "email-row";
    row.dataset.email = email;
    row.innerHTML = `
      <span class="email-label">${email}</span>
      <select class="team-discipline">${disciplineOptionsHtml(disc)}</select>
    `;
    container.appendChild(row);
  });
}

function renderDisciplines() {
  const container = document.getElementById("discipline-list");
  DISCIPLINES.forEach((name, index) => {
    const id = `disc-${index}`;
    const label = document.createElement("label");
    label.className = "discipline-option";
    label.innerHTML = `<input id="${id}" class="discipline-checkbox" type="checkbox" value="${name}" /> <span>${name}</span>`;
    container.appendChild(label);
  });

  container.addEventListener("change", () => {
    refreshTeamDisciplineOptions();
  });
}

function buildTeam() {
  return [...document.querySelectorAll("#team-rows .email-row")]
    .map((row) => ({
      email: row.dataset.email,
      discipline: row.querySelector(".team-discipline").value,
    }))
    .filter((m) => m.email && m.discipline);
}

function normalizeHeader(value) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function parseCsvRows(csvText) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") {
        i += 1;
      }
      row.push(cell.trim());
      cell = "";
      if (row.some((part) => part !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    cell += ch;
  }

  row.push(cell.trim());
  if (row.some((part) => part !== "")) {
    rows.push(row);
  }

  return rows;
}

function findColumnIndex(headers, aliases) {
  const normalized = headers.map((h) => normalizeHeader(h));
  return normalized.findIndex((h) => aliases.includes(h));
}

function normalizeDiscipline(input) {
  const raw = (input || "").trim();
  if (!raw) {
    return "";
  }

  const aliasMap = {
    mecahnical: "mechanical",
    mech: "mechanical",
    elec: "electrical",
    arch: "architect",
  };

  const rawSlug = slugify(raw);
  const canonicalSlug = aliasMap[rawSlug] || rawSlug;
  const match = DISCIPLINES.find((name) => slugify(name) === canonicalSlug);
  return match || "";
}

function parseWeekDuration(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number.parseFloat(String(value).replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.max(1, Math.round(parsed));
}

function parseDateToUtcMs(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Date.parse(`${trimmed}T00:00:00Z`);
  return Number.isNaN(parsed) ? null : parsed;
}

function parsePredecessors(value) {
  if (!value) {
    return [];
  }
  return String(value)
    .split(/[^0-9]+/)
    .map((n) => Number.parseInt(n, 10))
    .filter((n) => Number.isInteger(n) && n > 0);
}

function parseTaskCsv(csvText) {
  const rows = parseCsvRows(csvText);
  if (!rows.length) {
    throw new Error("CSV is empty.");
  }

  const headers = rows[0];
  const taskIdx = findColumnIndex(headers, ["task", "taskname", "name"]);
  const disciplineIdx = findColumnIndex(headers, ["discipline", "disciplines", "trade"]);
  const startIdx = findColumnIndex(headers, ["start", "startdate"]);
  const finishIdx = findColumnIndex(headers, ["finish", "end", "enddate", "finishdate"]);
  const durationIdx = findColumnIndex(headers, ["durationweeks", "durationweek", "duration"]);
  const predecessorIdx = findColumnIndex(headers, ["predecessors", "predecessor", "pred", "preds"]);

  if (taskIdx === -1 || disciplineIdx === -1) {
    throw new Error("CSV must include Task and Discipline columns.");
  }

  const tasks = [];
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const taskName = (row[taskIdx] || "").trim();
    const discipline = normalizeDiscipline(row[disciplineIdx]);
    if (!taskName || !discipline) {
      continue;
    }

    const startMs = startIdx !== -1 ? parseDateToUtcMs(row[startIdx]) : null;
    const finishMs = finishIdx !== -1 ? parseDateToUtcMs(row[finishIdx]) : null;
    let durationWeeks = durationIdx !== -1 ? parseWeekDuration(row[durationIdx]) : null;

    if (!durationWeeks && startMs !== null && finishMs !== null && finishMs >= startMs) {
      durationWeeks = Math.max(1, Math.ceil((finishMs - startMs) / WEEK_MS));
    }

    tasks.push({
      rowNumber: i,
      name: taskName,
      discipline,
      startMs,
      finishMs,
      durationWeeks: durationWeeks || 1,
      predecessorNumbers: predecessorIdx !== -1 ? parsePredecessors(row[predecessorIdx]) : [],
    });
  }

  if (!tasks.length) {
    throw new Error("No valid tasks found. Each task needs Task and Discipline values.");
  }

  return tasks;
}

function buildImportedBoardState(tasks, projectStartMs, finishDateMs, stageDurationWeeks) {
  const paddingWeeks = 2;
  const visibleStartMs = projectStartMs - paddingWeeks * WEEK_MS;
  const visibleEndMs = finishDateMs + paddingWeeks * WEEK_MS;
  const rangeMs = Math.max(WEEK_MS, visibleEndMs - visibleStartMs);
  const virtualBoardWidth = 1800;
  const laneIndexBySlug = new Map(selectedDisciplines().map((d, i) => [slugify(d), i]));
  const laneBaseTop = (laneIdx) => 120 + laneIdx * 260;
  const notes = [];
  const links = [];
  const noteIdByTaskNumber = new Map();

  tasks.forEach((task, index) => {
    const laneSlug = slugify(task.discipline);
    const laneIdx = laneIndexBySlug.get(laneSlug) ?? 0;
    const taskStartMs = task.startMs ?? projectStartMs;
    const progress = Math.max(0, Math.min(1, (taskStartMs - visibleStartMs) / rangeMs));
    const x = Math.round(progress * virtualBoardWidth);
    const noteId = `note-${Math.random().toString(36).slice(2, 10)}`;

    notes.push({
      id: noteId,
      x,
      y: laneBaseTop(laneIdx) + 36 + (index % 3) * 16,
      text: task.name,
      durationWeeks: task.durationWeeks,
      lane: laneSlug,
    });
    noteIdByTaskNumber.set(index + 1, noteId);
  });

  const dedupe = new Set();
  tasks.forEach((task, index) => {
    const toId = noteIdByTaskNumber.get(index + 1);
    if (!toId) {
      return;
    }
    task.predecessorNumbers.forEach((predNum) => {
      const fromId = noteIdByTaskNumber.get(predNum);
      if (!fromId || fromId === toId) {
        return;
      }
      const key = `${fromId}->${toId}`;
      if (dedupe.has(key)) {
        return;
      }
      dedupe.add(key);
      links.push({ id: `link-${Math.random().toString(36).slice(2, 10)}`, a: fromId, b: toId, type: "FS" });
    });
  });

  return {
    stageDurationWeeks,
    finishDateMs,
    zoomX: 1,
    zoomY: 1,
    snapToWeek: true,
    notes: notes.map((note) => ({
      ...note,
      importedFromCsv: true,
      importedFileName: importedCsvFileName || null,
    })),
    links: links.map((link) => ({
      ...link,
      importedFromCsv: true,
      importedFileName: importedCsvFileName || null,
    })),
  };
}

function boardStorageKey(projectId) {
  return `board-state-${projectId}`;
}

function loadBoardState(projectId) {
  try {
    return JSON.parse(localStorage.getItem(boardStorageKey(projectId)) || "null");
  } catch {
    return null;
  }
}

function saveBoardState(projectId, boardState) {
  localStorage.setItem(boardStorageKey(projectId), JSON.stringify(boardState));
}

function updateTaskCsvUi() {
  const fileInput = document.getElementById("task-csv-input");
  const selectBtn = document.getElementById("task-csv-select-btn");
  const removeBtn = document.getElementById("task-csv-remove-btn");
  const fileNameEl = document.getElementById("task-csv-file-name");
  const hasImportedFile = !!importedCsvFileName;

  if (fileInput) {
    fileInput.disabled = hasImportedFile;
    if (!hasImportedFile) {
      fileInput.value = "";
    }
  }
  if (selectBtn) {
    selectBtn.disabled = hasImportedFile;
  }
  if (removeBtn) {
    removeBtn.hidden = !hasImportedFile;
  }
  if (fileNameEl) {
    fileNameEl.textContent = hasImportedFile ? `Current file: ${importedCsvFileName}` : "No task file selected.";
  }
}

function clearImportedTasksFromBoardState(boardState) {
  const importedNoteIds = new Set(
    (Array.isArray(boardState?.notes) ? boardState.notes : [])
      .filter((note) => note.importedFromCsv)
      .map((note) => note.id),
  );

  if (importedNoteIds.size > 0) {
    boardState.notes = (boardState.notes || []).filter((note) => !importedNoteIds.has(note.id));
    boardState.links = (boardState.links || []).filter((link) => !importedNoteIds.has(link.a) && !importedNoteIds.has(link.b));
    return;
  }

  boardState.notes = [];
  boardState.links = [];
}

function removeImportedTaskFile() {
  if (!importedCsvFileName) {
    return;
  }

  const confirmed = window.confirm("are you sure, deleting this will remove all tasks");
  if (!confirmed) {
    return;
  }

  if (EDIT_PROJECT_ID) {
    const projects = loadProjects();
    const idx = projects.findIndex((project) => project.id === EDIT_PROJECT_ID);
    if (idx !== -1) {
      projects[idx].importedTaskCsvName = null;
      saveProjects(projects);
    }

    const boardState = loadBoardState(EDIT_PROJECT_ID) || {};
    clearImportedTasksFromBoardState(boardState);
    saveBoardState(EDIT_PROJECT_ID, boardState);
  }

  importedTasks = [];
  importedCsvFileName = "";
  const statusEl = document.getElementById("task-csv-status");
  statusEl.className = "csv-status";
  statusEl.textContent = "Task file removed. Imported tasks will be deleted.";
  updateTaskCsvUi();
}

async function handleTaskCsvChange() {
  const fileInput = document.getElementById("task-csv-input");
  const statusEl = document.getElementById("task-csv-status");
  statusEl.className = "csv-status";
  statusEl.textContent = "";

  if (importedCsvFileName) {
    updateTaskCsvUi();
    return;
  }

  const file = fileInput.files?.[0];
  if (!file) {
    return;
  }

  importedTasks = [];
  importedCsvFileName = "";

  try {
    const text = await file.text();
    const tasks = parseTaskCsv(text);
    importedTasks = tasks;
    importedCsvFileName = file.name;

    // Auto-check disciplines found in CSV so lane mapping works by default.
    const csvDisciplines = new Set(tasks.map((t) => t.discipline));
    document.querySelectorAll(".discipline-checkbox").forEach((checkbox) => {
      if (csvDisciplines.has(checkbox.value)) {
        checkbox.checked = true;
      }
    });
    refreshTeamDisciplineOptions();

    statusEl.className = "csv-status success";
    statusEl.textContent = `Imported ${tasks.length} tasks from ${file.name}`;
    updateTaskCsvUi();
  } catch (err) {
    statusEl.className = "csv-status error";
    statusEl.textContent = err instanceof Error ? err.message : "Unable to parse CSV.";
    updateTaskCsvUi();
  }
}

// Wizard page navigation
let currentPage = 1;

function goToPage(pageNum) {
  const validPages = [1, 2];
  if (!validPages.includes(pageNum)) return;

  currentPage = pageNum;

  // Hide all pages
  document.querySelectorAll(".wizard-page").forEach((p) => {
    p.classList.remove("active");
  });

  // Show current page
  const currentPageEl = document.querySelector(`.wizard-page[data-page="${pageNum}"]`);
  if (currentPageEl) {
    currentPageEl.classList.add("active");
  }

  // Update progress indicators
  document.querySelectorAll(".progress-step").forEach((step) => {
    const stepPage = Number(step.dataset.page);
    if (stepPage <= pageNum) {
      step.classList.add("active");
    } else {
      step.classList.remove("active");
    }
  });

  // Scroll to top
  window.scrollTo(0, 0);
}

function validatePage1() {
  const name = document.getElementById("project-name-input").value.trim();
  const disciplines = selectedDisciplines();
  const team = buildTeam();

  if (!name) {
    alert("Project name is required.");
    return false;
  }

  if (!disciplines.length) {
    alert("Select at least one discipline.");
    return false;
  }

  if (!team.length) {
    alert("Add at least one team member with assigned discipline.");
    return false;
  }

  return true;
}

function validatePage2() {
  const startDate = document.getElementById("project-start-date").value;
  const durationWeeks = Number(document.getElementById("project-duration").value);

  if (!startDate) {
    alert("Start date is required.");
    return false;
  }

  if (!durationWeeks || durationWeeks < 1) {
    alert("Duration must be at least 1 week.");
    return false;
  }

  if (importedTasks.length) {
    const disciplines = selectedDisciplines();
    const selected = new Set(disciplines.map((d) => d));
    const missing = [...new Set(importedTasks.map((t) => t.discipline))].filter((d) => !selected.has(d));
    if (missing.length) {
      alert(`Imported CSV disciplines must be selected in project disciplines: ${missing.join(", ")}`);
      return false;
    }
  }

  return true;
}

function currentIndividualDeliverableValues() {
  const values = {};
  selectedDisciplines().forEach((discipline) => {
    const slugId = slugify(discipline);
    const typeSelect = document.getElementById(`deliverable-type-${slugId}`);
    const nameInput = document.getElementById(`deliverable-${slugId}`);
    if (!typeSelect && !nameInput) {
      return;
    }
    values[discipline] = {
      type: typeSelect ? typeSelect.value : "deliverable",
      name: nameInput ? nameInput.value : "",
    };
  });
  return values;
}

function renderIndividualDeliverablesSection(existingValues = null) {
  const disciplines = selectedDisciplines();
  const container = document.getElementById("individual-deliverables-list");
  const valuesByDiscipline = existingValues || currentIndividualDeliverableValues();
  
  container.innerHTML = "";
  disciplines.forEach((discipline) => {
    const slugId = slugify(discipline);
    const fieldId = `deliverable-${slugId}`;
    const typeSelectId = `deliverable-type-${slugId}`;
    const savedValue = valuesByDiscipline[discipline] || null;
    const deliverableType = savedValue?.type || "deliverable";
    const deliverableName = savedValue?.name || "";
    
    const div = document.createElement("div");
    div.className = "deliverable-item";
    div.innerHTML = `
      <label class="field">
        <span>${discipline}</span>
        <div class="deliverable-input-group">
          <select id="${typeSelectId}" class="deliverable-type-select">
            <option value="deliverable" ${deliverableType === "deliverable" ? "selected" : ""}>Has Deliverable</option>
            <option value="none" ${deliverableType === "none" ? "selected" : ""}>No Deliverable (Supporting)</option>
          </select>
          <input id="${fieldId}" type="text" placeholder="e.g., Structural Drawings" class="deliverable-name-input" value="${deliverableName.replace(/"/g, "&quot;")}" ${deliverableType === "none" ? "disabled" : ""} />
        </div>
      </label>
    `;
    container.appendChild(div);

    const typeSelect = div.querySelector(`#${typeSelectId}`);
    const nameInput = div.querySelector(`#${fieldId}`);
    typeSelect?.addEventListener("change", () => {
      if (!nameInput) {
        return;
      }
      const isNone = typeSelect.value === "none";
      nameInput.disabled = isNone;
      if (isNone) {
        nameInput.value = "";
      }
    });
  });
}

function updateDeliverableSection(existingValues = null) {
  const type = document.querySelector('input[name="deliverable-type"]:checked').value;
  const commonSection = document.getElementById("common-deliverable-section");
  const individualSection = document.getElementById("individual-deliverable-section");
  
  if (type === "common") {
    commonSection.style.display = "block";
    individualSection.style.display = "none";
  } else {
    commonSection.style.display = "none";
    individualSection.style.display = "block";
    renderIndividualDeliverablesSection(existingValues);
  }
}

function getDeliverablesData() {
  const type = document.querySelector('input[name="deliverable-type"]:checked').value;
  
  if (type === "common") {
    const name = document.getElementById("common-deliverable-name").value.trim();
    return {
      type: "common",
      name: name || "Final Deliverable",
    };
  } else {
    const deliverables = {};
    selectedDisciplines().forEach((discipline) => {
      const slugId = slugify(discipline);
      const typeSelect = document.getElementById(`deliverable-type-${slugId}`);
      const nameInput = document.getElementById(`deliverable-${slugId}`);
      
      const typeValue = typeSelect ? typeSelect.value : "deliverable";
      const name = nameInput ? nameInput.value.trim() : "";
      
      deliverables[discipline] = {
        type: typeValue,
        name: typeValue === "deliverable" ? (name || `${discipline} Deliverable`) : null,
      };
    });
    
    return {
      type: "individual",
      deliverables,
    };
  }
}

function submitForm(event) {
  event.preventDefault();

  if (!validatePage2()) {
    return;
  }

  const name = document.getElementById("project-name-input").value.trim();
  const startDate = document.getElementById("project-start-date").value;
  const durationWeeks = Number(document.getElementById("project-duration").value);
  const disciplines = selectedDisciplines();
  const deliverables = getDeliverablesData();

  const startMs = Date.parse(`${startDate}T00:00:00Z`);
  const finishDateMs = startMs + durationWeeks * 7 * 24 * 60 * 60 * 1000;

  if (EDIT_PROJECT_ID) {
    // Edit mode — update the existing project record
    const projects = loadProjects();
    const idx = projects.findIndex((p) => p.id === EDIT_PROJECT_ID);
    if (idx === -1) {
      alert("Project not found.");
      return;
    }
    const existing = projects[idx];
    if (!userCanManageProject(existing)) {
      alert("You are not allowed to manage this project.");
      window.location.href = defaultWorkspaceRoute();
      return;
    }
    existing.name = name;
    existing.startDate = startDate;
    existing.durationWeeks = durationWeeks;
    existing.disciplines = disciplines;
    existing.team = buildTeam();
    existing.deliverables = deliverables;
    existing.projectAdmins = normalizeStoredProjectAdmins(existing);
    existing.importedTaskCsvName = importedCsvFileName || null;
    projects[idx] = existing;
    saveProjects(projects);

    // Update board state without wiping existing notes / links
    const boardKey = `board-state-${EDIT_PROJECT_ID}`;
    let boardState = {};
    try { boardState = JSON.parse(localStorage.getItem(boardKey) || "{}"); } catch {}
    boardState.projectName = name;
    boardState.stageDurationWeeks = durationWeeks;
    boardState.finishDateMs = finishDateMs;
    boardState.deliverables = deliverables;
    if (importedTasks.length) {
      const imported = buildImportedBoardState(importedTasks, startMs, finishDateMs, durationWeeks);
      boardState.notes = imported.notes;
      boardState.links = imported.links;
      boardState.zoomX = imported.zoomX;
      boardState.zoomY = imported.zoomY;
      boardState.snapToWeek = imported.snapToWeek;
    }
    boardState.importedTaskCsvName = importedCsvFileName || null;
    localStorage.setItem(boardKey, JSON.stringify(boardState));

    localStorage.setItem("ts-active-project-id", EDIT_PROJECT_ID);
    window.location.href = `board.html?projectId=${encodeURIComponent(EDIT_PROJECT_ID)}`;
  } else {
    // Create mode — build a brand-new project
    const project = {
      id: uid(),
      name,
      startDate,
      durationWeeks,
      disciplines,
      team: buildTeam(),
      projectAdmins: [authSession.email],
      deliverables,
      createdByEmail: authSession.email,
      importedTaskCsvName: importedCsvFileName || null,
      createdAt: new Date().toISOString(),
    };

    const projects = loadProjects();
    projects.push(project);
    saveProjects(projects);

    const imported = importedTasks.length
      ? buildImportedBoardState(importedTasks, startMs, finishDateMs, durationWeeks)
      : {
          stageDurationWeeks: durationWeeks,
          finishDateMs,
          zoomX: 1,
          zoomY: 1,
          snapToWeek: true,
          notes: [],
          links: [],
        };

    localStorage.setItem(`board-state-${project.id}`, JSON.stringify({
      projectName: project.name,
      stageDurationWeeks: imported.stageDurationWeeks,
      finishDateMs: imported.finishDateMs,
      zoomX: imported.zoomX,
      zoomY: imported.zoomY,
      snapToWeek: imported.snapToWeek,
      notes: imported.notes,
      links: imported.links,
      deliverables,
      importedTaskCsvName: importedCsvFileName || null,
    }));

    localStorage.setItem("ts-active-project-id", project.id);
    window.location.href = `board.html?projectId=${encodeURIComponent(project.id)}`;
  }
}

function loadProjectForEdit(projectId) {
  const projects = loadProjects();
  const project = projects.find((p) => p.id === projectId);
  if (!project) return;

  if (!userCanManageProject(project)) {
    alert("You are not allowed to manage this project.");
    window.location.href = defaultWorkspaceRoute();
    return;
  }

  document.querySelector("h1").textContent = "Edit Project";
  document.querySelectorAll(".wizard-page h1")[0].textContent = "Edit Project - Step 1: Project Team";
  document.querySelectorAll(".wizard-page h1")[1].textContent = "Edit Project - Step 2: Project Details";
  document.querySelector(".primary-btn[type=submit]").textContent = "Save Changes";

  document.getElementById("project-name-input").value = project.name;
  document.getElementById("project-start-date").value = project.startDate;
  document.getElementById("project-duration").value = project.durationWeeks;

  document.querySelectorAll(".discipline-checkbox").forEach((checkbox) => {
    checkbox.checked = project.disciplines.includes(checkbox.value);
  });
  refreshTeamDisciplineOptions();
  // Populate textarea and render rows with saved discipline selections
  const textarea = document.getElementById("team-email-input");
  textarea.value = project.team && project.team.length
    ? project.team.map((m) => m.email).join(", ")
    : "";
  parseAndRenderTeamEmails(project.team || []);

  importedCsvFileName = project.importedTaskCsvName || "";
  importedTasks = [];
  const statusEl = document.getElementById("task-csv-status");
  statusEl.className = importedCsvFileName ? "csv-status success" : "csv-status";
  statusEl.textContent = importedCsvFileName ? `Using existing task file: ${importedCsvFileName}` : "";
  updateTaskCsvUi();

  // Restore deliverables
  if (project.deliverables) {
    const deliv = project.deliverables;
    if (deliv.type === "common") {
      document.querySelector('input[name="deliverable-type"][value="common"]').checked = true;
      document.getElementById("common-deliverable-name").value = deliv.name || "";
      updateDeliverableSection();
    } else if (deliv.type === "individual") {
      document.querySelector('input[name="deliverable-type"][value="individual"]').checked = true;
      updateDeliverableSection(deliv.deliverables || {});
    } else {
      updateDeliverableSection();
    }
  } else {
    updateDeliverableSection();
  }
}

// Setup event listeners
applyRoleUi();
renderDisciplines();
document.getElementById("team-email-input").addEventListener("input", parseAndRenderTeamEmails);
document.getElementById("create-project-form").addEventListener("submit", submitForm);
document.getElementById("task-csv-input").addEventListener("change", handleTaskCsvChange);
document.getElementById("task-csv-select-btn").addEventListener("click", () => {
  if (!importedCsvFileName) {
    document.getElementById("task-csv-input").click();
  }
});
document.getElementById("task-csv-remove-btn").addEventListener("click", removeImportedTaskFile);
updateTaskCsvUi();

// Wizard navigation
document.querySelectorAll('button[data-action="next-page"]').forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    if (validatePage1()) {
      goToPage(2);
    }
  });
});

document.querySelectorAll('button[data-action="prev-page"]').forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    goToPage(1);
  });
});

// Deliverable type selection
document.querySelectorAll('input[name="deliverable-type"]').forEach((radio) => {
  radio.addEventListener("change", updateDeliverableSection);
});

if (EDIT_PROJECT_ID) {
  loadProjectForEdit(EDIT_PROJECT_ID);
} else {
  // Initialize deliverables section for new projects
  updateDeliverableSection();
}
