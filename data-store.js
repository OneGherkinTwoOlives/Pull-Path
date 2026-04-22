const TSData = (() => {
  const PROJECTS_KEY = "ts-projects";
  const ADMIN_ACCOUNTS_KEY = "ts-admin-accounts";
  const USER_PROFILES_KEY = "ts-user-profiles";
  const BOARD_PREFIX = "board-state-";
  const VIEW_PREFIX = "board-view-";
  const config = window.TSSupabaseConfig || {};
  const isConfigured = !!(window.supabase && config.url && config.anonKey);
  const client = isConfigured ? window.supabase.createClient(config.url, config.anonKey) : null;
  let initPromise = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readProjectsCache() {
    try {
      return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function writeProjectsCache(projects) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }

  function readAdminAccountsCache() {
    try {
      return JSON.parse(localStorage.getItem(ADMIN_ACCOUNTS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function readUserProfilesCache() {
    try {
      return JSON.parse(localStorage.getItem(USER_PROFILES_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function writeUserProfilesCache(profiles) {
    localStorage.setItem(USER_PROFILES_KEY, JSON.stringify(profiles));
  }

  function upsertUserProfilesCache(profiles) {
    const next = [...readUserProfilesCache()];
    (profiles || []).forEach((profile) => {
      const idx = next.findIndex((item) => item.email === profile.email);
      if (idx === -1) {
        next.push(profile);
      } else {
        next[idx] = profile;
      }
    });
    writeUserProfilesCache(next);
    return next;
  }

  function writeAdminAccountsCache(accounts) {
    localStorage.setItem(ADMIN_ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  function upsertAdminAccountsCache(accounts) {
    const next = [...readAdminAccountsCache()];
    (accounts || []).forEach((account) => {
      const idx = next.findIndex((item) => item.email === account.email);
      if (idx === -1) {
        next.push(account);
      } else {
        next[idx] = account;
      }
    });
    writeAdminAccountsCache(next);
    return next;
  }

  function boardKey(projectId) {
    return `${BOARD_PREFIX}${projectId}`;
  }

  function readBoardCache(projectId) {
    try {
      return JSON.parse(localStorage.getItem(boardKey(projectId)) || "null");
    } catch {
      return null;
    }
  }

  function writeBoardCache(projectId, state) {
    localStorage.setItem(boardKey(projectId), JSON.stringify(state));
  }

  function removeBoardCache(projectId) {
    localStorage.removeItem(boardKey(projectId));
  }

  function normalizeProjectRow(row) {
    return {
      id: row.id,
      name: row.name,
      startDate: row.start_date,
      durationWeeks: row.duration_weeks,
      disciplines: Array.isArray(row.disciplines) ? row.disciplines : [],
      team: Array.isArray(row.team) ? row.team : [],
      projectAdmins: Array.isArray(row.project_admins) ? row.project_admins : [],
      deliverables: row.deliverables || null,
      createdByEmail: row.created_by_email || null,
      importedTaskCsvName: row.imported_task_csv_name || null,
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null,
    };
  }

  function normalizeAdminAccountRow(row) {
    return {
      email: row.email,
      password: row.password || "123",
      company: row.company || "",
      position: row.position || "",
      telephoneNumbers: Array.isArray(row.telephone_numbers) ? row.telephone_numbers : [],
      address: row.address || "",
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null,
    };
  }

  function normalizeUserProfileRow(row) {
    return {
      email: row.email,
      authUserId: row.auth_user_id || null,
      name: row.full_name || "",
      company: row.company || "",
      disciplineTrade: row.discipline_trade || "",
      phoneNumber: row.phone_number || "",
      address: row.address || "",
      confirmedAt: row.confirmed_at || null,
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null,
    };
  }

  function serializeProject(project) {
    return {
      id: project.id,
      name: project.name,
      start_date: project.startDate || null,
      duration_weeks: project.durationWeeks || 0,
      disciplines: Array.isArray(project.disciplines) ? project.disciplines : [],
      team: Array.isArray(project.team) ? project.team : [],
      project_admins: Array.isArray(project.projectAdmins) ? project.projectAdmins : [],
      deliverables: project.deliverables || null,
      created_by_email: project.createdByEmail || null,
      imported_task_csv_name: project.importedTaskCsvName || null,
      created_at: project.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  function serializeAdminAccount(account) {
    return {
      email: account.email,
      password: account.password || "123",
      company: account.company || null,
      position: account.position || null,
      telephone_numbers: Array.isArray(account.telephoneNumbers) ? account.telephoneNumbers : [],
      address: account.address || null,
      created_at: account.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  function serializeUserProfile(profile) {
    return {
      email: profile.email,
      auth_user_id: profile.authUserId || null,
      full_name: profile.name || "",
      company: profile.company || "",
      discipline_trade: profile.disciplineTrade || "",
      phone_number: profile.phoneNumber || null,
      address: profile.address || null,
      confirmed_at: profile.confirmedAt || null,
      created_at: profile.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async function initialize() {
    if (initPromise) {
      return initPromise;
    }

    initPromise = (async () => {
      if (!isConfigured) {
        return readProjectsCache();
      }

      try {
        const { data, error } = await client
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        const projects = (data || []).map(normalizeProjectRow);
        writeProjectsCache(projects);
        return projects;
      } catch (err) {
        console.error("Failed to initialize Supabase project cache:", err);
        return readProjectsCache();
      }
    })();

    return initPromise;
  }

  function getProjectsSync() {
    return readProjectsCache();
  }

  async function getProjects() {
    await initialize();
    return clone(readProjectsCache());
  }

  async function saveProjects(projects) {
    const normalizedProjects = clone(projects || []);
    writeProjectsCache(normalizedProjects);

    if (!isConfigured) {
      return normalizedProjects;
    }

    const rows = normalizedProjects.map(serializeProject);
    const { error } = await client.from("projects").upsert(rows, { onConflict: "id" });
    if (error) {
      console.error("Failed to save projects to Supabase:", error);
      throw error;
    }

    return normalizedProjects;
  }

  function getAdminAccountSync(email) {
    return readAdminAccountsCache().find((account) => account.email === email) || null;
  }

  async function fetchAdminAccount(email) {
    const cached = getAdminAccountSync(email);
    if (!email || !isConfigured) {
      return cached;
    }

    try {
      const { data, error } = await client
        .from("admin_accounts")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const account = data ? normalizeAdminAccountRow(data) : cached;
      if (account) {
        upsertAdminAccountsCache([account]);
      }
      return account;
    } catch (err) {
      console.error("Failed to fetch admin account from Supabase:", err);
      return cached;
    }
  }

  async function saveAdminAccount(account) {
    const normalized = clone(account || null);
    if (!normalized?.email) {
      throw new Error("Admin account email is required.");
    }

    upsertAdminAccountsCache([normalized]);

    if (!isConfigured) {
      return normalized;
    }

    const row = serializeAdminAccount(normalized);
    const { error } = await client.from("admin_accounts").upsert(row, { onConflict: "email" });
    if (error) {
      console.error("Failed to save admin account to Supabase:", error);
      throw error;
    }

    return normalized;
  }

  function getUserProfileSync(email) {
    return readUserProfilesCache().find((profile) => profile.email === email) || null;
  }

  async function fetchUserProfile(email) {
    const cached = getUserProfileSync(email);
    if (!email || !isConfigured) {
      return cached;
    }

    try {
      const { data, error } = await client
        .from("user_profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const profile = data ? normalizeUserProfileRow(data) : cached;
      if (profile) {
        upsertUserProfilesCache([profile]);
      }
      return profile;
    } catch (err) {
      console.error("Failed to fetch user profile from Supabase:", err);
      return cached;
    }
  }

  async function saveUserProfile(profile) {
    const normalized = clone(profile || null);
    if (!normalized?.email) {
      throw new Error("User profile email is required.");
    }

    upsertUserProfilesCache([normalized]);

    if (!isConfigured) {
      return normalized;
    }

    const row = serializeUserProfile(normalized);
    const { error } = await client.from("user_profiles").upsert(row, { onConflict: "email" });
    if (error) {
      console.error("Failed to save user profile to Supabase:", error);
      throw error;
    }

    return normalized;
  }

  async function fetchBoardState(projectId) {
    const cached = readBoardCache(projectId);
    if (!isConfigured) {
      return cached;
    }

    try {
      const { data, error } = await client
        .from("board_states")
        .select("state")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const state = data?.state || cached;
      if (state) {
        writeBoardCache(projectId, state);
      }
      return state;
    } catch (err) {
      console.error("Failed to fetch board state from Supabase:", err);
      return cached;
    }
  }

  function getBoardStateSync(projectId) {
    return readBoardCache(projectId);
  }

  async function saveBoardState(projectId, state) {
    writeBoardCache(projectId, state);

    if (!isConfigured) {
      return state;
    }

    const { error } = await client.from("board_states").upsert({
      project_id: projectId,
      state,
      updated_at: new Date().toISOString(),
    }, { onConflict: "project_id" });

    if (error) {
      console.error("Failed to save board state to Supabase:", error);
      throw error;
    }

    return state;
  }

  async function deleteBoardState(projectId) {
    removeBoardCache(projectId);
    localStorage.removeItem(`${VIEW_PREFIX}${projectId}`);

    if (!isConfigured) {
      return;
    }

    const { error } = await client.from("board_states").delete().eq("project_id", projectId);
    if (error) {
      console.error("Failed to delete board state from Supabase:", error);
      throw error;
    }
  }

  return {
    initialize,
    isConfigured,
    getProjects,
    getProjectsSync,
    saveProjects,
    getAdminAccountSync,
    fetchAdminAccount,
    saveAdminAccount,
    getUserProfileSync,
    fetchUserProfile,
    saveUserProfile,
    fetchBoardState,
    getBoardStateSync,
    saveBoardState,
    deleteBoardState,
  };
})();

window.TSData = TSData;
