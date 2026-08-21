import { apiGet, apiPost } from "./client";
import type { AgentRunRecord } from "./agents";

export interface RunSummary {
  run_id: string;
  agent_id: string;
  status: string;
  started_at: string;
  finished_at?: string | null;
  error?: string | null;
  artifacts?: Record<string, unknown>;
}

export function listRuns(params: { agent_id?: string; status?: string; limit?: number } = {}) {
  const search = new URLSearchParams();
  if (params.agent_id) search.set("agent_id", params.agent_id);
  if (params.status) search.set("status", params.status);
  if (params.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  return apiGet<RunSummary[]>(`/api/agent-runs${query ? `?${query}` : ""}`);
}

export function getRun(runId: string) {
  return apiGet<AgentRunRecord>(`/api/agent-runs/${encodeURIComponent(runId)}`);
}

export function approveRun(runId: string) {
  return apiPost<{ ok: boolean; message: string; run: AgentRunRecord }>(
    `/api/agent-runs/${encodeURIComponent(runId)}/approve`,
  );
}

export function rejectRun(runId: string) {
  return apiPost<{ ok: boolean; message: string; run: AgentRunRecord }>(
    `/api/agent-runs/${encodeURIComponent(runId)}/reject`,
  );
}
