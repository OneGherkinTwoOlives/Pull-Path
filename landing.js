const PROJECTS_KEY = "ts-projects";
const CREATE_PROJECT_VERSION = "20260405";
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MIN_TIMELINE_PADDING_WEEKS = 2;

const session = window.TSAuth.requireAuth(["super-admin"]);
if (!session) {
  throw new Error("Unauthorized");
}

function loadProjects() {
  return window.TSData?.getProjectsSync ? window.TSData.getProjectsSync() : [];
}

function slugify(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function loadBoardState(projectId) {
  return window.TSData?.getBoardStateSync ? window.TSData.getBoardStateSync(projectId) : null;
}

function formatUtcDate(ms) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function csvEscape(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes("\n") || str.includes("\"")) {
    return `"${str.replace(/\"/g, "\"\"")}"`;
  }
  return str;
}

function visiblePaddingWeeks(state) {
  const stageDurationWeeks = Number(state?.stageDurationWeeks) || 26;
  const zoomX = Number(state?.zoomX) || 1;
  const baseRangeWeeks = stageDurationWeeks + MIN_TIMELINE_PADDING_WEEKS * 2;
  if (zoomX >= 1) {
    return MIN_TIMELINE_PADDING_WEEKS;
  }
  const zoomedOutRangeWeeks = baseRangeWeeks / zoomX;
  const expandedPadding = (zoomedOutRangeWeeks - stageDurationWeeks) / 2;
  return Math.max(MIN_TIMELINE_PADDING_WEEKS, expandedPadding);
}

function disciplineNameForLane(project, laneId) {
  const disciplines = Array.isArray(project?.disciplines) ? project.disciplines : [];
  return disciplines.find((name) => slugify(name) === laneId) || laneId || "";
}

function buildTaktCsv(project, boardState) {
  const notes = Array.isArray(boardState?.notes) ? boardState.notes : [];
  const links = Array.isArray(boardState?.links) ? boardState.links : [];

  const ordered = [...notes].sort((a, b) => {
    const dx = (a.x || 0) - (b.x || 0);
    if (dx !== 0) return dx;
    return (a.y || 0) - (b.y || 0);
  });

  const orderById = new Map();
  ordered.forEach((note, idx) => {
    orderById.set(note.id, idx + 1);
  });

  const maxX = Math.max(1, ...ordered.map((n) => Number(n.x) || 0));
  const finishDateMs = Number(boardState?.finishDateMs) || Date.now();
  const stageDurationWeeks = Number(boardState?.stageDurationWeeks) || 26;
  const padWeeks = visiblePaddingWeeks(boardState);
  const visibleStartMs = finishDateMs - (stageDurationWeeks + padWeeks) * WEEK_MS;
  const visibleEndMs = finishDateMs + padWeeks * WEEK_MS;
  const rangeMs = Math.max(WEEK_MS, visibleEndMs - visibleStartMs);

  const rows = ordered.map((note) => {
    const startProgress = Math.max(0, Math.min(1, (Number(note.x) || 0) / maxX));
    const startMs = visibleStartMs + startProgress * rangeMs;
    const durationWeeks = Math.max(1, Number(note.durationWeeks) || 1);
    const endMs = startMs + durationWeeks * WEEK_MS;

    const predecessors = links
      .filter((link) => (link.type || "FS") === "FS" && link.b === note.id)
      .map((link) => orderById.get(link.a))
      .filter(Boolean)
      .sort((a, b) => a - b)
      .join(", ");

    return [
      `#${orderById.get(note.id) || "?"} ${(note.text || "Untitled").split(/\r?\n/)[0]}`,
      disciplineNameForLane(project, note.lane),
      formatUtcDate(startMs),
      formatUtcDate(endMs),
      durationWeeks,
      predecessors,
    ];
  });

  const header = ["Task Name", "Discipline", "Start Date", "End Date", "Duration (weeks)", "Predecessors"];
  const lines = [header, ...rows].map((row) => row.map(csvEscape).join(","));
  return lines.join("\n");
}

async function exportProjectSchedule(project) {
  const boardState = window.TSData?.fetchBoardState
    ? await window.TSData.fetchBoardState(project.id)
    : loadBoardState(project.id);
  if (!boardState || !Array.isArray(boardState.notes) || boardState.notes.length === 0) {
    alert("No saved takt schedule found for this project.");
    return;
  }

  const csv = buildTaktCsv(project, boardState);
  const fileNameBase = slugify(project.name || "project") || "project";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileNameBase}-takt-schedule.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderProjects() {
  const list = document.getElementById("project-list");
  const empty = document.getElementById("project-empty");
  const projects = loadProjects();

  list.innerHTML = "";
  empty.style.display = projects.length ? "none" : "block";

  projects.forEach((project) => {
    const li = document.createElement("li");

    const row = document.createElement("div");
    row.className = "project-item-row";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "project-item-btn";
    btn.innerHTML = `<strong>${project.name}</strong><br><span class="muted">${project.disciplines.length} disciplines · ${project.durationWeeks} weeks</span>`;
    btn.addEventListener("click", () => {
      localStorage.setItem("ts-active-project-id", project.id);
      window.location.href = `board.html?projectId=${encodeURIComponent(project.id)}`;
    });

    const adminBtn = document.createElement("button");
    adminBtn.type = "button";
    adminBtn.className = "admin-btn";
    adminBtn.textContent = "Admin";
    adminBtn.addEventListener("click", () => {
      window.location.href = `create-project.html?projectId=${encodeURIComponent(project.id)}&v=${CREATE_PROJECT_VERSION}`;
    });

    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.className = "export-btn";
    exportBtn.textContent = "Export";
    exportBtn.addEventListener("click", async () => {
      await exportProjectSchedule(project);
    });

    row.appendChild(btn);
    row.appendChild(adminBtn);
    row.appendChild(exportBtn);
    li.appendChild(row);
    list.appendChild(li);
  });
}

document.getElementById("create-project-btn").addEventListener("click", () => {
  window.location.href = `create-project.html?v=${CREATE_PROJECT_VERSION}`;
});

document.getElementById("logout-btn").addEventListener("click", () => {
  window.TSAuth.logout();
  window.location.href = "login.html";
});

async function initializePage() {
  if (window.TSData?.initialize) {
    await window.TSData.initialize();
  }
  renderProjects();
}

initializePage();
