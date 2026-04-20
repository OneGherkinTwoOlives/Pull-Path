const TSAuth = (() => {
  const SESSION_KEY = "ts-auth-session";
  const PROJECTS_KEY = "ts-projects";
  const SUPER_ADMIN_EMAIL = "tschmitt@marcon.ca";
  const DEFAULT_PASSWORD = "123";

  function canonicalRole(role) {
    if (role === "admin") {
      return "super-admin";
    }
    return role;
  }

  function normalizeAllowedRoles(roles) {
    return Array.isArray(roles) ? roles.map((role) => canonicalRole(role)) : [];
  }

  function routeForRole(role) {
    const normalizedRole = canonicalRole(role);
    if (normalizedRole === "super-admin") {
      return "index.html";
    }
    if (normalizedRole === "project-admin") {
      return "project-admin-workspace.html";
    }
    return "consultant-workspace.html";
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function loadProjects() {
    return window.TSData?.getProjectsSync ? window.TSData.getProjectsSync() : [];
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.email || !parsed.role) {
        return null;
      }
      parsed.role = canonicalRole(parsed.role);
      return parsed;
    } catch {
      return null;
    }
  }

  function setSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  function consultantAssignments(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      return [];
    }

    const assignments = [];
    loadProjects().forEach((project) => {
      const team = Array.isArray(project.team) ? project.team : [];
      team.forEach((member) => {
        if (normalizeEmail(member.email) === normalized && member.discipline) {
          assignments.push({
            projectId: project.id,
            projectName: project.name,
            discipline: member.discipline,
          });
        }
      });
    });

    return assignments;
  }

  function projectAdminAssignments(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      return [];
    }

    const assignments = [];
    loadProjects().forEach((project) => {
      const admins = Array.isArray(project.projectAdmins) ? project.projectAdmins : [];
      if (admins.some((adminEmail) => normalizeEmail(adminEmail) === normalized)) {
        assignments.push({
          projectId: project.id,
          projectName: project.name,
          disciplines: Array.isArray(project.disciplines) ? [...project.disciplines] : [],
        });
      }
    });

    return assignments;
  }

  async function resolveAdminAccount(email) {
    const normalized = normalizeEmail(email);
    if (!normalized || !window.TSData?.fetchAdminAccount) {
      return null;
    }
    return await window.TSData.fetchAdminAccount(normalized);
  }

  async function resolveAdminPassword(email) {
    const account = await resolveAdminAccount(email);
    return account?.password || DEFAULT_PASSWORD;
  }

  async function authenticate(email, password) {
    const normalizedEmail = normalizeEmail(email);

    if (window.TSData?.initialize) {
      await window.TSData.initialize();
    }

    if (normalizedEmail === SUPER_ADMIN_EMAIL) {
      const expectedPassword = await resolveAdminPassword(normalizedEmail);
      if (password !== expectedPassword) {
        return { ok: false, message: "Invalid password." };
      }
      return {
        ok: true,
        session: {
          role: "super-admin",
          email: normalizedEmail,
          loginAt: new Date().toISOString(),
        },
      };
    }

    const projectAdminProjects = projectAdminAssignments(normalizedEmail);
    if (projectAdminProjects.length > 0) {
      const expectedPassword = await resolveAdminPassword(normalizedEmail);
      if (password !== expectedPassword) {
        return { ok: false, message: "Invalid password." };
      }
      return {
        ok: true,
        session: {
          role: "project-admin",
          email: normalizedEmail,
          assignments: projectAdminProjects,
          loginAt: new Date().toISOString(),
        },
      };
    }

    const assignments = consultantAssignments(normalizedEmail);
    if (assignments.length === 0) {
      return { ok: false, message: "No consultant assignments found for this email." };
    }

    if (password !== DEFAULT_PASSWORD) {
      return { ok: false, message: "Invalid password." };
    }

    return {
      ok: true,
      session: {
        role: "consultant",
        email: normalizedEmail,
        assignments,
        loginAt: new Date().toISOString(),
      },
    };
  }

  function requireAuth(allowedRoles) {
    const session = getSession();
    if (!session) {
      window.location.href = "login.html";
      return null;
    }

    const normalizedAllowedRoles = normalizeAllowedRoles(allowedRoles);
    if (!normalizedAllowedRoles || normalizedAllowedRoles.length === 0) {
      return session;
    }

    if (!normalizedAllowedRoles.includes(session.role)) {
      window.location.href = routeForRole(session.role);
      return null;
    }

    return session;
  }

  return {
    ADMIN_EMAIL: SUPER_ADMIN_EMAIL,
    SUPER_ADMIN_EMAIL,
    DEFAULT_PASSWORD,
    authenticate,
    resolveAdminAccount,
    consultantAssignments,
    projectAdminAssignments,
    getSession,
    setSession,
    logout,
    requireAuth,
    routeForRole,
    normalizeEmail,
    loadProjects,
  };
})();

window.TSAuth = TSAuth;
