type DemoRun = {
  run_id: string;
  agent_id: string;
  status: string;
  inputs_metadata: Record<string, unknown>;
  steps: Array<Record<string, unknown>>;
  outputs: Record<string, unknown>;
  artifacts: Record<string, unknown>;
  error?: string | null;
  started_at: string;
  finished_at?: string | null;
};

const SESSION_KEY = "novakit-showcase-session";
const RUNS_KEY = "novakit-showcase-runs-v1";
const SETTINGS_KEY = "novakit-showcase-settings-v1";

const agents = [
  {
    id: "employee-onboarding",
    name: "Employee Onboarding",
    version: "1.0.0",
    description: "Coordinate account, equipment, and welcome tasks using synthetic data.",
    category: "HR Operations",
    tags: ["workflow", "identity", "assets"],
    risk_level: "medium",
    requires_approval: false,
    inputs: [
      { name: "employee_name", label: "Employee name", type: "text", required: true, default: "Taylor Demo" },
      { name: "department", label: "Department", type: "select", required: true, options: ["Operations", "Engineering", "People"] },
      { name: "start_date", label: "Start date", type: "text", required: true, default: "2026-09-01" },
      { name: "needs_laptop", label: "Provision laptop", type: "boolean", default: true }
    ],
    outputs: [{ name: "summary", label: "Execution summary", type: "json" }]
  },
  {
    id: "access-review",
    name: "Access Review",
    version: "1.1.0",
    description: "Review a synthetic user's application access and prepare a remediation plan.",
    category: "Security",
    tags: ["governance", "approval", "audit"],
    risk_level: "high",
    requires_approval: true,
    inputs: [
      { name: "employee_email", label: "Employee email", type: "text", required: true, default: "amy.chang@example.com" },
      { name: "review_scope", label: "Review scope", type: "select", required: true, options: ["All systems", "Cloud only", "Business apps"] },
      { name: "notes", label: "Reviewer notes", type: "textarea", required: false }
    ],
    outputs: [{ name: "recommendations", label: "Recommendations", type: "json" }]
  },
  {
    id: "weekly-ops-brief",
    name: "Weekly Operations Brief",
    version: "2.0.0",
    description: "Turn demo operational metrics into an executive-ready weekly brief.",
    category: "Analytics",
    tags: ["reporting", "insights"],
    risk_level: "low",
    requires_approval: false,
    inputs: [
      { name: "reporting_period", label: "Reporting period", type: "text", required: true, default: "2026-W34" },
      { name: "focus", label: "Focus", type: "select", required: true, options: ["Service delivery", "People operations", "IT operations"] }
    ],
    outputs: [{ name: "brief", label: "Weekly brief", type: "markdown" }]
  }
];

const seedRuns: DemoRun[] = [
  {
    run_id: "demo-run-20260820-001",
    agent_id: "employee-onboarding",
    status: "completed",
    inputs_metadata: { employee_name: "Taylor Demo", department: "Operations", start_date: "2026-09-01", needs_laptop: true },
    steps: [
      { name: "validate_request", status: "completed", duration_ms: 84 },
      { name: "prepare_accounts", status: "completed", duration_ms: 163 },
      { name: "reserve_equipment", status: "completed", duration_ms: 121 },
      { name: "compose_summary", status: "completed", duration_ms: 97 }
    ],
    outputs: { summary: { employee: "Taylor Demo", account: "taylor.demo@example.com", laptop: "DEMO-NB-005", checklist_completion: "100%" } },
    artifacts: {},
    started_at: "2026-08-20T08:30:00Z",
    finished_at: "2026-08-20T08:30:01Z"
  },
  {
    run_id: "demo-run-20260819-002",
    agent_id: "access-review",
    status: "pending_approval",
    inputs_metadata: { employee_email: "amy.chang@example.com", review_scope: "All systems" },
    steps: [
      { name: "collect_access", status: "completed", duration_ms: 142 },
      { name: "risk_analysis", status: "completed", duration_ms: 188 },
      { name: "human_approval", status: "waiting" }
    ],
    outputs: { recommendations: ["Retain CRM Demo access", "Review elevated analytics role in 30 days"] },
    artifacts: {},
    started_at: "2026-08-19T14:12:00Z"
  }
];

