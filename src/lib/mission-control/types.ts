export interface MCAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  status: "active" | "pending" | "stopped";
  tasks_completed: number;
  last_active: string;
  cpu_usage: number;
  memory_usage: number;
  agent_session_id?: string;
}

export interface MCBoardGroup {
  id: string;
  name: string;
  board_count: number;
  created_at: string;
}

export interface MCBoard {
  id: string;
  name: string;
  description: string;
  board_group_id: string | null;
  task_count: number;
  created_at: string;
}

export interface MCTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface MCTask {
  id: string;
  board_id: string;
  title: string;
  description: string;
  status: "inbox" | "todo" | "in_progress" | "review" | "done";
  agent_name: string;
  priority: "low" | "medium" | "high";
  assignee: string | null;
  due_date: string | null;
  agent_session_id: string | null;
  dispatched_at: string | null;
  dispatch_output: string | null;
  tags: MCTag[];
  created_at: string;
}

export interface MCActivityEntry {
  id: string;
  type: string;
  message: string;
  agent_name: string;
  created_at: string;
}

export interface MCCustomField {
  id: string;
  name: string;
  field_type: "text" | "number" | "date" | "select";
  options: string[] | null;
  created_at: string;
}

// ─── Live agent types (from sync daemon RPC bridge) ──────────────────────

export interface AgentSession {
  sessionId: string;
  agentName?: string;
  status: string;
  startedAt?: string;
  model?: string;
  messages?: number;
}

export interface AgentStatus {
  version?: string;
  uptime?: number;
  agents?: number;
  sessions?: number;
  connected?: boolean;
  [key: string]: unknown;
}

export interface AgentChatResponse {
  ok?: boolean;
  sessionId?: string;
  [key: string]: unknown;
}

export interface AgentTranscriptMessage {
  role: string;
  content: string;
  timestamp?: string;
  tool?: string;
}

export interface AgentSessionPreview {
  sessionId: string;
  messages: AgentTranscriptMessage[];
  [key: string]: unknown;
}
