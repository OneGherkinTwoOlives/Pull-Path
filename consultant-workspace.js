const session = window.TSAuth.requireAuth(["consultant"]);
if (!session) {
  throw new Error("Unauthorized");
}

const list = document.getElementById("consultant-project-list");
const empty = document.getElementById("consultant-empty");
const emailEl = document.getElementById("consultant-email");

emailEl.textContent = `Signed in as ${session.email}`;

function renderAssignments() {
  const assignments = window.TSAuth.consultantAssignments(session.email);
  const projectMap = new Map();
  assignments.forEach((assignment) => {
    if (!projectMap.has(assignment.projectId)) {
      projectMap.set(assignment.projectId, { projectName: assignment.projectName, disciplines: [] });
    }
    projectMap.get(assignment.projectId).disciplines.push(assignment.discipline);
  });

  list.innerHTML = "";
  empty.style.display = projectMap.size === 0 ? "block" : "none";

  projectMap.forEach((entry, projectId) => {
    const li = document.createElement("li");
    li.className = "project-item-row";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "project-item-btn";
    const uniqueDisciplines = [...new Set(entry.disciplines)];
    btn.innerHTML = `<strong>${entry.projectName}</strong><br><span class="muted">${uniqueDisciplines.join(", ")}</span>`;
    btn.addEventListener("click", () => {
      localStorage.setItem("ts-active-project-id", projectId);
      window.location.href = `board.html?projectId=${encodeURIComponent(projectId)}`;
    });
    li.appendChild(btn);
    list.appendChild(li);
  });
}

document.getElementById("logout-btn").addEventListener("click", () => {
  window.TSAuth.logout();
  window.location.href = "login.html";
});

async function initializePage() {
  if (window.TSData?.initialize) {
    await window.TSData.initialize();
  }
  renderAssignments();
}

initializePage();