const workflows = [
  { run_id: "workflow-demo-001", workflow: "employee_onboarding", status: "completed", current_step: "done", progress: 100, created_at: "2026-08-20T08:30:00Z", source: "frontend-showcase" },
  { run_id: "workflow-demo-002", workflow: "permission_request", status: "waiting_approval", current_step: "manager_approval", progress: 50, created_at: "2026-08-19T14:12:00Z", source: "frontend-showcase" },
  { run_id: "workflow-demo-003", workflow: "asset_return", status: "running", current_step: "verify_assets", progress: 70, created_at: "2026-08-20T09:05:00Z", source: "frontend-showcase" }
];

const defaultSettings = {
  auth_required: true,
  auth_mode: "local",
  demo_mode: true,
  providers: { local: true, ad: false, google: false },
  local_enabled: true,
  ad_enabled: false,
  google_enabled: false,
  can_manage_auth: true,
  ad_url: "",
  ad_base_dn: "",
  ad_domain: "EXAMPLE",
  ad_user_suffix: "@example.internal",
  google_allowed_domain: "example.com",
  admin_users: ["admin"],
  ad_admin_groups: ["Demo Administrators"],
  admin_emails: ["admin@example.com"]
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "X-Demo-Data": "true" }
  });
}

function loadRuns(): DemoRun[] {
  try { return JSON.parse(localStorage.getItem(RUNS_KEY) || "") as DemoRun[]; }
  catch { return JSON.parse(JSON.stringify(seedRuns)); }
}

function saveRuns(runs: DemoRun[]) {
  localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
}

function loadSettings() {
  try { return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "") }; }
  catch { return { ...defaultSettings }; }
}

function parseBody(init?: RequestInit): any {
  if (typeof init?.body !== "string") return {};
  try { return JSON.parse(init.body); } catch { return {}; }
}

function currentUser() {
  return {
    authenticated: true,
    provider: "local",
    username: "admin",
    operator: "Demo Administrator",
    email: "admin@example.com",
    role: "admin",
    is_admin: true,
    config: loadSettings()
  };
}

function detailFor(agentId: string) {
  const manifest = agents.find(agent => agent.id === agentId);
  if (!manifest) return null;
  return {
    manifest: { ...manifest, workflow: `${agentId}.yaml`, permissions: { network: false, filesystem: false, demo: true } },
    workflow: {
      version: "1",
      steps: [
        { id: "validate", name: "Validate request", skill: "demo.validate" },
        { id: "plan", name: "Build execution plan", skill: "demo.plan" },
        ...(manifest.requires_approval ? [{ id: "approval", name: "Human approval", skill: "demo.approval" }] : []),
        { id: "respond", name: "Prepare output", skill: "demo.respond" }
      ],
      outputs: { result: "$.steps.respond.output" }
    }
  };
}

