type JsonRecord = Record<string, any>;

const SESSION_KEY = "novakit-controller-demo-session";

const demoAgents = [
  {
    id: "employee_onboarding",
    name: "Employee Onboarding",
    version: "2.4.0-demo",
    description: "Coordinate accounts, equipment, and onboarding tasks with synthetic data.",
    category: "People Operations",
    trigger_mode: "manual",
    risk_level: "medium",
    requires_approval: false,
    tags: ["workflow", "identity", "assets"],
    inputs: [
      { name: "employee_name", label: "Employee name", type: "text", required: true, default: "Taylor Demo" },
      { name: "department", label: "Department", type: "select", required: true, options: ["Operations", "Engineering", "People"] },
    ],
    outputs: [{ name: "summary", label: "Execution summary", type: "json" }],
  },
  {
    id: "access_review",
    name: "Access Review",
    version: "1.8.0-demo",
    description: "Review synthetic application access and prepare a remediation plan.",
    category: "Security",
    trigger_mode: "scheduled",
    risk_level: "high",
    requires_approval: true,
    tags: ["governance", "approval", "audit"],
    inputs: [
      { name: "employee_email", label: "Employee email", type: "text", required: true, default: "demo.user@example.com" },
      { name: "scope", label: "Review scope", type: "select", required: true, options: ["All systems", "Cloud only", "Business apps"] },
    ],
    outputs: [{ name: "recommendations", label: "Recommendations", type: "json" }],
  },
  {
    id: "weekly_ops_brief",
    name: "Weekly Operations Brief",
    version: "2.1.0-demo",
    description: "Turn demo operational metrics into an executive-ready weekly brief.",
    category: "Analytics",
    trigger_mode: "scheduled",
    risk_level: "low",
    requires_approval: false,
    tags: ["reporting", "insights"],
    inputs: [{ name: "reporting_period", label: "Reporting period", type: "text", required: true, default: "2026-W34" }],
    outputs: [{ name: "brief", label: "Weekly brief", type: "markdown" }],
  },
];

const moduleCatalog = [
  { id: "employee_onboarding", name: "Employee Onboarding", version: "2.4.0-demo", description: "Synthetic onboarding workflow", zone: "automations", kind: "workflow", status: "active", owner: "Demo Operations", trigger_mode: "event", risk_level: "medium", path: "automodle/automations/employee_onboarding", manifest: "employee_onboarding/module.yaml", modified_at: "2026-08-20T08:00:00Z", connections: ["demo_directory", "demo_assets"], capabilities: ["identity.provision", "asset.reserve"], tags: ["demo"], assets: { workflows: 1, agents: 1, skills: 3 }, runtime: { mode: "mock" }, errors: [] },
  { id: "access_review", name: "Access Review", version: "1.8.0-demo", description: "Synthetic access governance module", zone: "agents", kind: "agent", status: "active", owner: "Demo Security", trigger_mode: "scheduled", risk_level: "high", path: "automodle/agents/access_review", manifest: "access_review/module.yaml", modified_at: "2026-08-19T09:30:00Z", connections: ["demo_identity"], capabilities: ["access.inspect"], tags: ["demo", "governance"], assets: { workflows: 1, agents: 1, skills: 2 }, runtime: { mode: "mock" }, errors: [] },
  { id: "report_builder", name: "Report Builder", version: "1.2.0-demo", description: "Reusable demo reporting capability", zone: "capabilities", kind: "capability", status: "active", owner: "Demo Platform", trigger_mode: "internal", risk_level: "low", path: "automodle/capabilities/report_builder", manifest: "report_builder/module.yaml", modified_at: "2026-08-18T07:15:00Z", connections: [], capabilities: ["report.render"], tags: ["demo", "reporting"], assets: { workflows: 0, agents: 0, skills: 1 }, runtime: { mode: "mock" }, errors: [] },
];

const onboardingRuns = [
  { workflow_run_id: "demo-onboarding-001", case_id: "DEMO-HR-001", employee_name: "Taylor Demo", start_date: "2026-09-01", status: "completed", current_step: "done", ad_status: "created", gws_status: "created", oa_status: "created", laptop_agreement_status: "sent", acl_status: "exported", onboarding_letter_status: "sent", updated_at: "2026-08-20T08:31:00Z" },
  { workflow_run_id: "demo-onboarding-002", case_id: "DEMO-HR-002", employee_name: "Jordan Example", start_date: "2026-09-08", status: "waiting_activation", current_step: "manager_approval", ad_status: "created", gws_status: "waiting", oa_status: "waiting", laptop_agreement_status: "sent", acl_status: "pending", onboarding_letter_status: "pending", updated_at: "2026-08-21T02:10:00Z" },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "X-NovaKit-Demo": "true" },
  });
}

