import { apiUpload } from "./client";

export interface UploadMetadata {
  artifact_id: string;
  upload_id: string;
  agent_id?: string | null;
  input_name?: string | null;
  filename: string;
  path: string;
  relative_path?: string | null;
  content_type?: string | null;
  size: number;
}

export function uploadAgentFile(
  file: File,
  agentId: string,
  inputName: string,
): Promise<UploadMetadata> {
  const form = new FormData();
  form.append("file", file);
  form.append("agent_id", agentId);
  form.append("input_name", inputName);
  return apiUpload<UploadMetadata>("/api/agent-files/upload", form);
}
