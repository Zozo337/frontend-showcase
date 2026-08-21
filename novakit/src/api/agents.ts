import { apiGet, apiPost } from "./client";

export type AgentInputType = "text" | "textarea" | "file" | "select" | "boolean" | "number";

export interface AgentInput {
  name: string;
  label: string;
  type: AgentInputType;
  required?: boolean;
  accept?: string[] | null;
  options?: string[] | null;
  default?: unknown;
}

export interface AgentOutput {
  name: string;
  label?: string | null;
  type: string;
  format?: string | null;
}

export interface AgentSummary {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  tags?: string[];
  risk_level: string;
  requires_approval: boolean;
  inputs: AgentInput[];
  outputs: AgentOutput[];
}

export interface AgentDetail {
  manifest: AgentSummary & { workflow: string; permissions?: Record<string, unknown> };
  workflow: {
    version: string;
    steps: Array<Record<string, unknown>>;
    outputs: Record<string, unknown>;
  };
}

export interface AgentRunRecord {
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
}

export function listAgents(): Promise<AgentSummary[]> {
  return apiGet<AgentSummary[]>("/api/agents");
}

export function getAgent(agentId: string): Promise<AgentDetail> {
  return apiGet<AgentDetail>(`/api/agents/${encodeURIComponent(agentId)}`);
}

export function runAgent(agentId: string, inputs: Record<string, unknown>): Promise<AgentRunRecord> {
  return apiPost<AgentRunRecord>(`/api/agents/${encodeURIComponent(agentId)}/run`, { inputs });
}