function parseBody(init?: RequestInit): JsonRecord {
  if (typeof init?.body !== "string") return {};
  try { return JSON.parse(init.body); } catch { return {}; }
}

function authenticatedUser() {
  return {
    status: "success",
    authenticated: true,
    operator: "Demo Administrator",
    username: "demo.admin",
    email: "demo.admin@example.com",
    is_admin: true,
    role: "admin",
    chat_mode: localStorage.getItem("novakit_chat_mode") || "nova",
  };
}

function agentControls() {
  return demoAgents.map(agent => ({ id: agent.id, enabled: true, release_enabled: true, assignments: [] }));
}

function route(path: string, method: string, body: JsonRecord): Response {
  if (path.endsWith("/api/auth/config")) return json({ auth_required: true, ad_enabled: true, google_enabled: false, local_enabled: false, providers: { ad: true } });
  if (path.endsWith("/api/auth/me")) return localStorage.getItem(SESSION_KEY) ? json(authenticatedUser()) : json({ status: "success", authenticated: false });
  if (path.endsWith("/api/auth/ad") && method === "POST") {
    if (!body.username || !body.password) return json({ detail: "請輸入 Demo 帳號與密碼" }, 400);
    localStorage.setItem(SESSION_KEY, "1");
    return json(authenticatedUser());
  }
  if (path.endsWith("/api/auth/logout") && method === "POST") {
    localStorage.removeItem(SESSION_KEY);
    return json({ status: "success" });
  }

  if (path.endsWith("/api/models")) return json({ status: "success", providers: [
    { provider: "demo-local", type: "local", available: true, models: ["novakit-demo-7b", "novakit-demo-fast"] },
    { provider: "openai", type: "cloud", available: false, models: ["demo-model"] },
  ] });
  if (path.endsWith("/api/settings/secrets/status")) return json({ status: "success", providers: {} });
  if (path.includes("/api/settings/secrets")) return json({ status: "success", demo: true });

  if (path.endsWith("/api/agents") || path.endsWith("/api/agents/reload")) return json(demoAgents);
  if (path.endsWith("/api/agent-control/catalog")) return json({ agents: agentControls() });
  if (path.endsWith("/api/admin/agent-control/catalog")) return json({ agents: agentControls(), oa_accounts: [{ companyEmail: "demo.user@example.com", displayName: "Demo User" }] });
  if (path.endsWith("/api/admin/agent-releases")) return json({ agents: demoAgents.map(agent => ({ agent_id: agent.id, enabled: true, active_version: agent.version })) });
  if (path.endsWith("/api/admin/agent-releases/hotplug")) return json({ hotplug: { status: "healthy", agents: demoAgents.map(agent => ({ agent_id: agent.id, status: "loaded" })) } });
  if (/\/api\/agents\/[^/]+\/run$/.test(path) && method === "POST") return json({ run_id: `demo-run-${Date.now()}`, status: "completed", outputs: { summary: "Synthetic demo execution completed successfully." }, steps: [{ name: "validate", status: "completed" }, { name: "execute", status: "completed" }], artifacts: {} });

  if (path.endsWith("/api/admin/modules/catalog")) return json({ generated_at: new Date().toISOString(), discovery: { mode: "demo", root: "automodle", patterns: ["module.yaml"], catalog_file_required: false }, summary: { total: 3, active: 3, disabled: 0, placeholder: 0, invalid: 0, by_zone: { agents: 1, automations: 1, capabilities: 1, systems: 0 } }, modules: moduleCatalog });
  if (path.endsWith("/api/admin/integrations/catalog")) return json({ integrations: [{ id: "demo_directory", name: "Demo Directory", status: "healthy", type: "identity" }, { id: "demo_assets", name: "Demo Asset Service", status: "healthy", type: "inventory" }] });

  if (path.endsWith("/api/automation/onboarding/runs")) return json({ status: "success", data: onboardingRuns });
  if (path.endsWith("/api/automation/onboarding/tools")) return json({ status: "success", data: ["validate", "identity", "workspace", "assets", "notify"] });
  if (/\/api\/automation\/onboarding\/runs\/[^/]+$/.test(path)) {
    const run = onboardingRuns.find(item => path.endsWith(item.workflow_run_id)) || onboardingRuns[0];
    return json({ status: "success", data: { run, case: run, steps: [{ step_id: "validate_request", tool_name: "demo.validate", status: "completed", attempt: 1, max_attempts: 3, output: { valid: true } }, { step_id: "prepare_resources", tool_name: "demo.provision", status: run.status === "completed" ? "completed" : "waiting", attempt: 1, max_attempts: 3 }] } });
  }

  if (path.endsWith("/api/chat/stream") && method === "POST") {
    const answer = "這是 NovaKit 公開展示模式的本機模擬回覆；沒有連線公司後端或外部 AI。";
    const lines = [
      { type: "meta", chat_mode: "nova", selected_skill: "demo.respond", provider: "mock", model: "frontend-only", trace_id: `demo-${Date.now()}` },
      { type: "delta", text: answer },
      { type: "done", response: { status: "success", data: { answer, chat_mode: "nova", sources: [], mailbox_results: [] } } },
    ].map(item => JSON.stringify(item)).join("\n") + "\n";
    return new Response(lines, { status: 200, headers: { "Content-Type": "application/x-ndjson", "X-NovaKit-Demo": "true" } });
  }
  if (path.endsWith("/api/chat") && method === "POST") {
    const requested = String(body.message || "").toLowerCase();
    const mode = requested === "/oa" ? "oa" : requested === "/erp" ? "erp" : "nova";
    localStorage.setItem("novakit_chat_mode", mode);
    return json({ status: "success", data: { answer: `已切換至 ${mode.toUpperCase()} 展示模式`, chat_mode: mode, selected_skill: "demo.mode" } });
  }

  if (path.endsWith("/api/admin/status")) return json({ cpu_usage: 18.4, memory_percent: 42.1, os: "Demo Linux", timestamp: new Date().toLocaleTimeString("zh-TW"), gpu_available: true, gpu_usage: 11.2, gpu_name: "Demo GPU", gpu_memory_percent: 27.5, gpu_memory_used_mb: 2200, gpu_memory_total_mb: 8000, gpu_temperature_c: 48, gpu_power_draw_w: 56, gpu_power_limit_w: 120 });
  if (path.endsWith("/api/admin/external-chat/status")) return json({ externalChat: { ready: true, enabled: true, apiKeyConfigured: true, endpoint: "/api/external/chat", allowedOrigins: ["https://demo.example.com"], sessionMemory: { available: true, sessions: 3, messages: 18, ttlDays: 7 } }, rag: { available: true, stats: { backend: "demo-vector", chunks_count: 42 }, documents: [{ name: "demo-handbook.md", sizeBytes: 4096, modifiedAt: "2026-08-20", published: true }] } });
  if (path.includes("/api/admin/external-chat/usage")) return json({ items: [{ timestamp: "2026-08-21 10:30", clientId: "portfolio-demo", status: "success", httpStatus: 200, durationMs: 84, hitCount: 2, sources: ["demo-handbook.md"] }] });
  if (path.endsWith("/api/admin/external-chat/test")) return json({ result: { answer: "這是由前端假資料產生的示範回答。", sources: ["demo-handbook.md"], hitCount: 1 } });

  if (path.includes("/api/erp/ap-draft/jobs")) return json({ items: [], jobs: [], data: [] });
  if (path.includes("/api/admin/executions")) return json({ items: [], total: 0 });
  if (path.endsWith("/api/admin/connections")) return json({ connections: [{ id: "demo_directory", name: "Demo Directory", status: "healthy", owner: "Demo Platform", modules: ["employee_onboarding"], requirements: [] }] });
  if (path.endsWith("/api/admin/triggers")) return json({ triggers: [{ id: "weekly_ops", name: "Weekly Operations", enabled: true, type: "schedule", status: "healthy" }] });
  if (path.includes("/api/admin/incidents")) return json({ incidents: [], notification: { enabled: true, channel: "demo" } });
  if (path.includes("/api/admin/audit")) return json({ items: [], records: [], valid: true });
  if (path.includes("/api/admin/disaster-recovery")) return json({ backups: [], config: { secret_files_included: false }, offhost: {}, key_custody: [] });
  if (path.includes("/api/admin/slo")) return json({ services: [], summary: { healthy: 3, warning: 0, critical: 0 } });
  if (path.includes("/api/admin/change-approvals")) return json({ items: [], approvals: [] });
  if (path.includes("/api/knowledge-import/config")) return json({ status: "success", can_manage: true, documents: [], categories: [] });
  if (path.includes("/api/knowledge-import/categories")) return json({ status: "success", categories: ["Demo Handbook", "Operations"] });

  return json({ status: "success", ok: true, demo: true, data: [], items: [], message: "Demo action completed locally in the browser." });
}

const nativeFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const raw = input instanceof Request ? input.url : String(input);
  const url = new URL(raw, window.location.href);
  if (url.origin === window.location.origin && url.pathname.includes("/api/")) {
    await new Promise(resolve => window.setTimeout(resolve, 120));
    return route(url.pathname, String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase(), parseBody(init));
  }
  return nativeFetch(input, init);
};

(window as any).__NOVAKIT_PUBLIC_DEMO__ = true;
