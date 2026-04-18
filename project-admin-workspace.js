const session = window.TSAuth.requireAuth(["project-admin"]);
if (!session) {
  throw new Error("Unauthorized");
}

const list = document.getElementById("project-admin-project-list");
const empty = document.getElementById("project-admin-empty");
const emailEl = document.getElementById("project-admin-email");

emailEl.textContent = `Signed in as ${session.email}`;

const assignments = window.TSAuth.projectAdminAssignments(session.email);
list.innerHTML = "";
empty.style.display = assignments.length === 0 ? "block" : "none";

assignments.forEach((assignment) => {
  const li = document.createElement("li");
  const row = document.createElement("div");
  row.className = "project-item-row";

  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.className = "project-item-btn";
  const disciplines = Array.isArray(assignment.disciplines) ? assignment.disciplines : [];
  openBtn.innerHTML = `<strong>${assignment.projectName}</strong><br><span class="muted">${disciplines.length} disciplines</span>`;
  openBtn.addEventListener("click", () => {
    localStorage.setItem("ts-active-project-id", assignment.projectId);
    window.location.href = `board.html?projectId=${encodeURIComponent(assignment.projectId)}`;
  });

  const manageBtn = document.createElement("button");
  manageBtn.type = "button";
  manageBtn.className = "admin-btn";
  manageBtn.textContent = "Manage";
  manageBtn.addEventListener("click", () => {
    window.location.href = `create-project.html?projectId=${encodeURIComponent(assignment.projectId)}&v=20260405`;
  });

  row.appendChild(openBtn);
  row.appendChild(manageBtn);
  li.appendChild(row);
  list.appendChild(li);
});

document.getElementById("logout-btn").addEventListener("click", () => {
  window.TSAuth.logout();
  window.location.href = "login.html";
});