async function handleApi(url: URL, init?: RequestInit): Promise<Response> {
  const path = url.pathname;
  const method = String(init?.method || "GET").toUpperCase();
  const body = parseBody(init);

  if (path === "/api/auth/config") return json(defaultSettings);
  if (path === "/api/auth/me") return localStorage.getItem(SESSION_KEY) ? json(currentUser()) : json({ authenticated: false }, 401);
  if ((path === "/api/auth/local" || path === "/api/auth/ad") && method === "POST") {
    if (!body.username || !body.password) return json({ detail: "Enter the demo credentials." }, 400);
    localStorage.setItem(SESSION_KEY, "1");
    return json(currentUser());
  }
  if (path === "/api/auth/logout" && method === "POST") {
    localStorage.removeItem(SESSION_KEY);
    return json({ ok: true });
  }
  if (path === "/api/admin/auth/settings") {
    if (method === "POST") {
      const settings = { ...loadSettings(), ...body, demo_mode: true };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return json({ settings });
    }
    return json({ settings: loadSettings() });
  }

  if (path === "/api/agents") return json(agents);
  const agentRunMatch = path.match(/^\/api\/agents\/([^/]+)\/run$/);
  if (agentRunMatch && method === "POST") {
    const agent = agents.find(item => item.id === decodeURIComponent(agentRunMatch[1]));
    if (!agent) return json({ detail: "Demo agent not found" }, 404);
    const now = new Date();
    const run: DemoRun = {
      run_id: `demo-run-${now.getTime()}`,
      agent_id: agent.id,
      status: agent.requires_approval ? "pending_approval" : "completed",
      inputs_metadata: body.inputs || {},
      steps: [
        { name: "validate_request", status: "completed", duration_ms: 76 },
        { name: "build_plan", status: "completed", duration_ms: 134 },
        ...(agent.requires_approval
          ? [{ name: "human_approval", status: "waiting" }]
          : [{ name: "generate_output", status: "completed", duration_ms: 118 }])
      ],
      outputs: agent.id === "weekly-ops-brief"
        ? { brief: "Demo operations are healthy. Three workflows completed and one approval is pending." }
        : { result: "Synthetic demo execution completed", submitted_inputs: body.inputs || {} },
      artifacts: {},
      error: null,
      started_at: now.toISOString(),
      finished_at: agent.requires_approval ? null : new Date(now.getTime() + 500).toISOString()
    };
    const runs = loadRuns(); runs.unshift(run); saveRuns(runs);
    return json(run);
  }
  const agentMatch = path.match(/^\/api\/agents\/([^/]+)$/);
  if (agentMatch) {
    const detail = detailFor(decodeURIComponent(agentMatch[1]));
    return detail ? json(detail) : json({ detail: "Demo agent not found" }, 404);
  }

  if (path === "/api/agent-files/upload" && method === "POST") {
    const form = init?.body instanceof FormData ? init.body : new FormData();
    const file = form.get("file") as File | null;
    return json({ artifact_id: `demo-upload-${Date.now()}`, upload_id: `demo-upload-${Date.now()}`, agent_id: String(form.get("agent_id") || ""), input_name: String(form.get("input_name") || ""), filename: file?.name || "demo-file.txt", path: "browser://demo-upload", relative_path: "demo-upload", content_type: file?.type || "text/plain", size: file?.size || 0 });
  }

  if (path === "/api/agent-runs") {
    let runs = loadRuns();
    const agentId = url.searchParams.get("agent_id");
    const status = url.searchParams.get("status");
    if (agentId) runs = runs.filter(run => run.agent_id === agentId);
    if (status) runs = runs.filter(run => run.status === status);
    return json(runs.slice(0, Number(url.searchParams.get("limit") || 50)).map(run => ({ ...run, inputs_metadata: undefined, steps: undefined, outputs: undefined })));
  }
  const runActionMatch = path.match(/^\/api\/agent-runs\/([^/]+)\/(approve|reject)$/);
  if (runActionMatch && method === "POST") {
    const runs = loadRuns();
    const run = runs.find(item => item.run_id === decodeURIComponent(runActionMatch[1]));
    if (!run) return json({ detail: "Demo run not found" }, 404);
    run.status = runActionMatch[2] === "approve" ? "completed" : "rejected";
    run.finished_at = new Date().toISOString();
    run.steps = run.steps.map(step => step.name === "human_approval" ? { ...step, status: run.status } : step);
    saveRuns(runs);
    return json({ ok: true, message: `Run ${run.status}`, run });
  }
  const runMatch = path.match(/^\/api\/agent-runs\/([^/]+)$/);
  if (runMatch) {
    const run = loadRuns().find(item => item.run_id === decodeURIComponent(runMatch[1]));
    return run ? json(run) : json({ detail: "Demo run not found" }, 404);
  }

  if (path === "/api/workflows/runs") return json({ items: workflows, total: workflows.length, mode: "frontend-demo" });
  if (path === "/api/chat" && method === "POST") {
    const prompt = String(body.message || "").trim();
    return json({ answer: `NovaKit Demo understood: “${prompt}”`, summary: "This response was generated locally from synthetic showcase data.", suggested_actions: ["Review pending access approval", "Open the latest onboarding run", "Inspect workflow progress"], provider: "mock", model: "frontend-showcase" });
  }

  return json({ ok: true, demo: true, message: "Frontend demo action completed" });
}

export function installDemoApi() {
  if ((window as any).__NOVAKIT_DEMO_API__) return;
  (window as any).__NOVAKIT_DEMO_API__ = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = input instanceof Request ? input.url : String(input);
    const url = new URL(raw, window.location.origin);
    if (url.origin === window.location.origin && url.pathname.startsWith("/api/")) {
      await new Promise(resolve => window.setTimeout(resolve, 100));
      return handleApi(url, init);
    }
    return originalFetch(input, init);
  };
}
