const TSAuth = (() => {
  const SESSION_KEY = "ts-auth-session";
  const PROJECTS_KEY = "ts-projects";
  const SUPER_ADMIN_EMAIL = "tschmitt@marcon.ca";
  const DEFAULT_PASSWORD = "123";
  const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{6,}$/;
  const config = window.TSSupabaseConfig || {};
  const isSupabaseConfigured = !!(window.supabase && config.url && config.anonKey);
  const supabaseClient = isSupabaseConfigured ? window.supabase.createClient(config.url, config.anonKey) : null;

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

  function passwordMeetsRequirements(password) {
    return PASSWORD_RULE.test(String(password || ""));
  }

  function signupRedirectUrl() {
    return new URL("login.html", window.location.href).toString();
  }

  function formatSupabaseAuthError(error) {
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("email not confirmed") || message.includes("email_not_confirmed")) {
      return "Please confirm your email address before logging in.";
    }
    if (message.includes("invalid login credentials")) {
      return "Invalid email or password.";
    }
    if (message.includes("user already registered")) {
      return "An account already exists for this email address.";
    }
    return error?.message || "Authentication failed.";
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

  async function signUpAccount(details) {
    if (!supabaseClient || !window.TSData?.saveUserProfile) {
      throw new Error("Supabase authentication is not configured.");
    }

    const normalizedEmail = normalizeEmail(details?.email);
    const password = String(details?.password || "");
    if (!normalizedEmail) {
      throw new Error("Email is required.");
    }
    if (!passwordMeetsRequirements(password)) {
      throw new Error("Password must be at least 6 characters and include one capital letter and one symbol.");
    }

    const { data, error } = await supabaseClient.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: signupRedirectUrl(),
        data: {
          full_name: details.name || "",
          company: details.company || "",
          discipline_trade: details.disciplineTrade || "",
        },
      },
    });

    if (error) {
      throw new Error(formatSupabaseAuthError(error));
    }

    await window.TSData.saveUserProfile({
      email: normalizedEmail,
      authUserId: data?.user?.id || null,
      name: String(details?.name || "").trim(),
      company: String(details?.company || "").trim(),
      disciplineTrade: String(details?.disciplineTrade || "").trim(),
      phoneNumber: String(details?.phoneNumber || "").trim(),
      address: String(details?.address || "").trim(),
      confirmedAt: data?.user?.email_confirmed_at || null,
      createdAt: null,
    });

    return {
      ok: true,
      message: "Check your email for a confirmation link before logging in.",
    };
  }

  async function authenticate(email, password) {
    const normalizedEmail = normalizeEmail(email);

    if (window.TSData?.initialize) {
      await window.TSData.initialize();
    }

    const existingProfile = window.TSData?.fetchUserProfile
      ? await window.TSData.fetchUserProfile(normalizedEmail)
      : null;

    if (existingProfile && supabaseClient) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        return { ok: false, message: formatSupabaseAuthError(error) };
      }

      if (window.TSData?.saveUserProfile) {
        await window.TSData.saveUserProfile({
          ...existingProfile,
          authUserId: data?.user?.id || existingProfile.authUserId || null,
          confirmedAt: data?.user?.email_confirmed_at || existingProfile.confirmedAt || null,
          createdAt: existingProfile.createdAt || null,
        });
      }

      if (normalizedEmail === SUPER_ADMIN_EMAIL) {
        return {
          ok: true,
          session: {
            role: "super-admin",
            email: normalizedEmail,
            loginAt: new Date().toISOString(),
          },
        };
      }

      const signedInProjectAdminProjects = projectAdminAssignments(normalizedEmail);
      if (signedInProjectAdminProjects.length > 0) {
        return {
          ok: true,
          session: {
            role: "project-admin",
            email: normalizedEmail,
            assignments: signedInProjectAdminProjects,
            loginAt: new Date().toISOString(),
          },
        };
      }

      const signedInAssignments = consultantAssignments(normalizedEmail);
      if (signedInAssignments.length > 0) {
        return {
          ok: true,
          session: {
            role: "consultant",
            email: normalizedEmail,
            assignments: signedInAssignments,
            loginAt: new Date().toISOString(),
          },
        };
      }

      return { ok: false, message: "Your account is confirmed, but no project assignments are available yet." };
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
    passwordMeetsRequirements,
    authenticate,
    signUpAccount,
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
