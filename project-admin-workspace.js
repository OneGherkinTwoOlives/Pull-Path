const session = window.TSAuth.requireAuth(["project-admin", "consultant"]);
if (!session) {
  throw new Error("Unauthorized");
}

const adminList = document.getElementById("project-admin-project-list");
const adminEmpty = document.getElementById("project-admin-empty");
const contributorList = document.getElementById("project-contributor-project-list");
const contributorEmpty = document.getElementById("project-contributor-empty");
const emailEl = document.getElementById("project-admin-email");
const createProjectBtn = document.getElementById("create-project-btn");

emailEl.textContent = `Signed in as ${session.email}`;

function renderProjectRow(assignment, options = {}) {
  const { showManage = false, subtitle } = options;
  const li = document.createElement("li");
  const row = document.createElement("div");
  row.className = "project-item-row";

  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.className = "project-item-btn";
  openBtn.innerHTML = `<strong>${assignment.projectName}</strong><br><span class="muted">${subtitle}</span>`;
  openBtn.addEventListener("click", () => {
    localStorage.setItem("ts-active-project-id", assignment.projectId);
    window.location.href = `board.html?projectId=${encodeURIComponent(assignment.projectId)}`;
  });

  row.appendChild(openBtn);

  const testBoardBtn = document.createElement("button");
  testBoardBtn.type = "button";
  testBoardBtn.className = "export-btn";
  testBoardBtn.textContent = "Test Board";
  testBoardBtn.addEventListener("click", () => {
    localStorage.setItem("ts-active-project-id", assignment.projectId);
    window.location.href = `test-board.html?projectId=${encodeURIComponent(assignment.projectId)}`;
  });

  row.appendChild(testBoardBtn);

  if (showManage) {
    const manageBtn = document.createElement("button");
    manageBtn.type = "button";
    manageBtn.className = "admin-btn";
    manageBtn.textContent = "Manage";
    manageBtn.addEventListener("click", () => {
      window.location.href = `create-project.html?projectId=${encodeURIComponent(assignment.projectId)}&v=20260405`;
    });
    row.appendChild(manageBtn);
  }

  li.appendChild(row);
  return li;
}

function renderAssignments() {
  const adminAssignments = window.TSAuth.projectAdminAssignments(session.email);
  const contributorAssignments = window.TSAuth.consultantAssignments(session.email);
  const adminProjectIds = new Set(adminAssignments.map((assignment) => assignment.projectId));
  const contributorProjectMap = new Map();

  contributorAssignments.forEach((assignment) => {
    if (adminProjectIds.has(assignment.projectId)) {
      return;
    }
    if (!contributorProjectMap.has(assignment.projectId)) {
      contributorProjectMap.set(assignment.projectId, {
        projectId: assignment.projectId,
        projectName: assignment.projectName,
        disciplines: [],
      });
    }
    contributorProjectMap.get(assignment.projectId).disciplines.push(assignment.discipline);
  });

  adminList.innerHTML = "";
  contributorList.innerHTML = "";
  adminEmpty.style.display = adminAssignments.length === 0 ? "block" : "none";
  contributorEmpty.style.display = contributorProjectMap.size === 0 ? "block" : "none";

  adminAssignments.forEach((assignment) => {
    const disciplines = Array.isArray(assignment.disciplines) ? assignment.disciplines : [];
    adminList.appendChild(renderProjectRow(assignment, {
      showManage: true,
      subtitle: `${disciplines.length} disciplines`,
    }));
  });

  contributorProjectMap.forEach((assignment) => {
    const uniqueDisciplines = [...new Set(assignment.disciplines)];
    contributorList.appendChild(renderProjectRow(assignment, {
      subtitle: uniqueDisciplines.join(", "),
    }));
  });
}


document.getElementById("logout-btn").addEventListener("click", () => {
  window.TSAuth.logout();
  window.location.href = "login.html";
});

createProjectBtn?.addEventListener("click", () => {
  window.location.href = "create-project.html?v=20260405";
});

async function initializePage() {
  if (window.TSData?.initialize) {
    await window.TSData.initialize();
  }
  if (createProjectBtn && session.role !== "project-admin") {
    createProjectBtn.hidden = true;
  }
  renderAssignments();
}

initializePage();
