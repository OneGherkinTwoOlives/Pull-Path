const CREATE_PROJECT_VERSION = "20260405";
const session = window.TSAuth.requireAuth(["super-admin"]);
if (!session) {
  throw new Error("Unauthorized");
}

function loadProjects() {
  return window.TSAuth.loadProjects();
}

function countUniqueProjectAdmins(projects) {
  const emails = new Set();
  projects.forEach((project) => {
    const admins = Array.isArray(project.projectAdmins) ? project.projectAdmins : [];
    admins.forEach((email) => emails.add(window.TSAuth.normalizeEmail(email)));
  });
  return emails.size;
}

function renderStats(projects) {
  const statsEl = document.getElementById("admin-stats");
  const totalTeamMembers = projects.reduce((count, project) => count + (Array.isArray(project.team) ? project.team.length : 0), 0);

  statsEl.innerHTML = `
    <div class="stat-pill"><strong>${projects.length}</strong><span>Projects</span></div>
    <div class="stat-pill"><strong>${countUniqueProjectAdmins(projects)}</strong><span>Project Admins</span></div>
    <div class="stat-pill"><strong>${totalTeamMembers}</strong><span>Team Assignments</span></div>
  `;
}

function renderProjectAdminOverview() {
  const list = document.getElementById("project-admin-overview");
  const empty = document.getElementById("project-admin-overview-empty");
  const projects = loadProjects();

  renderStats(projects);
  list.innerHTML = "";
  empty.style.display = projects.length === 0 ? "block" : "none";

  projects.forEach((project) => {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "project-item-row project-admin-row";

    const info = document.createElement("div");
    info.className = "project-admin-card";
    const admins = Array.isArray(project.projectAdmins) && project.projectAdmins.length
      ? project.projectAdmins.join(", ")
      : "No project administrator assigned";
    info.innerHTML = `
      <strong>${project.name}</strong>
      <span class="muted">${(project.disciplines || []).length} disciplines</span>
      <span class="muted">Project admins: ${admins}</span>
    `;

    const manageBtn = document.createElement("button");
    manageBtn.type = "button";
    manageBtn.className = "admin-btn";
    manageBtn.textContent = "Manage Project";
    manageBtn.addEventListener("click", () => {
      window.location.href = `create-project.html?projectId=${encodeURIComponent(project.id)}&v=${CREATE_PROJECT_VERSION}`;
    });

    row.appendChild(info);
    row.appendChild(manageBtn);
    li.appendChild(row);
    list.appendChild(li);
  });
}

document.getElementById("super-admin-email").textContent = `Signed in as ${session.email}`;
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
  renderProjectAdminOverview();
}

initializePage();
