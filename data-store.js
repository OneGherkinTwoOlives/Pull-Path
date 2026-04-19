const TSData = (() => {
  const PROJECTS_KEY = "ts-projects";
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
    fetchBoardState,
    getBoardStateSync,
    saveBoardState,
    deleteBoardState,
  };
})();

window.TSData = TSData;
